import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { request } from '../api/client.js'
import { useCart } from '../context/CartContext.jsx'
import Button from '../components/ui/Button.jsx'

export default function LoginPage({ mode = 'login' }) {
  const registering = mode === 'register'
  const navigate = useNavigate()
  const location = useLocation()
  const { refresh } = useCart()
  const [values, setValues] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await request(`/auth/${registering ? 'register' : 'login'}`, {
        method: 'POST', body: JSON.stringify(values),
      })
      await refresh()
      const from = location.state?.from
      navigate(typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/shop', { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'We could not sign you in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function update(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  return (
    <section className="auth-page page-width">
      <div className="auth-card">
        <p className="eyebrow">FitCheck · Your account</p>
        <h1 className="display-title">{registering ? 'Make room for good things.' : 'Welcome back.'}</h1>
        <p className="body-copy">{registering ? 'Create an account to save your bag and keep track of your orders.' : 'Sign in to see your bag and your FitCheck orders.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {registering && <div className="auth-form__names"><label className="field"><span className="field__label">First name</span><input className="field__control" name="firstName" autoComplete="given-name" required maxLength={80} value={values.firstName} onChange={update} /></label><label className="field"><span className="field__label">Last name</span><input className="field__control" name="lastName" autoComplete="family-name" required maxLength={80} value={values.lastName} onChange={update} /></label></div>}
          <label className="field"><span className="field__label">Email address</span><input className="field__control" name="email" type="email" autoComplete="email" required maxLength={254} value={values.email} onChange={update} /></label>
          <label className="field"><span className="field__label">Password</span><input className="field__control" name="password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} required minLength={10} maxLength={128} value={values.password} onChange={update} /><span className="body-copy">Use at least 10 characters.</span></label>
          {error && <p className="auth-form__error" role="alert">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? 'One moment…' : registering ? 'Create account' : 'Sign in'}</Button>
        </form>
        <p className="auth-switch">{registering ? 'Already have an account?' : 'New to FitCheck?'} <Link to={registering ? '/login' : '/register'}>{registering ? 'Sign in' : 'Create an account'}</Link></p>
      </div>
    </section>
  )
}
