import { HttpError } from './errors.js'

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

export function isAllowedOrigin(origin) {
  if (!origin) return false
  if (origin === process.env.CLIENT_URL) return true
  if (process.env.NODE_ENV !== 'development') return false

  try {
    const url = new URL(origin)
    return url.origin === origin
      && url.protocol === 'http:'
      && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  } catch {
    return false
  }
}

export function verifyRequestOrigin(request, _response, next) {
  if (safeMethods.has(request.method)) return next()

  const origin = request.get('origin')
  if (origin && isAllowedOrigin(origin)) return next()
  if (!origin && process.env.NODE_ENV !== 'production') return next()
  return next(new HttpError(403, 'This request origin is not allowed', 'ORIGIN_NOT_ALLOWED'))
}

export function noStore(_request, response, next) {
  response.set('Cache-Control', 'no-store')
  response.set('Pragma', 'no-cache')
  return next()
}

export function parseCookies(request, _response, next) {
  request.cookies = Object.fromEntries((request.headers.cookie ?? '').split(';').flatMap((part) => {
    const separator = part.indexOf('=')
    if (separator < 1) return []
    const name = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    try { return [[name, decodeURIComponent(value)]] } catch { return [[name, value]] }
  }))
  return next()
}
