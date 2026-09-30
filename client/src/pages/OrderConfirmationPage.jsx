import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { request } from '../api/client.js'
import { formatCurrency } from '../lib/format.js'
import Button from '../components/ui/Button.jsx'

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams()
  const location = useLocation()
  const [order, setOrder] = useState(location.state?.order ?? null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (order) return
    let active = true
    request(`/orders/${encodeURIComponent(orderNumber)}`).then(({ order: data }) => active && setOrder(data))
      .catch((requestError) => active && setError(requestError.message))
    return () => { active = false }
  }, [order, orderNumber])

  if (error) return <section className="notice-page page-width"><p className="eyebrow">FitCheck · Order</p><h1 className="display-title">We can't load the order details.</h1><p className="body-copy">Keep your order number {orderNumber} for your records. You can also sign in to see your order history.</p><Button as={Link} to="/login">Sign in</Button></section>
  if (!order) return <div className="notice-page page-width" aria-busy="true"><p className="eyebrow">FitCheck · Order</p><h1 className="display-title">Preparing your confirmation.</h1></div>

  return <section className="confirmation-page page-width"><div className="confirmation-mark" aria-hidden="true">✓</div><p className="eyebrow">FitCheck · Order confirmed</p><h1 className="display-title">Good things are on their way.</h1><p className="body-copy">Your order has been placed with cash on delivery. Pay when your pieces arrive.</p><div className="confirmation-card"><div><span className="eyebrow">Order number</span><strong>{order.orderNumber}</strong></div><div><span className="eyebrow">Order total</span><strong>{formatCurrency(order.totalCents)}</strong></div><div><span className="eyebrow">Payment</span><strong>Cash on delivery</strong></div></div><Button as={Link} to="/account" variant="outline">View your account</Button><Link className="checkout-back" to="/shop">Continue shopping</Link></section>
}
