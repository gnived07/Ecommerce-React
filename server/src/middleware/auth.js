import { createHash } from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import { HttpError } from './errors.js'

export const sessionCookieName = 'fitcheck.sid'

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export async function authenticate(request, _response, next) {
  try {
    const token = request.cookies?.[sessionCookieName]
    if (!token) throw new HttpError(401, 'Sign in to continue', 'UNAUTHENTICATED')

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true },
    })
    if (!session || session.expiresAt <= new Date()) {
      throw new HttpError(401, 'Sign in to continue', 'UNAUTHENTICATED')
    }

    request.user = session.user
    request.sessionId = session.id
    return next()
  } catch (error) {
    return next(error)
  }
}

export function requireRole(role) {
  return (request, _response, next) => {
    if (request.user?.role !== role) {
      return next(new HttpError(403, 'You do not have access to this resource', 'FORBIDDEN'))
    }
    return next()
  }
}
