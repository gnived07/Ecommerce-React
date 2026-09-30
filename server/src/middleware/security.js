import { HttpError } from './errors.js'

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

export function verifyRequestOrigin(request, _response, next) {
  if (safeMethods.has(request.method)) return next()

  const origin = request.get('origin')
  const allowedOrigin = process.env.CLIENT_URL
  if (origin && origin === allowedOrigin) return next()
  if (!origin && process.env.NODE_ENV !== 'production') return next()
  return next(new HttpError(403, 'This request origin is not allowed', 'ORIGIN_NOT_ALLOWED'))
}

export function noStore(_request, response, next) {
  response.set('Cache-Control', 'no-store')
  response.set('Pragma', 'no-cache')
  return next()
}
