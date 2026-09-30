import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const testDatabaseUrl = process.env.TEST_DATABASE_URL

test('customer and admin commerce workflow', { skip: !testDatabaseUrl && 'Set TEST_DATABASE_URL to a dedicated PostgreSQL test database' }, async (t) => {
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = testDatabaseUrl
  process.env.CLIENT_URL = 'http://localhost:5173'

  const [{ app }, { prisma }, supertestModule, bcryptModule] = await Promise.all([
    import('../src/app.js'),
    import('../src/lib/prisma.js'),
    import('supertest'),
    import('bcryptjs'),
  ])
  const request = supertestModule.default
  const bcrypt = bcryptModule.default
  const suffix = randomUUID().replaceAll('-', '').slice(0, 14)
  const email = `customer-${suffix}@fitcheck.test`
  const adminEmail = `admin-${suffix}@fitcheck.test`
  const slug = `test-piece-${suffix}`
  let categoryId
  let customerId
  let adminId
  let orderId

  await prisma.$connect()
  t.after(async () => {
    if (orderId) await prisma.order.deleteMany({ where: { id: orderId } })
    if (customerId) await prisma.user.deleteMany({ where: { id: customerId } })
    if (adminId) await prisma.user.deleteMany({ where: { id: adminId } })
    await prisma.product.deleteMany({ where: { slug } })
    if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } })
    await prisma.$disconnect()
  })

  const category = await prisma.category.create({ data: { name: `Test ${suffix}`, slug: `test-${suffix}` } })
  categoryId = category.id
  const product = await prisma.product.create({
    data: {
      name: 'Test Linen Shirt', slug, description: 'A test garment for the FitCheck workflow.',
      categoryId, published: true,
      images: { create: [{ url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b', alt: 'Test shirt' }] },
      variants: { create: [
        { sku: `TEST-${suffix}-M`, size: 'M', color: 'Natural', priceCents: 49900, stock: 4 },
        { sku: `TEST-${suffix}-S`, size: 'S', color: 'Natural', priceCents: 49900, stock: 0 },
      ] },
    },
    include: { variants: true },
  })

  const customer = await request.agent(app)
  const registered = await customer.post('/api/auth/register').send({
    email, firstName: 'Test', lastName: 'Customer', password: 'fitcheck-test-password',
  }).expect(201)
  customerId = registered.body.user.id
  assert.equal('passwordHash' in registered.body.user, false)
  await customer.get('/api/auth/me').expect(200)
  await customer.get('/api/admin/products').expect(403)

  const catalog = await request(app).get(`/api/products?q=Linen&category=${category.slug}`).expect(200)
  assert.equal(catalog.body.products[0].slug, slug)

  const initialCart = await customer.get('/api/cart').expect(200)
  assert.equal(initialCart.body.cart.itemCount, 0)
  const added = await customer.post('/api/cart/items').send({ variantId: product.variants[0].id, quantity: 2 }).expect(200)
  assert.equal(added.body.cart.subtotalCents, 99800)
  await customer.post('/api/cart/items').send({ variantId: product.variants[1].id, quantity: 1 }).expect(409)
  const changed = await customer.patch(`/api/cart/items/${added.body.cart.items[0].id}`).send({ quantity: 3 }).expect(200)
  assert.equal(changed.body.cart.subtotalCents, 149700)

  const placed = await customer.post('/api/orders').send({ shippingAddress: {
    firstName: 'Test', lastName: 'Customer', line1: '10 Test Street', city: 'Mumbai',
    region: 'Maharashtra', postalCode: '400001', country: 'IN',
  } }).expect(201)
  orderId = placed.body.order.id
  assert.equal(placed.body.order.totalCents, 179700)
  const emptyCart = await customer.get('/api/cart').expect(200)
  assert.equal(emptyCart.body.cart.itemCount, 0)
  assert.equal((await prisma.productVariant.findUnique({ where: { id: product.variants[0].id } })).stock, 1)
  await customer.get(`/api/orders/${placed.body.order.orderNumber}`).expect(200)

  const passwordHash = await bcrypt.hash('fitcheck-admin-password', 12)
  const admin = await prisma.user.create({
    data: { email: adminEmail, firstName: 'FitCheck', lastName: 'Admin', passwordHash, role: 'ADMIN' },
  })
  adminId = admin.id
  const staff = await request.agent(app)
  await staff.post('/api/auth/login').send({ email: adminEmail, password: 'fitcheck-admin-password' }).expect(200)
  const products = await staff.get('/api/admin/products').expect(200)
  assert.ok(products.body.products.some((item) => item.slug === slug))
  await staff.patch(`/api/admin/orders/${orderId}/status`).send({ status: 'CANCELLED' }).expect(200)
  assert.equal((await prisma.productVariant.findUnique({ where: { id: product.variants[0].id } })).stock, 4)
})
