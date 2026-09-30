import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const testDatabaseUrl = process.env.TEST_DATABASE_URL

function createAgent(baseUrl) {
  let cookie = ''
  async function send(method, path, body) {
    const headers = {}
    if (cookie) headers.cookie = cookie
    if (body !== undefined) headers['content-type'] = 'application/json'
    const response = await fetch(`${baseUrl}${path}`, {
      method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    const cookieHeaders = response.headers.getSetCookie?.() ?? []
    if (cookieHeaders.length) {
      cookie = /max-age=0/i.test(cookieHeaders[0]) ? '' : cookieHeaders[0].split(';')[0]
    }
    const responseBody = response.status === 204 ? null : await response.json()
    return { status: response.status, body: responseBody }
  }
  return {
    get: (path) => send('GET', path),
    post: (path, body) => send('POST', path, body),
    patch: (path, body) => send('PATCH', path, body),
  }
}

function expect(response, status) {
  assert.equal(response.status, status, `Expected HTTP ${status}, got ${response.status}: ${JSON.stringify(response.body)}`)
  return response
}

test('customer and admin commerce workflow', { skip: !testDatabaseUrl && 'Set TEST_DATABASE_URL to a dedicated PostgreSQL test database' }, async (t) => {
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = testDatabaseUrl
  process.env.CLIENT_URL = 'http://localhost:5173'
  process.env.COOKIE_SECURE = 'false'

  const [{ app }, { prisma }, bcryptModule] = await Promise.all([
    import('../src/app.js'),
    import('../src/lib/prisma.js'),
    import('bcryptjs'),
  ])
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
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  t.after(async () => {
    if (orderId) await prisma.order.deleteMany({ where: { id: orderId } })
    if (customerId) await prisma.user.deleteMany({ where: { id: customerId } })
    if (adminId) await prisma.user.deleteMany({ where: { id: adminId } })
    await prisma.product.deleteMany({ where: { slug } })
    if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } })
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
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

  const anonymous = createAgent(baseUrl)
  expect(await anonymous.get('/api/cart'), 401)
  const customer = createAgent(baseUrl)
  const registered = expect(await customer.post('/api/auth/register', {
    email, firstName: 'Test', lastName: 'Customer', password: 'fitcheck-test-password',
  }), 201)
  customerId = registered.body.user.id
  assert.equal('passwordHash' in registered.body.user, false)
  expect(await customer.get('/api/auth/me'), 200)
  expect(await customer.get('/api/admin/products'), 403)

  const catalog = expect(await anonymous.get(`/api/products?q=Linen&category=${category.slug}`), 200)
  assert.equal(catalog.body.products[0].slug, slug)
  const pricePage = expect(await anonymous.get(`/api/products?category=${category.slug}&sort=price-asc&limit=1`), 200)
  assert.equal(pricePage.body.pagination.total, 1)

  const initialCart = expect(await customer.get('/api/cart'), 200)
  assert.equal(initialCart.body.cart.itemCount, 0)
  const added = expect(await customer.post('/api/cart/items', { variantId: product.variants[0].id, quantity: 2 }), 200)
  assert.equal(added.body.cart.subtotalCents, 99800)
  expect(await customer.post('/api/cart/items', { variantId: product.variants[1].id, quantity: 1 }), 409)
  const changed = expect(await customer.patch(`/api/cart/items/${added.body.cart.items[0].id}`, { quantity: 3 }), 200)
  assert.equal(changed.body.cart.subtotalCents, 149700)

  const placed = expect(await customer.post('/api/orders', { shippingAddress: {
    firstName: 'Test', lastName: 'Customer', line1: '10 Test Street', city: 'Mumbai',
    region: 'Maharashtra', postalCode: '400001', country: 'IN',
  } }), 201)
  orderId = placed.body.order.id
  assert.equal(placed.body.order.totalCents, 179700)
  const emptyCart = expect(await customer.get('/api/cart'), 200)
  assert.equal(emptyCart.body.cart.itemCount, 0)
  assert.equal((await prisma.productVariant.findUnique({ where: { id: product.variants[0].id } })).stock, 1)
  expect(await customer.get(`/api/orders/${placed.body.order.orderNumber}`), 200)

  const passwordHash = await bcrypt.hash('fitcheck-admin-password', 12)
  const admin = await prisma.user.create({
    data: { email: adminEmail, firstName: 'FitCheck', lastName: 'Admin', passwordHash, role: 'ADMIN' },
  })
  adminId = admin.id
  const staff = createAgent(baseUrl)
  expect(await staff.post('/api/auth/login', { email: adminEmail, password: 'fitcheck-admin-password' }), 200)
  expect(await staff.get(`/api/orders/${placed.body.order.orderNumber}`), 404)
  const products = expect(await staff.get('/api/admin/products'), 200)
  assert.ok(products.body.products.some((item) => item.slug === slug))
  expect(await staff.post(`/api/admin/products/${product.id}/variants`, {
    sku: `ADMIN-${suffix}`, size: 'XL', color: 'Natural', priceCents: 49900, stock: 3,
  }), 201)
  expect(await staff.patch(`/api/admin/orders/${orderId}/status`, { status: 'CANCELLED' }), 200)
  assert.equal((await prisma.productVariant.findUnique({ where: { id: product.variants[0].id } })).stock, 4)
  expect(await customer.post('/api/auth/logout'), 204)
  expect(await customer.get('/api/auth/me'), 401)
})
