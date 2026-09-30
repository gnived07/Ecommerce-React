import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'
import { formatCurrency } from '../lib/format.js'
import Button from './ui/Button.jsx'

export default function CartDrawer() {
  const { cart, drawerOpen, setDrawerOpen, busy, error, updateItem, removeItem } = useCart()

  useEffect(() => {
    if (!drawerOpen) return undefined
    const closeOnEscape = (event) => event.key === 'Escape' && setDrawerOpen(false)
    document.addEventListener('keydown', closeOnEscape)
    document.body.classList.add('drawer-is-open')
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.classList.remove('drawer-is-open')
    }
  }, [drawerOpen, setDrawerOpen])

  if (!drawerOpen) return null
  const items = cart?.items ?? []

  return (
    <div className="drawer-layer" onMouseDown={(event) => event.target === event.currentTarget && setDrawerOpen(false)}>
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="cart-drawer__header"><div><p className="eyebrow">FitCheck · Shopping bag</p><h2 id="cart-title" className="section-title">Your bag <span>({cart?.itemCount ?? 0})</span></h2></div><button className="icon-button" type="button" onClick={() => setDrawerOpen(false)} aria-label="Close shopping bag"><X size={20} strokeWidth={1.4} /></button></div>
        {error && <p className="cart-drawer__error" role="alert">{error}</p>}
        {!cart ? <div className="cart-drawer__empty"><p className="body-copy">Sign in to keep your shopping bag saved across visits.</p><Button as={Link} to="/login" onClick={() => setDrawerOpen(false)}>Sign in to your account</Button><Link className="text-link" to="/shop" onClick={() => setDrawerOpen(false)}>Continue browsing</Link></div> : items.length === 0 ? <div className="cart-drawer__empty"><p className="section-title">A good place to begin.</p><p className="body-copy">Your bag is empty. Find a piece that feels like you.</p><Button as={Link} to="/shop" onClick={() => setDrawerOpen(false)}>Explore the collection</Button></div> : <>
          <div className="cart-drawer__items">{items.map((item) => <article className="cart-item" key={item.id}>
            <Link className="cart-item__image" to={`/products/${item.product.slug}`} onClick={() => setDrawerOpen(false)}>{item.product.image ? <img src={item.product.image.url} alt={item.product.image.alt || item.product.name} /> : <span />}</Link>
            <div className="cart-item__details"><div className="cart-item__top"><div><h3>{item.product.name}</h3><p>{item.color} · {item.size}</p></div><p>{formatCurrency(item.lineTotalCents)}</p></div>
              <div className="cart-item__bottom"><div className="quantity-control quantity-control--small"><button type="button" aria-label={`Decrease ${item.product.name} quantity`} disabled={busy || item.quantity <= 1} onClick={() => updateItem(item.id, item.quantity - 1).catch(() => {})}>−</button><span>{item.quantity}</span><button type="button" aria-label={`Increase ${item.product.name} quantity`} disabled={busy || item.quantity >= item.stock} onClick={() => updateItem(item.id, item.quantity + 1).catch(() => {})}>+</button></div><button className="remove-link" type="button" disabled={busy} onClick={() => removeItem(item.id).catch(() => {})}>Remove</button></div>
              {item.quantity > item.stock && <p className="cart-item__stock-warning">Only {item.stock} now available. Update quantity to continue.</p>}
            </div>
          </article>)}</div>
          <div className="cart-drawer__footer"><div className="cart-drawer__subtotal"><span>Subtotal</span><strong>{formatCurrency(cart.subtotalCents)}</strong></div><p className="body-copy">Shipping and taxes are calculated at checkout.</p><Button as={Link} to="/checkout" onClick={() => setDrawerOpen(false)}>Continue to checkout</Button><Link className="cart-drawer__continue" to="/shop" onClick={() => setDrawerOpen(false)}>Continue shopping</Link></div>
        </>}
      </aside>
    </div>
  )
}
