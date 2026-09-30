import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { HttpError } from '../middleware/errors.js'
import { validate } from '../middleware/validate.js'

export const adminRouter = Router()
adminRouter.use(authenticate, requireRole('ADMIN'))

const imageSchema = z.object({
  url: z.string().url().max(1000).refine((value) => new URL(value).protocol === 'https:', 'Use a secure HTTPS image URL'),
  alt: z.string().trim().min(1).max(180),
})
const variantSchema = z.object({
  sku: z.string().trim().min(2).max(80),
  size: z.string().trim().min(1).max(30),
  color: z.string().trim().min(1).max(50),
  priceCents: z.number().int().min(1).max(100_000_000),
  stock: z.number().int().min(0).max(100_000),
})
const createProductSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(10).max(5000),
  details: z.string().trim().max(5000).optional().or(z.literal('')),
  material: z.string().trim().max(300).optional().or(z.literal('')),
  care: z.string().trim().max(500).optional().or(z.literal('')),
  categoryId: z.string().min(1).max(40),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  images: z.array(imageSchema).max(8).default([]),
  variants: z.array(variantSchema).min(1).max(100),
})
const updateProductSchema = createProductSchema.omit({ images: true, variants: true }).partial().extend({
  images: z.array(imageSchema).max(8).optional(),
})
const updateVariantSchema = z.object({
  priceCents: z.number().int().min(1).max(100_000_000).optional(),
  stock: z.number().int().min(0).max(100_000).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' })
const statusSchema = z.object({ status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']) })

const adminProductInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' } },
  variants: { orderBy: [{ size: 'asc' }, { color: 'asc' }] },
}

adminRouter.get('/products', async (_request, response) => {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ orderBy: { updatedAt: 'desc' }, include: adminProductInclude }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, slug: true } }),
  ])
  response.json({ products, categories })
})

adminRouter.post('/products', validate(createProductSchema), async (request, response) => {
  const { images, variants, ...data } = request.body
  const product = await prisma.product.create({
    data: {
      ...data,
      details: data.details || null,
      material: data.material || null,
      care: data.care || null,
      images: { create: images.map((image, sortOrder) => ({ ...image, sortOrder })) },
      variants: { create: variants },
    },
    include: adminProductInclude,
  })
  response.status(201).json({ product })
})

adminRouter.post('/products/:id/variants', validate(variantSchema), async (request, response) => {
  const product = await prisma.product.findUnique({ where: { id: request.params.id }, select: { id: true } })
  if (!product) throw new HttpError(404, 'Product not found', 'PRODUCT_NOT_FOUND')
  try {
    const variant = await prisma.productVariant.create({
      data: { ...request.body, productId: product.id },
      include: { product: { select: { id: true, name: true, slug: true } } },
    })
    response.status(201).json({ variant })
  } catch (error) {
    if (error?.code === 'P2002') throw new HttpError(409, 'That SKU or size/colour option already exists', 'VARIANT_CONFLICT')
    throw error
  }
})

adminRouter.patch('/products/:id', validate(updateProductSchema), async (request, response) => {
  const { images, ...data } = request.body
  try {
    const product = await prisma.product.update({
      where: { id: request.params.id },
      data: {
        ...data,
        ...(data.details !== undefined ? { details: data.details || null } : {}),
        ...(data.material !== undefined ? { material: data.material || null } : {}),
        ...(data.care !== undefined ? { care: data.care || null } : {}),
        ...(images ? { images: { deleteMany: {}, create: images.map((image, sortOrder) => ({ ...image, sortOrder })) } } : {}),
      },
      include: adminProductInclude,
    })
    response.json({ product })
  } catch (error) {
    if (error?.code === 'P2025') throw new HttpError(404, 'Product not found', 'PRODUCT_NOT_FOUND')
    throw error
  }
})

adminRouter.patch('/variants/:id', validate(updateVariantSchema), async (request, response) => {
  try {
    const variant = await prisma.productVariant.update({
      where: { id: request.params.id },
      data: request.body,
      include: { product: { select: { id: true, name: true, slug: true } } },
    })
    response.json({ variant })
  } catch (error) {
    if (error?.code === 'P2025') throw new HttpError(404, 'Variant not found', 'VARIANT_NOT_FOUND')
    throw error
  }
})

adminRouter.get('/orders', async (_request, response) => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: { select: { id: true, productName: true, size: true, color: true, quantity: true } } },
  })
  response.json({ orders })
})

const transitions = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

adminRouter.patch('/orders/:id/status', validate(statusSchema), async (request, response) => {
  const { status } = request.body
  const order = await prisma.$transaction(async (transaction) => {
    const current = await transaction.order.findUnique({ where: { id: request.params.id }, include: { items: true } })
    if (!current) throw new HttpError(404, 'Order not found', 'ORDER_NOT_FOUND')
    if (!transitions[current.status].includes(status)) {
      throw new HttpError(409, `An order cannot move from ${current.status} to ${status}`, 'INVALID_ORDER_TRANSITION')
    }
    const updated = await transaction.order.update({ where: { id: current.id }, data: { status } })
    if (status === 'CANCELLED') {
      for (const item of current.items) {
        await transaction.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } })
      }
    }
    return updated
  }, { isolationLevel: 'Serializable' })
  response.json({ order })
})
