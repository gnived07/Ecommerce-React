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

export function errorHandler(error, _request, response, next) {
  void next
  if (error?.code === 'P2034') {
    return response.status(409).json({ error: 'This changed at the same time as another request. Please try again.', code: 'CONCURRENT_UPDATE' })
  }
  if (error?.code === 'P2002') {
    return response.status(409).json({ error: 'A record with those details already exists', code: 'RESOURCE_CONFLICT' })
  }
  if (error?.code === 'P2003') {
    return response.status(409).json({ error: 'This change conflicts with related records', code: 'RELATION_CONFLICT' })
  }
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
  console.error(error?.name ?? 'Error', error?.code ?? 'UNEXPECTED_ERROR')
  return response.status(500).json({ error: 'Something went wrong', code: 'INTERNAL_ERROR' })
}
