import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { request } from '../api/client.js'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const data = await request('/cart')
      setCart(data.cart)
      setError('')
      return data.cart
    } catch (requestError) {
      if (requestError.status === 401) {
        setCart(null)
        setError('')
      } else {
        setError(requestError.message)
      }
      throw requestError
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh().catch(() => {}) }, [refresh])

  const mutate = useCallback(async (path, options = {}) => {
    setBusy(true)
    setError('')
    try {
      const data = await request(path, options)
      setCart(data.cart)
      return data.cart
    } catch (requestError) {
      setError(requestError.message)
      throw requestError
    } finally {
      setBusy(false)
    }
  }, [])

  const addItem = useCallback(async (variantId, quantity) => {
    const updated = await mutate('/cart/items', { method: 'POST', body: JSON.stringify({ variantId, quantity }) })
    setDrawerOpen(true)
    return updated
  }, [mutate])

  const updateItem = useCallback((id, quantity) => mutate(`/cart/items/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify({ quantity }),
  }), [mutate])
  const removeItem = useCallback((id) => mutate(`/cart/items/${encodeURIComponent(id)}`, { method: 'DELETE' }), [mutate])
  const clearCart = useCallback(() => mutate('/cart', { method: 'DELETE' }), [mutate])

  const value = useMemo(() => ({
    cart, loading, drawerOpen, setDrawerOpen, busy, error, refresh, addItem, updateItem, removeItem, clearCart,
  }), [cart, loading, drawerOpen, busy, error, refresh, addItem, updateItem, removeItem, clearCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart must be used within CartProvider')
  return value
}
