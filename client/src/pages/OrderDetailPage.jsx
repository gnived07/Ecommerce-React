import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { request } from '../api/client.js'
import { formatCurrency } from '../lib/format.js'
import Button from '../components/ui/Button.jsx'

const titleCase = (value) => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const dateLabel = (value) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' }).format(new Date(value))

export default function OrderDetailPage() {
  const { orderNumber } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    request(`/orders/${encodeURIComponent(orderNumber)}`).then(({ order: data }) => active && setOrder(data))
      .catch((requestError) => active && setError(requestError.message))
    return () => { active = false }
  }, [orderNumber])

  if (error) return <section className="notice-page page-width"><p className="eyebrow">FitCheck · Account</p><h1 className="display-title">We can't open this order.</h1><p className="body-copy">{error}</p><Button as={Link} to="/account">Back to your account</Button></section>
  if (!order) return <div className="notice-page page-width" aria-busy="true"><p className="eyebrow">FitCheck · Order</p><h1 className="display-title">Finding your order.</h1></div>

  return <div className="order-detail page-width"><Link className="text-link" to="/account">← Your account</Link><header><p className="eyebrow">{order.orderNumber} · Placed {dateLabel(order.createdAt)}</p><h1 className="display-title">A good choice.</h1><span className={`status status--${order.status.toLowerCase()}`}>{titleCase(order.status)}</span></header><div className="order-detail__layout"><section><h2 className="eyebrow">Pieces in this order</h2><div className="order-detail__items">{order.items.map((item) => <article className="order-detail__item" key={item.id}><div className="order-detail__image">{item.imageUrl && <img src={item.imageUrl} alt="" />}</div><div><h3>{item.productName}</h3><p>{item.color} · {item.size} · Quantity {item.quantity}</p></div><strong>{formatCurrency(item.unitPriceCents * item.quantity)}</strong></article>)}</div></section><aside className="order-detail__aside"><h2 className="eyebrow">Order summary</h2><div><span>Subtotal</span><span>{formatCurrency(order.subtotalCents)}</span></div><div><span>Delivery</span><span>{order.shippingCents ? formatCurrency(order.shippingCents) : 'Complimentary'}</span></div><div className="order-detail__total"><strong>Total</strong><strong>{formatCurrency(order.totalCents)}</strong></div><p className="body-copy">Cash on delivery</p><hr className="rule" /><h2 className="eyebrow">Delivering to</h2><p className="order-detail__address">{order.shippingName}<br />{order.shippingLine1}{order.shippingLine2 && <><br />{order.shippingLine2}</>}<br />{order.shippingCity}, {order.shippingRegion} {order.shippingPostal}<br />{order.shippingCountry}</p></aside></div></div>
}
