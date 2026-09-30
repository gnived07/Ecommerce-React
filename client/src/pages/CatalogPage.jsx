import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCategories, getProducts } from '../api/client.js'
import ProductCard from '../components/catalog/ProductCard.jsx'
import ProductGridSkeleton from '../components/catalog/ProductGridSkeleton.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

export default function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [result, setResult] = useState({ products: [], pagination: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const query = params.get('q') ?? ''
  const [draftQuery, setDraftQuery] = useState(query)

  useEffect(() => { setDraftQuery(query) }, [query])
  useEffect(() => {
    if (params.get('focus') !== 'search') return
    document.getElementById('catalog-search')?.focus()
    const next = new URLSearchParams(params)
    next.delete('focus')
    setParams(next, { replace: true })
  }, [params, setParams])
  useEffect(() => { getCategories().then(({ categories: list }) => setCategories(list)).catch(() => {}) }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const search = Object.fromEntries(params.entries())
    getProducts(search).then((data) => active && setResult(data))
      .catch((requestError) => active && setError(requestError.message || 'The collection could not load.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [params])

  function update(name, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    next.delete('page')
    setParams(next)
  }

  function submitSearch(event) {
    event.preventDefault()
    update('q', draftQuery.trim())
  }

  const heading = params.get('category') ? categories.find((category) => category.slug === params.get('category'))?.name : 'The collection'

  return (
    <div className="catalog-page page-width">
      <div className="catalog-title"><p className="eyebrow">FitCheck · Made for the everyday</p><h1 className="display-title">{heading || 'The collection'}</h1><p className="body-copy">Considered forms, natural textures, and pieces with room to live.</p></div>
      <form className="catalog-search" onSubmit={submitSearch}><label className="sr-only" htmlFor="catalog-search">Search the collection</label><input id="catalog-search" value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} placeholder="Search pieces, materials, collections" /><button type="submit">Search</button></form>
      <div className="catalog-toolbar"><p className="eyebrow">{loading ? 'Finding your pieces…' : `${result.pagination?.total ?? 0} pieces`}</p><div className="catalog-toolbar__controls">
        <label>Category<select value={params.get('category') ?? ''} onChange={(event) => update('category', event.target.value)}><option value="">All pieces</option>{categories.map((category) => <option value={category.slug} key={category.id}>{category.name}</option>)}</select></label>
        <label>Size<select value={params.get('size') ?? ''} onChange={(event) => update('size', event.target.value)}><option value="">All sizes</option>{['XS', 'S', 'M', 'L', 'XL', 'One size'].map((size) => <option key={size}>{size}</option>)}</select></label>
        <label>Availability<select value={params.get('inStock') ?? ''} onChange={(event) => update('inStock', event.target.value)}><option value="">Any</option><option value="true">In stock</option><option value="false">Sold out</option></select></label>
        <label>Sort<select value={params.get('sort') ?? 'newest'} onChange={(event) => update('sort', event.target.value)}><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option></select></label>
      </div></div>
      <div className="catalog-price-filter"><span className="eyebrow">Price range</span><label><span className="sr-only">Minimum price in rupees</span><input type="number" min="0" placeholder="From ₹" value={params.has('minPriceCents') ? Number(params.get('minPriceCents')) / 100 : ''} onChange={(event) => update('minPriceCents', event.target.value ? String(Math.round(Number(event.target.value) * 100)) : '')} /></label><span>—</span><label><span className="sr-only">Maximum price in rupees</span><input type="number" min="0" placeholder="To ₹" value={params.has('maxPriceCents') ? Number(params.get('maxPriceCents')) / 100 : ''} onChange={(event) => update('maxPriceCents', event.target.value ? String(Math.round(Number(event.target.value) * 100)) : '')} /></label></div>
      {loading ? <ProductGridSkeleton /> : error ? <p className="catalog-error" role="alert">{error}</p> : result.products.length ? <div className="product-grid">{result.products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyState eyebrow="A quieter search" title="No pieces found." message="Try another term or clear a filter to see more of the collection." actionLabel="Clear filters" actionHref="/shop" />}
      {result.pagination?.pages > 1 && <nav className="pagination" aria-label="Catalog pages"><button disabled={result.pagination.page <= 1} onClick={() => update('page', String(result.pagination.page - 1))}>Previous</button><span>Page {result.pagination.page} of {result.pagination.pages}</span><button disabled={result.pagination.page >= result.pagination.pages} onClick={() => update('page', String(result.pagination.page + 1))}>Next</button></nav>}
    </div>
  )
}
