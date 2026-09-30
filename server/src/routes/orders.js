import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { HttpError } from '../middleware/errors.js'
import { validate } from '../middleware/validate.js'

export const orderRouter = Router()
orderRouter.use(authenticate)

orderRouter.get('/', async (request, response) => {
  const orders = await prisma.order.findMany({
    where: { userId: request.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, orderNumber: true, status: true, paymentMethod: true,
      subtotalCents: true, shippingCents: true, totalCents: true, createdAt: true,
      _count: { select: { items: true } },
    },
  })
  response.json({ orders: orders.map(({ _count, ...order }) => ({ ...order, lineCount: _count.items })) })
})

orderRouter.get('/:orderNumber', async (request, response) => {
  const order = await prisma.order.findFirst({
    where: { orderNumber: request.params.orderNumber, userId: request.user.id },
    include: { items: { orderBy: { id: 'asc' } } },
  })
  if (!order) throw new HttpError(404, 'Order not found', 'ORDER_NOT_FOUND')
  response.json({ order })
})

const checkoutSchema = z.object({
  shippingAddress: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    line1: z.string().trim().min(3).max(160),
    line2: z.string().trim().max(160).optional().or(z.literal('')),
    city: z.string().trim().min(1).max(100),
    region: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(3).max(20),
    country: z.string().trim().length(2).default('IN'),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
  }),
})

const FREE_SHIPPING_THRESHOLD = 500_000
const STANDARD_SHIPPING = 30_000

orderRouter.post('/', validate(checkoutSchema), async (request, response) => {
  const { shippingAddress } = request.body
  const order = await prisma.$transaction(async (transaction) => {
    const cart = await transaction.cart.findUnique({
      where: { userId: request.user.id },
      include: {
        items: {
          include: {
            variant: {
              include: { product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } },
            },
          },
        },
      },
    })
    if (!cart?.items.length) throw new HttpError(400, 'Your bag is empty', 'EMPTY_CART')

    for (const item of cart.items) {
      if (!item.variant.active || !item.variant.product.published || item.variant.stock < item.quantity) {
        throw new HttpError(409, `${item.variant.product.name} is no longer available in that quantity`, 'INSUFFICIENT_STOCK')
      }
    }

    const subtotalCents = cart.items.reduce((sum, item) => sum + item.variant.priceCents * item.quantity, 0)
    const shippingCents = subtotalCents >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING
    const taxCents = 0
    const totalCents = subtotalCents + shippingCents + taxCents
    if (totalCents > 2_147_483_647) {
      throw new HttpError(400, 'This order exceeds the supported checkout total', 'ORDER_TOTAL_TOO_LARGE')
    }

    for (const item of cart.items) {
      const changed = await transaction.productVariant.updateMany({
        where: { id: item.variantId, active: true, stock: { gte: item.quantity }, product: { published: true } },
        data: { stock: { decrement: item.quantity } },
      })
      if (changed.count !== 1) {
        throw new HttpError(409, `${item.variant.product.name} just sold out. Please review your bag.`, 'INSUFFICIENT_STOCK')
      }
    }

    const orderNumber = `FC-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`
    const createdOrder = await transaction.order.create({
      data: {
        orderNumber,
        userId: request.user.id,
        email: request.user.email,
        subtotalCents,
        shippingCents,
        taxCents,
        totalCents,
        paymentMethod: 'CASH_ON_DELIVERY',
        shippingName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        shippingLine1: shippingAddress.line1,
        shippingLine2: shippingAddress.line2 || null,
        shippingCity: shippingAddress.city,
        shippingRegion: shippingAddress.region,
        shippingPostal: shippingAddress.postalCode,
        shippingCountry: shippingAddress.country.toUpperCase(),
        shippingPhone: shippingAddress.phone || null,
        items: {
          create: cart.items.map((item) => ({
            variantId: item.variantId,
            productName: item.variant.product.name,
            productSlug: item.variant.product.slug,
            imageUrl: item.variant.product.images[0]?.url,
            sku: item.variant.sku,
            size: item.variant.size,
            color: item.variant.color,
            unitPriceCents: item.variant.priceCents,
            quantity: item.quantity,
          })),
        },
      },
      select: { id: true, orderNumber: true, status: true, totalCents: true, createdAt: true, paymentMethod: true },
    })
    await transaction.cartItem.deleteMany({ where: { cartId: cart.id } })
    return createdOrder
  }, { isolationLevel: 'Serializable' })

  response.status(201).json({ order })
})
