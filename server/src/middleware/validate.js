export function validate(schema, source = 'body') {
  return (request, _response, next) => {
    const parsed = schema.safeParse(request[source])
    if (!parsed.success) return next(parsed.error)
    if (source === 'query') request.validatedQuery = parsed.data
    else request[source] = parsed.data
    return next()
  }
}
