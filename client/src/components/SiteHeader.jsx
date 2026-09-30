import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'

const links = [
  ['New arrivals', '/shop?sort=newest'],
  ['Women', '/shop?category=women'],
  ['Men', '/shop?category=men'],
  ['Collections', '/shop?category=collections'],
]

export default function SiteHeader() {
  const [open, setOpen] = useState(false)
  const { cart, setDrawerOpen } = useCart()
  return (
    <>
      <div className="announcement">Complimentary delivery on orders over ₹5,000</div>
      <header className="site-header">
        <div className="site-header__inner page-width">
          <button className="icon-button site-header__menu" type="button" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((value) => !value)}>
            {open ? <X size={19} strokeWidth={1.4} /> : <Menu size={19} strokeWidth={1.4} />}
          </button>
          <nav className="site-header__nav" aria-label="Main navigation">
            {links.map(([label, to]) => <NavLink key={label} to={to}>{label}</NavLink>)}
          </nav>
          <Link className="brand" to="/" aria-label="FitCheck home">FitCheck<span>®</span></Link>
          <div className="site-header__actions">
            <Link className="icon-button" to="/shop?focus=search" aria-label="Search"><Search size={18} strokeWidth={1.4} /></Link>
            <Link className="icon-button site-header__account" to="/login" aria-label="Account"><UserRound size={18} strokeWidth={1.4} /></Link>
            <button className="icon-button bag-link" type="button" onClick={() => setDrawerOpen(true)} aria-label={`Shopping bag, ${cart?.itemCount ?? 0} items`}><ShoppingBag size={18} strokeWidth={1.4} />{cart?.itemCount > 0 && <span className="bag-link__count">{cart.itemCount}</span>}</button>
          </div>
        </div>
        {open && <nav className="mobile-menu page-width" aria-label="Mobile navigation">{links.map(([label, to]) => <Link onClick={() => setOpen(false)} key={label} to={to}>{label}</Link>)}<a href="/#about" onClick={() => setOpen(false)}>About FitCheck</a></nav>}
      </header>
    </>
  )
}
