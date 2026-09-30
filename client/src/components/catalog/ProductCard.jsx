import { Link } from 'react-router-dom'
import { formatCurrency } from '../../lib/format.js'

export default function ProductCard({ product }) {
  const image = product.images?.[0]
  return (
    <article className="product-card">
      <Link className="product-card__image-wrap" to={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
        {image ? <img className="product-card__image" src={image.url} alt={image.alt || product.name} loading="lazy" /> : <div className="product-card__image" aria-hidden="true" />}
        {product.featured && <span className="product-card__badge">Editor's pick</span>}
      </Link>
      <div className="product-card__info">
        <div>
          <h3 className="product-card__name"><Link to={`/products/${product.slug}`}>{product.name}</Link></h3>
          <p className="product-card__category">{product.category?.name ?? 'FitCheck'}</p>
        </div>
        <p className="product-card__price">{product.priceCents == null ? 'Unavailable' : formatCurrency(product.priceCents)}</p>
      </div>
    </article>
  )
}
