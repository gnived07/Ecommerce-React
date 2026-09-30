import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../api/client.js'
import { formatCurrency } from '../lib/format.js'
import Button from '../components/ui/Button.jsx'

const blankForm = { name: '', slug: '', description: '', details: '', material: '', care: '', categoryId: '', featured: false, published: false, size: 'M', color: 'Natural', priceRupees: '', stock: '10', imageUrl: '', imageAlt: '' }
const nextStatuses = { PENDING: ['PROCESSING', 'CANCELLED'], PROCESSING: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED'], DELIVERED: [], CANCELLED: [] }
const titleCase = (value) => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const dateLabel = (value) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))

function toForm(product) {
  const firstVariant = product.variants[0]
  return {
    ...blankForm,
    ...product,
    categoryId: product.categoryId,
    size: firstVariant?.size ?? 'M',
    color: firstVariant?.color ?? 'Natural',
    priceRupees: firstVariant ? String(firstVariant.priceCents / 100) : '',
    stock: firstVariant ? String(firstVariant.stock) : '0',
    imageUrl: product.images[0]?.url ?? '',
    imageAlt: product.images[0]?.alt ?? product.name,
  }
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [tab, setTab] = useState('products')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [orders, setOrders] = useState([])
  const [form, setForm] = useState(blankForm)
  const [editing, setEditing] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [variantDrafts, setVariantDrafts] = useState({})

  async function load() {
    setLoading(true)
    setError('')
    try {
      const { user } = await request('/auth/me')
      if (user.role !== 'ADMIN') { setDenied(true); return }
      const [{ products: productList, categories: categoryList }, { orders: orderList }] = await Promise.all([
        request('/admin/products'), request('/admin/orders'),
      ])
      setProducts(productList)
      setCategories(categoryList)
      setOrders(orderList)
      setVariantDrafts(Object.fromEntries(productList.flatMap((product) => product.variants.map((variant) => [variant.id, { stock: String(variant.stock), priceRupees: String(variant.priceCents / 100), active: variant.active }]))))
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) setDenied(true)
      else setError(requestError.message || 'The admin area could not load.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function updateForm(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    if (name === 'name' && !editing) setForm((current) => ({ ...current, slug: slugify(value) }))
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...blankForm, categoryId: categories[0]?.id ?? '' })
    setFormOpen(true)
    setError('')
    setNotice('')
  }

  function openEdit(product) {
    setEditing(product)
    setForm(toForm(product))
    setFormOpen(true)
    setError('')
    setNotice('')
  }

  async function saveProduct(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const images = form.imageUrl ? [{ url: form.imageUrl, alt: form.imageAlt || form.name }] : []
    try {
      if (editing) {
        const data = {
          name: form.name, slug: form.slug, description: form.description,
          details: form.details, material: form.material, care: form.care,
          categoryId: form.categoryId, featured: form.featured, published: form.published, images,
        }
        const { product } = await request(`/admin/products/${editing.id}`, { method: 'PATCH', body: JSON.stringify(data) })
        setProducts((current) => current.map((item) => item.id === product.id ? product : item))
        setNotice(`${product.name} has been updated.`)
      } else {
        const slug = form.slug || slugify(form.name)
        const sku = `${slug}-${form.size}-${form.color}`.replace(/[^a-zA-Z0-9-]/g, '-').toUpperCase().slice(0, 80)
        const data = {
          name: form.name, slug, description: form.description, details: form.details,
          material: form.material, care: form.care, categoryId: form.categoryId,
          featured: form.featured, published: form.published, images,
          variants: [{ sku, size: form.size, color: form.color, priceCents: Math.round(Number(form.priceRupees) * 100), stock: Number(form.stock) }],
        }
        const { product } = await request('/admin/products', { method: 'POST', body: JSON.stringify(data) })
        setProducts((current) => [product, ...current])
        setVariantDrafts((current) => ({ ...current, ...Object.fromEntries(product.variants.map((variant) => [variant.id, { stock: String(variant.stock), priceRupees: String(variant.priceCents / 100), active: variant.active }])) }))
        setNotice(`${product.name} has been created.`)
      }
      setFormOpen(false)
    } catch (requestError) {
      setError(requestError.message || 'The product could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  async function togglePublished(product) {
    setError('')
    try {
      const { product: updated } = await request(`/admin/products/${product.id}`, {
        method: 'PATCH', body: JSON.stringify({ published: !product.published }),
      })
      setProducts((current) => current.map((item) => item.id === updated.id ? updated : item))
      setNotice(`${updated.name} is now ${updated.published ? 'visible' : 'hidden'} in the store.`)
    } catch (requestError) { setError(requestError.message) }
  }

  async function saveVariant(variant) {
    const draft = variantDrafts[variant.id]
    setError('')
    try {
      const { variant: updated } = await request(`/admin/variants/${variant.id}`, {
        method: 'PATCH', body: JSON.stringify({ stock: Number(draft.stock), priceCents: Math.round(Number(draft.priceRupees) * 100), active: draft.active }),
      })
      setProducts((current) => current.map((product) => ({ ...product, variants: product.variants.map((item) => item.id === updated.id ? updated : item) })))
      setNotice(`${updated.product.name} inventory and price are saved.`)
    } catch (requestError) { setError(requestError.message) }
  }

  async function updateOrder(order, status) {
    setError('')
    try {
      const { order: updated } = await request(`/admin/orders/${order.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setOrders((current) => current.map((item) => item.id === updated.id ? { ...item, status: updated.status } : item))
      setNotice(`${updated.orderNumber} is now ${titleCase(updated.status)}.`)
      if (status === 'CANCELLED') await load()
    } catch (requestError) { setError(requestError.message) }
  }

  if (loading) return <div className="notice-page page-width" aria-busy="true"><p className="eyebrow">FitCheck · Studio</p><h1 className="display-title">Opening the workroom.</h1></div>
  if (denied) return <section className="notice-page page-width"><p className="eyebrow">FitCheck · Studio</p><h1 className="display-title">This area is for the FitCheck team.</h1><p className="body-copy">Your account does not have administrator access.</p><Button as={Link} to="/">Return to the store</Button></section>

  return <div className="admin-page page-width"><header className="admin-heading"><div><p className="eyebrow">FitCheck · Studio</p><h1 className="display-title">The workroom.</h1><p className="body-copy">A live view of the pieces and orders in your store.</p></div><div className="admin-stats"><div><strong>{products.length}</strong><span>pieces</span></div><div><strong>{orders.length}</strong><span>orders</span></div><div><strong>{products.filter((product) => product.published).length}</strong><span>published</span></div></div></header>
    <div className="admin-tabs" role="tablist" aria-label="Admin sections"><button id="admin-products-tab" role="tab" aria-controls="admin-products-panel" aria-selected={tab === 'products'} onClick={() => setTab('products')}>Products</button><button id="admin-orders-tab" role="tab" aria-controls="admin-orders-panel" aria-selected={tab === 'orders'} onClick={() => setTab('orders')}>Orders</button></div>
    {notice && <p className="admin-notice" role="status">{notice}</p>}{error && <p className="admin-error" role="alert">{error}</p>}
    {tab === 'products' ? <section id="admin-products-panel" className="admin-products" role="tabpanel" aria-labelledby="admin-products-tab"><div className="section-heading"><div><p className="eyebrow">Catalog & inventory</p><h2 className="section-title">Pieces</h2></div><Button onClick={() => formOpen ? setFormOpen(false) : openCreate()}>{formOpen ? 'Close form' : 'Add a piece'}</Button></div>
      {formOpen && <form className="admin-product-form" onSubmit={saveProduct}><div className="admin-product-form__heading"><p className="eyebrow">{editing ? 'Edit product' : 'New product'}</p><h3 className="section-title">{editing ? editing.name : 'Add to the collection.'}</h3></div><div className="admin-form-grid">
        <label className="field"><span className="field__label">Product name</span><input className="field__control" name="name" required minLength={2} maxLength={160} value={form.name} onChange={updateForm} /></label>
        <label className="field"><span className="field__label">URL slug</span><input className="field__control" name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={updateForm} /></label>
        <label className="field admin-form-grid__wide"><span className="field__label">Description</span><textarea className="field__control" name="description" required minLength={10} maxLength={5000} value={form.description} onChange={updateForm} /></label>
        <label className="field"><span className="field__label">Category</span><select className="field__control" name="categoryId" required value={form.categoryId} onChange={updateForm}><option value="">Choose a category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
        <label className="field"><span className="field__label">Material</span><input className="field__control" name="material" maxLength={300} value={form.material ?? ''} onChange={updateForm} /></label>
        <label className="field admin-form-grid__wide"><span className="field__label">Product image URL</span><input className="field__control" name="imageUrl" type="url" maxLength={1000} value={form.imageUrl} onChange={updateForm} /></label>
        <label className="field"><span className="field__label">Image alt text</span><input className="field__control" name="imageAlt" maxLength={180} value={form.imageAlt} onChange={updateForm} /></label>
        {!editing && <><label className="field"><span className="field__label">First size</span><input className="field__control" name="size" required maxLength={30} value={form.size} onChange={updateForm} /></label><label className="field"><span className="field__label">Colour</span><input className="field__control" name="color" required maxLength={50} value={form.color} onChange={updateForm} /></label><label className="field"><span className="field__label">Price (₹)</span><input className="field__control" name="priceRupees" type="number" min="1" step="1" required value={form.priceRupees} onChange={updateForm} /></label><label className="field"><span className="field__label">Starting stock</span><input className="field__control" name="stock" type="number" min="0" max="100000" required value={form.stock} onChange={updateForm} /></label></>}
        <label className="field"><span className="field__label">Details</span><textarea className="field__control" name="details" maxLength={5000} value={form.details ?? ''} onChange={updateForm} /></label>
        <label className="field"><span className="field__label">Care</span><input className="field__control" name="care" maxLength={500} value={form.care ?? ''} onChange={updateForm} /></label>
      </div><div className="admin-checks"><label><input type="checkbox" name="featured" checked={form.featured} onChange={updateForm} /> Featured</label><label><input type="checkbox" name="published" checked={form.published} onChange={updateForm} /> Visible in storefront</label></div><div className="admin-product-form__actions"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create product'}</Button><Button variant="outline" type="button" onClick={() => setFormOpen(false)}>Cancel</Button></div></form>}
      <div className="admin-product-list">{products.map((product) => <article className="admin-product" key={product.id}><div className="admin-product__overview"><div className="admin-product__image">{product.images[0] && <img src={product.images[0].url} alt="" />}</div><div><h3>{product.name}</h3><p>{product.category.name} · <span className={product.published ? 'published-label' : ''}>{product.published ? 'Published' : 'Hidden'}</span></p><Link to={`/products/${product.slug}`} target="_blank" rel="noreferrer">View storefront page ↗</Link></div><div className="admin-product__actions"><button type="button" onClick={() => openEdit(product)}>Edit</button><button type="button" onClick={() => togglePublished(product)}>{product.published ? 'Hide' : 'Publish'}</button></div></div><div className="admin-variants">{product.variants.map((variant) => <div className="admin-variant" key={variant.id}><span>{variant.size} · {variant.color}</span><label>Price ₹<input type="number" min="1" value={variantDrafts[variant.id]?.priceRupees ?? ''} onChange={(event) => setVariantDrafts((current) => ({ ...current, [variant.id]: { ...current[variant.id], priceRupees: event.target.value } }))} /></label><label>Stock<input type="number" min="0" max="100000" value={variantDrafts[variant.id]?.stock ?? ''} onChange={(event) => setVariantDrafts((current) => ({ ...current, [variant.id]: { ...current[variant.id], stock: event.target.value } }))} /></label><label className="admin-variant__active"><input type="checkbox" checked={variantDrafts[variant.id]?.active ?? false} onChange={(event) => setVariantDrafts((current) => ({ ...current, [variant.id]: { ...current[variant.id], active: event.target.checked } }))} /> Active</label><Button variant="outline" onClick={() => saveVariant(variant)}>Save</Button></div>)}</div></article>)}</div>
    </section> : <section id="admin-orders-panel" className="admin-orders" role="tabpanel" aria-labelledby="admin-orders-tab"><div className="section-heading"><div><p className="eyebrow">Customer activity</p><h2 className="section-title">Orders</h2></div><span className="eyebrow">{orders.length} total</span></div><div className="admin-order-list">{orders.map((order) => <article className="admin-order" key={order.id}><div className="admin-order__top"><div><span className="eyebrow">{order.orderNumber}</span><span className="admin-order__date">{dateLabel(order.createdAt)}</span></div><strong>{formatCurrency(order.totalCents)}</strong></div><div className="admin-order__customer"><strong>{order.shippingName}</strong><span>{order.email}</span><span>{order.items.length} lines · {order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span></div><div className="admin-order__bottom"><span className={`status status--${order.status.toLowerCase()}`}>{titleCase(order.status)}</span><label>Status<select value={order.status} disabled={!nextStatuses[order.status].length} onChange={(event) => updateOrder(order, event.target.value)}><option value={order.status}>{titleCase(order.status)}</option>{nextStatuses[order.status].map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></label></div></article>)}</div></section>}
  </div>
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
