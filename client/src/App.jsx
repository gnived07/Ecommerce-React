import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import SiteLayout from './components/SiteLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import CatalogPage from './pages/CatalogPage.jsx'
import ProductPage from './pages/ProductPage.jsx'
import Button from './components/ui/Button.jsx'
import { Link } from 'react-router-dom'
import { CartProvider } from './context/CartContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import OrderConfirmationPage from './pages/OrderConfirmationPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import OrderDetailPage from './pages/OrderDetailPage.jsx'

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
    <CartProvider>
      <ScrollToTop />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="shop" element={<CatalogPage />} />
          <Route path="products/:slug" element={<ProductPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<LoginPage mode="register" />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="order-confirmation/:orderNumber" element={<OrderConfirmationPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="account/orders/:orderNumber" element={<OrderDetailPage />} />
          <Route path="*" element={<ComingSoonPage title="That page has moved." message="Let's find your way back to the collection." />} />
        </Route>
      </Routes>
    </CartProvider>
  )
}
