import { lazy, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import SiteLayout from './components/SiteLayout.jsx'
import Button from './components/ui/Button.jsx'
import { Link } from 'react-router-dom'
import { CartProvider } from './context/CartContext.jsx'

const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const CatalogPage = lazy(() => import('./pages/CatalogPage.jsx'))
const ProductPage = lazy(() => import('./pages/ProductPage.jsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx'))
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage.jsx'))
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'))
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage.jsx'))
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
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
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<ComingSoonPage title="That page has moved." message="Let's find your way back to the collection." />} />
        </Route>
      </Routes>
    </CartProvider>
  )
}
