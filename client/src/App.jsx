import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import SiteLayout from './components/SiteLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import CatalogPage from './pages/CatalogPage.jsx'
import Button from './components/ui/Button.jsx'
import { Link } from 'react-router-dom'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo({ top: 0, behavior: 'instant' }), [pathname])
  return null
}

function ComingSoonPage({ title, message }) {
  return <section className="notice-page page-width"><p className="eyebrow">FitCheck · In progress</p><h1 className="display-title">{title}</h1><p className="body-copy">{message}</p><Button as={Link} to="/shop">Return to the collection</Button></section>
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="shop" element={<CatalogPage />} />
          <Route path="products/:slug" element={<ComingSoonPage title="Good things, in detail." message="The full product story is coming together. Explore the collection while we finish the details." />} />
          <Route path="bag" element={<ComingSoonPage title="Your bag is waiting." message="Your shopping bag will live here. Browse the collection to find something worth keeping." />} />
          <Route path="login" element={<ComingSoonPage title="A place for your pieces." message="Account sign-in is coming soon. Your FitCheck account will keep your orders and details together." />} />
          <Route path="account" element={<ComingSoonPage title="Your FitCheck account." message="Order history and account details are coming soon." />} />
          <Route path="*" element={<ComingSoonPage title="That page has moved." message="Let's find your way back to the collection." />} />
        </Route>
      </Routes>
    </>
  )
}
