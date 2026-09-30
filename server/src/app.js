import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { prisma } from './lib/prisma.js'
import { errorHandler, HttpError, notFoundHandler } from './middleware/errors.js'
import { authRouter } from './routes/auth.js'
import { catalogRouter } from './routes/catalog.js'
import { cartRouter } from './routes/cart.js'
import { orderRouter } from './routes/orders.js'
import { adminRouter } from './routes/admin.js'
import { noStore, verifyRequestOrigin } from './middleware/security.js'

export const app = express()

app.disable('x-powered-by')
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)
app.use(helmet())
const allowedOrigins = new Set(
  [process.env.CLIENT_URL, ...(process.env.NODE_ENV === 'development' ? ['http://localhost:5173'] : [])]
    .filter(Boolean),
)
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true)
    return callback(new HttpError(403, 'This request origin is not allowed', 'ORIGIN_NOT_ALLOWED'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '32kb' }))
app.use(cookieParser())
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }))
app.use(verifyRequestOrigin)
app.use(['/api/auth', '/api/cart', '/api/orders', '/api/admin'], noStore)

app.use('/api/auth', authRouter)
app.use('/api', catalogRouter)
app.use('/api/cart', cartRouter)
app.use('/api/orders', orderRouter)
app.use('/api/admin', adminRouter)

app.get('/api/health', async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return response.json({ status: 'ok', service: 'fitcheck-api', database: 'ok' })
  } catch {
    return response.status(503).json({ status: 'degraded', service: 'fitcheck-api', database: 'unavailable' })
  }
})

app.use('/api', notFoundHandler)
app.use(errorHandler)
