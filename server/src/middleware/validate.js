import { HttpError } from './errors.js'

export function validate(schema, source = 'body') {
  return (request, _response, next) => {
    const parsed = schema.safeParse(request[source])
    if (!parsed.success) return next(new HttpError(400, 'Please check the submitted information', 'VALIDATION_ERROR'))
    request[source] = parsed.data
    return next()
  }
}
