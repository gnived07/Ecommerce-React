export class HttpError extends Error {
  constructor(status, message, code = 'REQUEST_ERROR') {
    super(message)
    this.status = status
    this.code = code
  }
}

export function notFoundHandler(_request, _response, next) {
  next(new HttpError(404, 'The requested resource was not found', 'NOT_FOUND'))
}

export function errorHandler(error, _request, response, _next) {
  if (error instanceof HttpError) {
    return response.status(error.status).json({ error: error.message, code: error.code })
  }
  if (error?.name === 'ZodError') {
    return response.status(400).json({
      error: 'Please check the submitted information',
      code: 'VALIDATION_ERROR',
      details: error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
    })
  }
  console.error(error)
  return response.status(500).json({ error: 'Something went wrong', code: 'INTERNAL_ERROR' })
}
