import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProduct, getProducts } from '../api/client.js'
import { formatCurrency } from '../lib/format.js'
import ProductCard from '../components/catalog/ProductCard.jsx'
import ProductGridSkeleton from '../components/catalog/ProductGridSkeleton.jsx'
import Button from '../components/ui/Button.jsx'

export default function ProductPage() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imageIndex, setImageIndex] = useState(0)
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setImageIndex(0)
    setRelated([])
    getProduct(slug).then(async ({ product: item }) => {
      if (!active) return
      setProduct(item)
      const firstAvailable = item.variants.find((variant) => variant.stock > 0) ?? item.variants[0]
      setSize(firstAvailable?.size ?? '')
      setColor(firstAvailable?.color ?? '')
      if (item.category?.slug) {
        try {
          const { products } = await getProducts({ category: item.category.slug, limit: 5 })
          if (active) setRelated(products.filter((candidate) => candidate.id !== item.id).slice(0, 4))
        } catch { /* Related pieces are optional when the catalog is unavailable. */ }
      }
    }).catch((requestError) => active && setError(requestError.message || 'This piece could not be found.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [slug])

  const sizes = useMemo(() => [...new Set(product?.variants.map((variant) => variant.size) ?? [])], [product])
  const colors = useMemo(() => [...new Set(product?.variants.map((variant) => variant.color) ?? [])], [product])
  const selectedVariant = product?.variants.find((variant) => variant.size === size && variant.color === color)
  const availableImages = product?.images ?? []

  function selectColor(nextColor) {
    setColor(nextColor)
    const matchingSize = product.variants.find((variant) => variant.color === nextColor && variant.size === size && variant.stock > 0)
      ?? product.variants.find((variant) => variant.color === nextColor && variant.stock > 0)
    if (matchingSize) setSize(matchingSize.size)
    setQuantity(1)
  }

  function chooseSize(nextSize) {
    setSize(nextSize)
    const match = product.variants.find((variant) => variant.size === nextSize && variant.color === color && variant.stock > 0)
      ?? product.variants.find((variant) => variant.size === nextSize && variant.stock > 0)
    if (match) setColor(match.color)
    setQuantity(1)
  }

  if (loading) return <div className="product-loading page-width" aria-busy="true"><div className="skeleton product-loading__image" /><div><div className="skeleton" style={{ width: '40%', height: 12 }} /><div className="skeleton" style={{ width: '80%', height: 42, marginTop: 20 }} /><div className="skeleton" style={{ width: '30%', height: 18, marginTop: 18 }} /></div></div>
  if (error || !product) return <section className="notice-page page-width"><p className="eyebrow">The collection</p><h1 className="display-title">We couldn't find that piece.</h1><p className="body-copy">{error || 'Try browsing the current collection.'}</p><Button as={Link} to="/shop">Browse all pieces</Button></section>

  return (
    <>
      <div className="product-detail page-width">
        <section className="product-gallery" aria-label={`${product.name} images`}>
          <div className="product-gallery__main">{availableImages[imageIndex] ? <img src={availableImages[imageIndex].url} alt={availableImages[imageIndex].alt || product.name} /> : <div className="product-gallery__placeholder" />}</div>
          {availableImages.length > 1 && <div className="product-gallery__thumbs" role="group" aria-label="Choose product image">{availableImages.map((image, index) => <button type="button" key={image.id} className={index === imageIndex ? 'is-selected' : ''} aria-label={`View image ${index + 1}`} aria-pressed={index === imageIndex} onClick={() => setImageIndex(index)}><img src={image.url} alt="" loading="lazy" /></button>)}</div>}
        </section>

        <section className="product-info">
          <p className="eyebrow"><Link to={`/shop?category=${product.category.slug}`}>{product.category.name}</Link> · FitCheck studio</p>
          <h1 className="display-title">{product.name}</h1>
          <p className="product-info__price">{product.priceCents == null ? 'Unavailable' : formatCurrency(product.priceCents)}</p>
          <p className="body-copy product-info__description">{product.description}</p>
          <p className={`availability ${product.inStock ? 'availability--available' : 'availability--soldout'}`}><span />{product.inStock ? 'Available now' : 'Currently sold out'}</p>

          {colors.length > 0 && <fieldset className="variant-field"><legend>Colour <span>{color}</span></legend><div className="variant-options variant-options--colors">{colors.map((option) => {
            const available = product.variants.some((variant) => variant.color === option && variant.stock > 0)
            return <button type="button" key={option} disabled={!available} aria-pressed={color === option} className={`color-option ${color === option ? 'is-selected' : ''}`} onClick={() => selectColor(option)}>{option}</button>
          })}</div></fieldset>}

          {sizes.length > 0 && <fieldset className="variant-field"><legend>Size <span>{size}</span></legend><div className="variant-options">{sizes.map((option) => {
            const available = product.variants.some((variant) => variant.size === option && variant.color === color && variant.stock > 0)
            return <button type="button" key={option} disabled={!available} aria-pressed={size === option} className={size === option ? 'is-selected' : ''} onClick={() => chooseSize(option)}>{option}</button>
          })}</div></fieldset>}

          <div className="product-purchase"><label className="quantity-control"><span className="sr-only">Quantity</span><button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button><span aria-live="polite">{quantity}</span><button type="button" aria-label="Increase quantity" disabled={!selectedVariant || quantity >= selectedVariant.stock} onClick={() => setQuantity((value) => Math.min(selectedVariant?.stock ?? 1, value + 1))}>+</button></label><Button disabled title="Shopping bag is being connected">Add to bag</Button></div>
          <p className="body-copy product-info__bag-note" aria-live="polite">{selectedVariant ? `${selectedVariant.stock} available in ${selectedVariant.size} / ${selectedVariant.color}` : 'Choose an available size and colour.'}</p>

          <div className="product-accordions">
            <details open><summary>About this piece</summary><p>{product.details || product.description}</p></details>
            {product.material && <details><summary>Fabric & care</summary><p>{product.material}{product.care ? ` ${product.care}` : ''}</p></details>}
            <details><summary>Shipping & returns</summary><p>Complimentary delivery on orders over ₹5,000. We accept returns on unworn pieces within 14 days of delivery.</p></details>
          </div>
        </section>
      </div>

      {related.length > 0 && <section className="related-section page-width"><div className="section-heading"><div><p className="eyebrow">In good company</p><h2 className="section-title">You may also like.</h2></div></div><div className="product-grid">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
    </>
  )
}
