import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { HttpError } from '../middleware/errors.js'
import { validate } from '../middleware/validate.js'

export const catalogRouter = Router()

const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  size: z.string().trim().max(20).optional(),
  minPriceCents: z.coerce.number().int().min(0).optional(),
  maxPriceCents: z.coerce.number().int().min(0).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'name']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
}).refine((query) => query.minPriceCents === undefined || query.maxPriceCents === undefined || query.minPriceCents <= query.maxPriceCents, {
  message: 'Minimum price must be less than or equal to maximum price', path: ['minPriceCents'],
})

const publicProductSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  details: true,
  material: true,
  care: true,
  featured: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' }, select: { id: true, url: true, alt: true, sortOrder: true } },
  variants: {
    where: { active: true },
    orderBy: [{ size: 'asc' }, { color: 'asc' }],
    select: { id: true, size: true, color: true, priceCents: true, stock: true },
  },
}

function presentProduct(product) {
  const prices = product.variants.map(({ priceCents }) => priceCents)
  const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0)
  return {
    ...product,
    priceCents: prices.length ? Math.min(...prices) : null,
    inStock: stock > 0,
    stock,
  }
}

catalogRouter.get('/categories', async (_request, response) => {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true, name: true, slug: true, description: true, imageUrl: true,
      _count: { select: { products: { where: { published: true } } } },
    },
  })
  response.json({ categories: categories.map(({ _count, ...category }) => ({ ...category, productCount: _count.products })) })
})

catalogRouter.get('/products', validate(listSchema, 'query'), async (request, response) => {
  const { q, category, size, minPriceCents, maxPriceCents, inStock, featured, sort, page, limit } = request.validatedQuery
  const variantFilter = {
    active: true,
    ...(size ? { size: { equals: size, mode: 'insensitive' } } : {}),
    ...(inStock === 'true' ? { stock: { gt: 0 } } : inStock === 'false' ? { stock: 0 } : {}),
    ...(minPriceCents !== undefined || maxPriceCents !== undefined ? {
      priceCents: { ...(minPriceCents !== undefined ? { gte: minPriceCents } : {}), ...(maxPriceCents !== undefined ? { lte: maxPriceCents } : {}) },
    } : {}),
  }
  const where = {
    published: true,
    ...(featured === 'true' ? { featured: true } : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(q ? { OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { category: { name: { contains: q, mode: 'insensitive' } } },
    ] } : {}),
    ...(size || inStock || minPriceCents !== undefined || maxPriceCents !== undefined
      ? { variants: { some: variantFilter } } : {}),
  }
  const start = (page - 1) * limit
  const total = await prisma.product.count({ where })
  let rows

  if (sort === 'price-asc' || sort === 'price-desc') {
    const variantConditions = [Prisma.sql`v."active" = TRUE`]
    if (size) variantConditions.push(Prisma.sql`LOWER(v."size") = LOWER(${size})`)
    if (inStock === 'true') variantConditions.push(Prisma.sql`v."stock" > 0`)
    if (inStock === 'false') variantConditions.push(Prisma.sql`v."stock" = 0`)
    if (minPriceCents !== undefined) variantConditions.push(Prisma.sql`v."priceCents" >= ${minPriceCents}`)
    if (maxPriceCents !== undefined) variantConditions.push(Prisma.sql`v."priceCents" <= ${maxPriceCents}`)
    const productConditions = [Prisma.sql`p."published" = TRUE`]
    if (featured === 'true') productConditions.push(Prisma.sql`p."featured" = TRUE`)
    if (category) productConditions.push(Prisma.sql`c."slug" = ${category}`)
    if (q) {
      const term = `%${q}%`
      productConditions.push(Prisma.sql`(p."name" ILIKE ${term} OR p."description" ILIKE ${term} OR c."name" ILIKE ${term})`)
    }
    if (variantConditions.length > 1) productConditions.push(Prisma.sql`v."id" IS NOT NULL`)
    const direction = sort === 'price-asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`
    const ordered = await prisma.$queryRaw(Prisma.sql`
      SELECT p."id"
      FROM "Product" AS p
      JOIN "Category" AS c ON c."id" = p."categoryId"
      LEFT JOIN "ProductVariant" AS v ON v."productId" = p."id" AND ${Prisma.join(variantConditions, ' AND ')}
      WHERE ${Prisma.join(productConditions, ' AND ')}
      GROUP BY p."id"
      ORDER BY MIN(v."priceCents") ${direction} NULLS LAST, p."createdAt" DESC
      LIMIT ${limit} OFFSET ${start}
    `)
    const ids = ordered.map(({ id }) => id)
    const fetched = ids.length ? await prisma.product.findMany({ where: { id: { in: ids } }, select: publicProductSelect }) : []
    const byId = new Map(fetched.map((product) => [product.id, product]))
    rows = ids.map((id) => byId.get(id)).filter(Boolean)
  } else {
    rows = await prisma.product.findMany({
      where,
      select: publicProductSelect,
      orderBy: sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' },
      skip: start,
      take: limit,
    })
  }
  response.json({ products: rows.map(presentProduct), pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
})

catalogRouter.get('/products/:slug', async (request, response) => {
  const product = await prisma.product.findFirst({
    where: { slug: request.params.slug, published: true },
    select: publicProductSelect,
  })
  if (!product) throw new HttpError(404, 'Product not found', 'PRODUCT_NOT_FOUND')
  response.json({ product: presentProduct(product) })
})
