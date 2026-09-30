import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { request } from '../api/client.js'
import { useCart } from '../context/CartContext.jsx'
import { formatCurrency } from '../lib/format.js'
import Button from '../components/ui/Button.jsx'

const initialAddress = { firstName: '', lastName: '', line1: '', line2: '', city: '', region: '', postalCode: '', country: 'IN', phone: '' }
const FREE_SHIPPING_THRESHOLD = 500_000
const STANDARD_SHIPPING = 30_000

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { cart, loading, refresh } = useCart()
  const [address, setAddress] = useState(initialAddress)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const shipping = cart?.subtotalCents >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING
  const total = (cart?.subtotalCents ?? 0) + shipping

  function update(event) {
    setAddress((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { order } = await request('/orders', { method: 'POST', body: JSON.stringify({ shippingAddress: address }) })
      refresh().catch(() => {})
      navigate(`/order-confirmation/${encodeURIComponent(order.orderNumber)}`, { state: { order }, replace: true })
    } catch (requestError) {
      setError(requestError.message || 'We could not place your order. Please try again.')
      refresh().catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="notice-page page-width" aria-busy="true"><p className="eyebrow">FitCheck · Checkout</p><h1 className="display-title">Preparing your bag.</h1></div>
  if (!cart) return <section className="notice-page page-width"><p className="eyebrow">FitCheck · Checkout</p><h1 className="display-title">Your bag is saved to your account.</h1><p className="body-copy">Sign in to review your pieces and continue to checkout.</p><Button as={Link} to="/login" state={{ from: '/checkout' }}>Sign in</Button></section>
  if (!cart.items.length) return <section className="notice-page page-width"><p className="eyebrow">FitCheck · Checkout</p><h1 className="display-title">Your bag is empty.</h1><p className="body-copy">Find a piece that feels like you, then come back to finish your order.</p><Button as={Link} to="/shop">Explore the collection</Button></section>

  return (
    <div className="checkout-page page-width">
      <div className="checkout-heading"><p className="eyebrow">FitCheck · Step 01 / 01</p><h1 className="display-title">A few details,<br />then it's yours.</h1><p className="body-copy">Cash on delivery · No payment will be collected online.</p></div>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submit}>
          <section className="checkout-section"><p className="eyebrow">01 · Delivery details</p><div className="checkout-fields">
            <label className="field"><span className="field__label">First name</span><input className="field__control" name="firstName" autoComplete="given-name" required maxLength={80} value={address.firstName} onChange={update} /></label>
            <label className="field"><span className="field__label">Last name</span><input className="field__control" name="lastName" autoComplete="family-name" required maxLength={80} value={address.lastName} onChange={update} /></label>
            <label className="field checkout-fields__wide"><span className="field__label">Address line 1</span><input className="field__control" name="line1" autoComplete="address-line1" required maxLength={160} value={address.line1} onChange={update} /></label>
            <label className="field checkout-fields__wide"><span className="field__label">Apartment, suite, etc. <span className="optional">Optional</span></span><input className="field__control" name="line2" autoComplete="address-line2" maxLength={160} value={address.line2} onChange={update} /></label>
            <label className="field"><span className="field__label">City</span><input className="field__control" name="city" autoComplete="address-level2" required maxLength={100} value={address.city} onChange={update} /></label>
            <label className="field"><span className="field__label">State / region</span><input className="field__control" name="region" autoComplete="address-level1" required maxLength={100} value={address.region} onChange={update} /></label>
            <label className="field"><span className="field__label">Postal code</span><input className="field__control" name="postalCode" autoComplete="postal-code" required maxLength={20} value={address.postalCode} onChange={update} /></label>
            <label className="field"><span className="field__label">Country code</span><input className="field__control" name="country" autoComplete="country" required minLength={2} maxLength={2} value={address.country} onChange={update} /></label>
            <label className="field checkout-fields__wide"><span className="field__label">Phone <span className="optional">Optional</span></span><input className="field__control" name="phone" type="tel" autoComplete="tel" maxLength={30} value={address.phone} onChange={update} /></label>
          </div></section>
          <section className="checkout-section checkout-payment"><p className="eyebrow">02 · Payment</p><div><strong>Cash on delivery</strong><p className="body-copy">Pay when your FitCheck pieces arrive.</p></div></section>
          {error && <p className="checkout-error" role="alert">{error}</p>}
          <Button type="submit" disabled={busy || cart.items.some((item) => item.quantity > item.stock)}>{busy ? 'Placing your order…' : `Place order · ${formatCurrency(total)}`}</Button>
          <Link className="checkout-back" to="/shop">Return to the collection</Link>
        </form>

        <aside className="checkout-summary"><p className="eyebrow">Your selection · {cart.itemCount} pieces</p><div className="checkout-summary__items">{cart.items.map((item) => <div className="checkout-line" key={item.id}><div className="checkout-line__image">{item.product.image && <img src={item.product.image.url} alt="" />}</div><div className="checkout-line__name"><strong>{item.product.name}</strong><span>{item.color} · {item.size} · Qty {item.quantity}</span></div><span>{formatCurrency(item.lineTotalCents)}</span></div>)}</div><div className="checkout-summary__totals"><div><span>Subtotal</span><span>{formatCurrency(cart.subtotalCents)}</span></div><div><span>Delivery</span><span>{shipping ? formatCurrency(shipping) : 'Complimentary'}</span></div><div className="checkout-summary__total"><strong>Total</strong><strong>{formatCurrency(total)}</strong></div><p className="body-copy">Delivery is complimentary on orders over ₹5,000.</p></div></aside>
      </div>
    </div>
  )
}
