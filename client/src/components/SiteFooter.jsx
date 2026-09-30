import { Link } from 'react-router-dom'

export default function SiteFooter() {
  return (
    <footer className="site-footer" id="about">
      <div className="page-width site-footer__top">
        <div className="site-footer__newsletter">
          <p className="eyebrow">The FitCheck edit</p>
          <h2 className="section-title">A little more considered.</h2>
          <p className="body-copy">New pieces, thoughtful notes, and things worth keeping.</p>
          <Link className="footer-link" to="/shop">Explore the collection <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="site-footer__column"><p className="eyebrow">Explore</p><Link to="/shop">All pieces</Link><Link to="/shop?category=women">Women</Link><Link to="/shop?category=men">Men</Link></div>
        <div className="site-footer__column"><p className="eyebrow">Help</p><Link to="/account">Your account</Link><a href="mailto:care@fitcheck.store">Contact us</a><a href="mailto:care@fitcheck.store?subject=Shipping%20and%20returns">Shipping & returns</a></div>
        <div className="site-footer__column"><p className="eyebrow">Our point of view</p><p className="body-copy">Fewer things, chosen well. FitCheck is a study in everyday pieces made to stay in rotation.</p></div>
      </div>
      <div className="page-width site-footer__bottom"><Link className="brand brand--footer" to="/">FitCheck<span>®</span></Link><span>© {new Date().getFullYear()} FitCheck Studio</span><span>Made to be worn, again and again.</span></div>
    </footer>
  )
}
