import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getCategories, getProducts } from '../api/client.js'
import AnimatedProductGrid from '../components/catalog/AnimatedProductGrid.jsx'
import ProductGridSkeleton from '../components/catalog/ProductGridSkeleton.jsx'
import Button from '../components/ui/Button.jsx'

const campaignImage = 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=2000&q=85'

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getProducts({ featured: 'true', limit: 4 }), getCategories()])
      .then(([productData, categoryData]) => {
        if (!active) return
        setProducts(productData.products)
        setCategories(categoryData.categories)
      })
      .catch(() => active && setError('Our collection could not load just now. Please try again in a moment.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  return (
    <>
      <section className="home-hero">
        <img src={campaignImage} alt="A considered look from the FitCheck collection" fetchPriority="high" />
        <div className="home-hero__veil" />
        <div className="home-hero__content">
          <p className="eyebrow">The in-between season · 2026</p>
          <h1 className="display-title">A quieter kind<br />of statement.</h1>
          <p>Ease in the layers. Room in the silhouette.<br />Pieces made to find their way into your everyday.</p>
          <Button as={Link} to="/shop">Discover the collection <ArrowRight size={14} /></Button>
        </div>
        <span className="home-hero__index">01 / 03</span>
      </section>

      <section className="home-intro page-width">
        <p className="eyebrow">FitCheck · Wardrobe study no. 01</p>
        <p className="home-intro__statement">Getting dressed should feel like <em>coming home.</em><br />Good fabric. Honest proportions. Nothing extra.</p>
      </section>

      <section className="category-section page-width">
        <div className="section-heading"><div><p className="eyebrow">Find your rhythm</p><h2 className="section-title">A wardrobe, in chapters.</h2></div><Link className="text-link" to="/shop">View everything <ArrowRight size={14} /></Link></div>
        <div className="category-grid">
          {(categories.length ? categories.slice(0, 3) : [
            { name: 'Women', slug: 'women', imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80' },
            { name: 'Men', slug: 'men', imageUrl: 'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=900&q=80' },
            { name: 'Objects & layers', slug: 'objects', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80' },
          ]).map((category, index) => (
            <Link className={`category-card category-card--${index + 1}`} to={`/shop?category=${category.slug}`} key={category.slug}>
              <img src={category.imageUrl} alt="" loading="lazy" />
              <span className="category-card__label">{category.name}<ArrowRight size={15} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="featured-section">
        <div className="page-width">
          <div className="section-heading"><div><p className="eyebrow">Selected for the season</p><h2 className="section-title">Pieces in good company.</h2></div><Link className="text-link" to="/shop?featured=true">Shop the edit <ArrowRight size={14} /></Link></div>
          {loading ? <ProductGridSkeleton count={4} /> : error ? <p className="body-copy" role="alert">{error}</p> : products.length ? <AnimatedProductGrid products={products} /> : <p className="body-copy">New pieces are on their way. In the meantime, browse the full collection.</p>}
        </div>
      </section>

      <section className="editorial-banner">
        <div className="editorial-banner__image"><img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1300&q=85" alt="An easy silhouette in natural light" loading="lazy" /></div>
        <div className="editorial-banner__copy"><p className="eyebrow">The things we keep</p><h2 className="display-title">Less, but<br /><em>loved longer.</em></h2><p className="body-copy">We believe in a wardrobe with a point of view, built slowly and worn often. Start with the pieces that make getting dressed feel simple.</p><Button as={Link} to="/shop" variant="outline">Find your everyday</Button></div>
      </section>
    </>
  )
}
