import { Router } from 'express'
import { z } from 'zod'
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
  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, select: publicProductSelect, orderBy: { createdAt: 'desc' } }),
  ])
  let products = rows.map(presentProduct)
  if (sort === 'price-asc') products.sort((a, b) => (a.priceCents ?? Infinity) - (b.priceCents ?? Infinity))
  if (sort === 'price-desc') products.sort((a, b) => (b.priceCents ?? -Infinity) - (a.priceCents ?? -Infinity))
  if (sort === 'name') products.sort((a, b) => a.name.localeCompare(b.name))
  const start = (page - 1) * limit
  response.json({ products: products.slice(start, start + limit), pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
})

catalogRouter.get('/products/:slug', async (request, response) => {
  const product = await prisma.product.findFirst({
    where: { slug: request.params.slug, published: true },
    select: publicProductSelect,
  })
  if (!product) throw new HttpError(404, 'Product not found', 'PRODUCT_NOT_FOUND')
  response.json({ product: presentProduct(product) })
})
