import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { request } from '../api/client.js'
import { useCart } from '../context/CartContext.jsx'
import { formatCurrency } from '../lib/format.js'
import Button from '../components/ui/Button.jsx'

const titleCase = (value) => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const dateLabel = (value) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value))

export default function AccountPage() {
  const navigate = useNavigate()
  const { refresh } = useCart()
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([request('/auth/me'), request('/orders')]).then(([identity, history]) => {
      if (!active) return
      setUser(identity.user)
      setOrders(history.orders)
    }).catch((requestError) => active && setError(requestError.status === 401 ? 'Sign in to see your account and orders.' : requestError.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  async function signOut() {
    setSigningOut(true)
    await request('/auth/logout', { method: 'POST' }).catch(() => {})
    await refresh().catch(() => {})
    navigate('/', { replace: true })
  }

  if (loading) return <div className="notice-page page-width" aria-busy="true"><p className="eyebrow">FitCheck · Account</p><h1 className="display-title">Gathering your details.</h1></div>
  if (!user) return <section className="notice-page page-width"><p className="eyebrow">FitCheck · Account</p><h1 className="display-title">A place for your pieces.</h1><p className="body-copy">{error}</p><Button as={Link} to="/login">Sign in</Button></section>

  return <div className="account-page page-width"><header className="account-heading"><div><p className="eyebrow">FitCheck · Your account</p><h1 className="display-title">Hello, {user.firstName}.</h1><p className="body-copy">{user.email}</p></div><Button variant="outline" disabled={signingOut} onClick={signOut}>{signingOut ? 'Signing out…' : 'Sign out'}</Button></header><section className="account-orders"><div className="section-heading"><div><p className="eyebrow">Your FitCheck history</p><h2 className="section-title">Orders</h2></div><span className="eyebrow">{orders.length} total</span></div>{orders.length ? <div className="order-list">{orders.map((order) => <Link className="order-row" to={`/account/orders/${encodeURIComponent(order.orderNumber)}`} key={order.id}><div><span className="eyebrow">{order.orderNumber}</span><span className="order-row__date">{dateLabel(order.createdAt)}</span></div><div><span className={`status status--${order.status.toLowerCase()}`}>{titleCase(order.status)}</span><span className="order-row__lines">{order.lineCount} {order.lineCount === 1 ? 'line' : 'lines'}</span></div><strong>{formatCurrency(order.totalCents)}</strong><span className="order-row__arrow" aria-hidden="true">↗</span></Link>)}</div> : <div className="account-empty"><p className="section-title">Your first order is still ahead.</p><p className="body-copy">When you find the right pieces, they’ll appear here.</p><Button as={Link} to="/shop">Browse the collection</Button></div>}</section></div>
}
