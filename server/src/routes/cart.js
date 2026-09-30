import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { HttpError } from '../middleware/errors.js'
import { validate } from '../middleware/validate.js'

export const cartRouter = Router()
cartRouter.use(authenticate)

const addSchema = z.object({
  variantId: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(99).default(1),
})
const quantitySchema = z.object({ quantity: z.number().int().min(1).max(99) })

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true, name: true, slug: true,
              images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true, alt: true } },
            },
          },
        },
      },
    },
  },
}

function presentCart(cart) {
  const items = cart.items.map((item) => ({
    id: item.id,
    variantId: item.variantId,
    quantity: item.quantity,
    size: item.variant.size,
    color: item.variant.color,
    stock: item.variant.stock,
    unitPriceCents: item.variant.priceCents,
    lineTotalCents: item.variant.priceCents * item.quantity,
    product: { ...item.variant.product, image: item.variant.product.images[0] ?? null },
  }))
  return {
    id: cart.id,
    items,
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
    subtotalCents: items.reduce((total, item) => total + item.lineTotalCents, 0),
    updatedAt: cart.updatedAt,
  }
}

async function getCart(transaction, userId) {
  const cart = await transaction.cart.upsert({ where: { userId }, create: { userId }, update: {}, include: cartInclude })
  return presentCart(cart)
}

cartRouter.get('/', async (request, response) => {
  response.json({ cart: await getCart(prisma, request.user.id) })
})

cartRouter.post('/items', validate(addSchema), async (request, response) => {
  const { variantId, quantity } = request.body
  const cart = await prisma.$transaction(async (transaction) => {
    const cartRecord = await transaction.cart.upsert({
      where: { userId: request.user.id }, create: { userId: request.user.id }, update: {},
    })
    const variant = await transaction.productVariant.findFirst({
      where: { id: variantId, active: true, product: { published: true } },
      include: { product: { select: { name: true } } },
    })
    if (!variant) throw new HttpError(404, 'This option is no longer available', 'VARIANT_NOT_FOUND')

    const current = await transaction.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cartRecord.id, variantId } },
    })
    const nextQuantity = (current?.quantity ?? 0) + quantity
    if (variant.stock < nextQuantity) {
      throw new HttpError(409, `Only ${variant.stock} of this option are available`, 'INSUFFICIENT_STOCK')
    }

    await transaction.cartItem.upsert({
      where: { cartId_variantId: { cartId: cartRecord.id, variantId } },
      create: { cartId: cartRecord.id, variantId, quantity },
      update: { quantity: nextQuantity },
    })
    return getCart(transaction, request.user.id)
  }, { isolationLevel: 'Serializable' })
  response.status(200).json({ cart })
})

cartRouter.patch('/items/:id', validate(quantitySchema), async (request, response) => {
  const cart = await prisma.$transaction(async (transaction) => {
    const item = await transaction.cartItem.findFirst({
      where: { id: request.params.id, cart: { userId: request.user.id } },
      include: { variant: { include: { product: { select: { published: true } } } } },
    })
    if (!item) throw new HttpError(404, 'Cart item not found', 'CART_ITEM_NOT_FOUND')
    if (!item.variant.active || !item.variant.product.published || !item.variant.stock || request.body.quantity > item.variant.stock) {
      throw new HttpError(409, `Only ${item.variant.stock} of this option are available`, 'INSUFFICIENT_STOCK')
    }
    await transaction.cartItem.update({ where: { id: item.id }, data: { quantity: request.body.quantity } })
    return getCart(transaction, request.user.id)
  }, { isolationLevel: 'Serializable' })
  response.json({ cart })
})

cartRouter.delete('/items/:id', async (request, response) => {
  const item = await prisma.cartItem.findFirst({
    where: { id: request.params.id, cart: { userId: request.user.id } },
    select: { id: true },
  })
  if (!item) throw new HttpError(404, 'Cart item not found', 'CART_ITEM_NOT_FOUND')
  await prisma.cartItem.delete({ where: { id: item.id } })
  response.json({ cart: await getCart(prisma, request.user.id) })
})

cartRouter.delete('/', async (request, response) => {
  const cart = await prisma.cart.findUnique({ where: { userId: request.user.id }, select: { id: true } })
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
  response.json({ cart: await getCart(prisma, request.user.id) })
})
