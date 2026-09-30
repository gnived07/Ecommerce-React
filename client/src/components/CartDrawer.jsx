import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCart } from '../context/CartContext.jsx'
import { formatCurrency } from '../lib/format.js'
import Button from './ui/Button.jsx'

export default function CartDrawer() {
  const { cart, drawerOpen, setDrawerOpen, busy, error, updateItem, removeItem } = useCart()
  const closeButtonRef = useRef(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!drawerOpen) return undefined
    const closeOnEscape = (event) => event.key === 'Escape' && setDrawerOpen(false)
    const trapFocus = (event) => {
      if (event.key !== 'Tab') return
      const targets = dialogRef.current?.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')
      if (!targets?.length) return
      const first = targets[0]
      const last = targets[targets.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    const previousFocus = document.activeElement
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('keydown', trapFocus)
    document.body.classList.add('drawer-is-open')
    closeButtonRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('keydown', trapFocus)
      document.body.classList.remove('drawer-is-open')
      previousFocus instanceof HTMLElement && previousFocus.focus()
    }
  }, [drawerOpen, setDrawerOpen])

  const items = cart?.items ?? []

  return (
    <AnimatePresence>
    {drawerOpen && <motion.div className="drawer-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onMouseDown={(event) => event.target === event.currentTarget && setDrawerOpen(false)}>
      <motion.aside ref={dialogRef} className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" initial={{ x: 36 }} animate={{ x: 0 }} exit={{ x: 36 }} transition={{ duration: 0.24, ease: 'easeOut' }}>
        <div className="cart-drawer__header"><div><p className="eyebrow">FitCheck · Shopping bag</p><h2 id="cart-title" className="section-title">Your bag <span>({cart?.itemCount ?? 0})</span></h2></div><button ref={closeButtonRef} className="icon-button" type="button" onClick={() => setDrawerOpen(false)} aria-label="Close shopping bag"><X size={20} strokeWidth={1.4} /></button></div>
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
      </motion.aside>
    </motion.div>}
    </AnimatePresence>
  )
}
