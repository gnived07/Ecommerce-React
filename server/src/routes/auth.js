import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, hashSessionToken, sessionCookieName } from '../middleware/auth.js'
import { HttpError } from '../middleware/errors.js'
import { validate } from '../middleware/validate.js'

export const authRouter = Router()

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
})

const registrationSchema = credentialsSchema.extend({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
})

const safeUser = ({ id, email, firstName, lastName, role, createdAt }) => ({
  id, email, firstName, lastName, role, createdAt,
})

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    path: '/',
    maxAge: Number(process.env.SESSION_TTL_DAYS ?? 7) * 24 * 60 * 60 * 1000,
  }
}

async function startSession(user, response) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + cookieOptions().maxAge)
  await prisma.session.create({
    data: { userId: user.id, tokenHash: hashSessionToken(token), expiresAt },
  })
  response.cookie(sessionCookieName, token, cookieOptions())
}

authRouter.post('/register', validate(registrationSchema), async (request, response) => {
  const { email, password, firstName, lastName } = request.body
  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const user = await prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: { email, passwordHash, firstName, lastName },
      })
      await transaction.cart.create({ data: { userId: created.id } })
      return created
    })
    await startSession(user, response)
    return response.status(201).json({ user: safeUser(user) })
  } catch (error) {
    if (error?.code === 'P2002') throw new HttpError(409, 'An account with this email already exists', 'EMAIL_IN_USE')
    throw error
  }
})

authRouter.post('/login', validate(credentialsSchema), async (request, response) => {
  const user = await prisma.user.findUnique({ where: { email: request.body.email } })
  const valid = user && await bcrypt.compare(request.body.password, user.passwordHash)
  if (!valid) throw new HttpError(401, 'Email or password is incorrect', 'INVALID_CREDENTIALS')

  await startSession(user, response)
  return response.json({ user: safeUser(user) })
})

authRouter.post('/logout', async (request, response) => {
  const token = request.cookies?.[sessionCookieName]
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } })
  }
  response.clearCookie(sessionCookieName, { ...cookieOptions(), maxAge: undefined })
  return response.status(204).end()
})

authRouter.get('/me', authenticate, (request, response) => {
  response.json({ user: safeUser(request.user) })
})
