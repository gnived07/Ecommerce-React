const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '')

export async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (response.status === 204) return null
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || 'The request could not be completed')
    error.status = response.status
    error.code = payload.code
    error.details = payload.details
    throw error
  }
  return payload
}

export const getProducts = (params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null))
  return request(`/products${query.size ? `?${query}` : ''}`)
}

export const getCategories = () => request('/categories')
export const getProduct = (slug) => request(`/products/${encodeURIComponent(slug)}`)
