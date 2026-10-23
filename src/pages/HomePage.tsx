import { ArrowRight, ArrowUpRight, BookOpen, Check, ExternalLink, Heart, Leaf, MessageCircle, PencilRuler, ShoppingBag } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useCatalog } from '../contexts/CatalogContext'
import { useWishlist } from '../contexts/WishlistContext'
import { useToast } from '../contexts/ToastContext'
import type { Category } from '../types/category'
import type { Product } from '../types/product'
import { formatPKR } from '../utils/money'
import { usePageMeta } from '../hooks/usePageMeta'
import { useI18n } from '../i18n/LocaleContext'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { HeroSlider } from '../components/home/HeroSlider'
import { NewsletterSignup } from '../components/home/NewsletterSignup'

const categoryEditorialImages: Record<string, string> = {
  journals: '/images/linen-journal.webp',
  planners: '/images/daily-planner.webp',
  notebooks: '/images/study-notebook.webp',
}

const faqs = [
  { question: 'Is this a live catalog?', answer: 'No. Paperloom is presented as a demo storefront while sourcing and business arrangements are being confirmed.' },
  { question: 'Can I place an order?', answer: 'No. Checkout is a demonstration only. No payment, order or delivery request is submitted.' },
  { question: 'Are the listed items available?', answer: 'Product listings, prices and availability are sample data and do not represent confirmed inventory.' },
]

const valueCards = [
  { icon: Leaf, title: 'Clear about the catalog', description: 'Sample prices, details and availability are marked as demo content.' },
  { icon: Check, title: 'Made for real routines', description: 'The visual direction can grow beyond the current category set.' },
  { icon: PencilRuler, title: 'Support when it is confirmed', description: 'Verified contact details are not configured yet. We will not invent them.' },
]

export function HomePage() {
  const { t } = useI18n()
  const { products, categories, status, error, mode } = useCatalog()
  const homeRef = useScrollReveal<HTMLDivElement>()
  usePageMeta(t('Make space for your ideas.'), t('Considered goods for everyday routines, creative ideas and the spaces they share.'))

  const demoProducts = products.filter((product) => product.isPublished && product.availabilityStatus === 'demo')
  const orderedProducts = [...products].filter((product) => product.isPublished).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  const featuredProducts = mode === 'demo' ? demoProducts.slice(0, 4) : (orderedProducts.filter((product) => product.isFeatured).length ? orderedProducts.filter((product) => product.isFeatured) : orderedProducts).slice(0, 4)
  const newArrivals = orderedProducts.slice(0, 4)
  const currentFaqs = mode === 'demo' ? faqs : [
    { question: 'Is this a live catalog?', answer: 'Product and category listings are read from our live catalog. Availability is shown separately from publication.' },
    { question: 'Can I place an order?', answer: 'No. Checkout is still a demonstration only. No payment, order or delivery request is submitted.' },
    { question: 'Are listed items available?', answer: 'Availability is based on real-time public stock status and updated regularly.' },
  ]

  return (
    <div ref={homeRef} className="home-page">
      <HeroSlider />

      <aside className="home-demo-note" role="note">
        <strong>{t(mode === 'demo' ? 'Demo mode.' : mode === 'supabase' ? 'Live catalog.' : 'Catalog unavailable.')}</strong>
        <span>{t(mode === 'demo' ? 'Current listings are sample catalog content; no order, payment or delivery request is sent.' : mode === 'supabase' ? 'Products and categories are live. Checkout remains a demo and no order, payment or delivery request is sent.' : 'Catalog is currently undergoing maintenance. Please check back soon.')}</span>
      </aside>

      <section className="home-section home-categories" aria-labelledby="home-categories-title">
        <div className="home-section__heading">
          <div>
            <span className="home-eyebrow">{t('Choose your way in.')}</span>
            <h2 id="home-categories-title">{t('Small things, big ideas.')}</h2>
            <p>{t('A few useful starting points for different kinds of days.')}</p>
          </div>
          <Link className="home-text-link" to="/categories">{t('View all collections')} <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="home-category-grid">
          {categories.map((category) => <HomeCategoryCard key={category.id} category={category} />)}
          {status === 'ready' && categories.length === 0 && <p className="home-empty-note">{t('No active categories have been published yet.')}</p>}
        </div>
      </section>

      <section className="home-section home-products" aria-labelledby="featured-products-title">
        <div className="home-section__heading">
          <div>
            <span className="home-eyebrow">{t(mode === 'demo' ? 'Featured sample pieces' : 'Featured products')}</span>
            <h2 id="featured-products-title">{t('A few things for the everyday.')}</h2>
            <p>{t(mode === 'demo' ? 'Demo listings from the current catalog. Details and availability are not confirmed.' : 'Published products from the active catalog.')}</p>
          </div>
          <Link className="home-text-link" to="/shop">{t('Browse the catalog')} <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="home-product-grid">
          {status === 'error' && <p className="home-empty-note" role="alert">{t(error || 'The catalog could not be loaded.')}</p>}
          {status === 'ready' && featuredProducts.map((product) => <HomeProductCard key={product.id} product={product} />)}
          {status === 'ready' && featuredProducts.length === 0 && <p className="home-empty-note">{t('No products have been published yet.')}</p>}
        </div>
      </section>

      <section className="home-editorial home-editorial--sage shine-surface" aria-labelledby="study-edit-title">
        <div className="home-editorial__media">
          <img src="/images/study-kit.webp" alt={t('A sample study kit with pens, notes and page markers on a warm desk')} loading="lazy" />
          <span className="home-editorial__stamp">{t('A sample study edit · demo only')}</span>
        </div>
        <div className="home-editorial__copy">
          <span className="home-eyebrow">{t('The study desk, considered.')}</span>
          <h2 id="study-edit-title">{t('A little ritual for a clearer day.')}</h2>
          <p>{t('Gather the simple tools that help a thought settle: a fresh page, a reliable pen and room to begin.')}</p>
          <ul className="home-check-list">
            <li><Check size={16} aria-hidden="true" /> {t('Sample study essentials')}</li>
            <li><Check size={16} aria-hidden="true" /> {t('No stock or vendor is implied')}</li>
            <li><Check size={16} aria-hidden="true" /> {t('A starting point for the catalog')}</li>
          </ul>
          <Link className="home-button home-button--dark" to="/categories/study-kits">{t('Explore study kits')} <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="home-section home-arrivals" aria-labelledby="new-arrivals-title">
        <div className="home-section__heading">
          <div>
            <span className="home-eyebrow">{t(mode === 'demo' ? 'New in the demo catalog' : 'Recently published')}</span>
            <h2 id="new-arrivals-title">{t(mode === 'demo' ? 'Recently dated sample listings.' : 'The latest additions.')}</h2>
            <p>{t(mode === 'demo' ? 'Recently dated sample listings, shown for the browsing experience only.' : 'Recently published items in the live catalog.')}</p>
          </div>
          <Link className="home-text-link" to="/shop">{t('Browse the catalog')} <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="home-product-grid home-product-grid--arrivals">
          {status === 'ready' && newArrivals.map((product) => <HomeProductCard key={product.id} product={product} />)}
        </div>
      </section>

      <section className="home-section home-curated" aria-labelledby="curated-title">
        <div className="home-section__heading">
          <div>
            <span className="home-eyebrow">{t('Curated by the way you work.')}</span>
            <h2 id="curated-title">{t('Three ways to begin.')}</h2>
            <p>{t('Three sample edits from the current catalog, ready to explore.')}</p>
          </div>
        </div>
        <div className="home-curated-grid">
          {categories.slice(0, 3).map((category) => (
            <Link className="home-curated-card shine-surface" to={`/categories/${category.slug}`} key={category.id}>
              {categoryEditorialImages[category.id] || category.image ? <img src={categoryEditorialImages[category.id] || category.image} alt={`${t(category.name)} ${t('category collection')}`} loading="lazy" /> : <span className="home-curated-card__fallback">{t(category.name)}</span>}
              <span className="home-curated-card__overlay"><span>{t(category.name)}</span><ArrowUpRight size={17} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-editorial home-editorial--journal shine-surface" aria-labelledby="journal-edit-title">
        <div className="home-editorial__copy">
          <span className="home-eyebrow">{t('A page of your own')}</span>
          <h2 id="journal-edit-title">{t('Write it down. See where it goes.')}</h2>
          <p>{t('A notebook can hold a plan, a question or the next small idea. The catalog shown here is a demo.')}</p>
          <Link className="home-text-link" to="/categories/notebooks">{t('Find a notebook')} <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="home-editorial__media">
          <img src="/images/linen-journal.webp" alt={t('A linen-style journal and fountain pen on a cream surface')} loading="lazy" />
        </div>
      </section>

      <section className="home-values" aria-labelledby="values-title">
        <div className="home-values__intro">
          <span className="home-eyebrow">{t('What matters to us')}</span>
          <h2 id="values-title">{t('Useful, above all.')}</h2>
        </div>
        {valueCards.map(({ icon: Icon, title, description }) => (
          <article className="home-value-card" key={title}>
            <span className="home-value-card__icon"><Icon size={19} aria-hidden="true" /></span>
            <h3>{t(title)}</h3>
            <p>{t(description)}</p>
          </article>
        ))}
      </section>

      <NewsletterSignup />

      <section className="home-support" aria-labelledby="support-title">
        <div className="home-support__icon" aria-hidden="true"><MessageCircle size={22} /></div>
        <div>
          <span className="home-eyebrow">{t('Clear answers, when you need them.')}</span>
          <h2 id="support-title">{t('Questions before you browse?')}</h2>
          <p>{t('Find clear answers about the demo, sample catalog and what is not connected yet.')}</p>
        </div>
        <div className="home-support__actions">
          <Link className="home-button home-button--dark" to="/faq">{t('Read the demo FAQ')} <ArrowRight size={15} aria-hidden="true" /></Link>
          <Link className="home-text-link" to="/contact">{t('Open contact page')} <ExternalLink size={15} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="home-faq" aria-labelledby="home-faq-title">
        <div className="home-section__heading">
          <div>
            <span className="home-eyebrow">{t('Helpful notes')}</span>
            <h2 id="home-faq-title">{t('Good to know.')}</h2>
          </div>
          <Link className="home-text-link" to="/faq">{t('Read the demo FAQ')} <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="home-faq__items">
          {currentFaqs.map((faq) => (
            <details className="home-faq__item" key={faq.question}>
              <summary>{t(faq.question)}<span aria-hidden="true">+</span></summary>
              <p>{t(faq.answer)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

function HomeCategoryCard({ category }: { category: Category }) {
  const { t } = useI18n()
  const [failed, setFailed] = useState(false)
  const name = t(category.name)
  return (
    <Link to={`/categories/${category.slug}`} className="home-category-card shine-surface">
      <div className="home-category-card__image">
        {failed || !category.image ? <div className="home-image-fallback" role="img" aria-label={name}><BookOpen size={28} aria-hidden="true" /><span>{name}</span></div> : <img src={category.image} alt={`${name} ${t('category collection')}`} loading="lazy" onError={() => setFailed(true)} />}
        <span className="home-category-card__arrow"><ArrowUpRight size={17} aria-hidden="true" /></span>
      </div>
      <span className="home-eyebrow">{t(category.eyebrow ?? 'Collection')}</span>
      <h3>{name}</h3>
      <p>{t(category.description)}</p>
    </Link>
  )
}

function HomeProductCard({ product }: { product: Product }) {
  const { t } = useI18n()
  const { mode } = useCatalog()
  const navigate = useNavigate()
  const { add } = useCart()
  const { has, toggle } = useWishlist()
  const { push } = useToast()
  const [failed, setFailed] = useState(false)
  const [adding, setAdding] = useState(false)
  const addLock = useRef(false)
  const name = t(product.name)
  const saved = has(product.id)
  const canAdd = product.isPublished && product.variants.length === 0 && product.availabilityStatus !== 'out-of-stock' && product.availabilityStatus !== 'unavailable'
  const availability = product.availabilityStatus === 'demo' ? t('Demo listing · not verified') : product.availabilityStatus === 'available' ? t('In stock') : product.availabilityStatus === 'out-of-stock' ? t('Out of stock') : t('Availability not confirmed')
  const wishlistLabel = saved ? `${t('Remove from wishlist')} · ${name}` : `${t('Add to wishlist')} · ${name}`
  function handleAdd() {
    if (product.variants.length > 0) {
      navigate(`/products/${product.slug}`)
      return
    }
    if (addLock.current || !canAdd) return
    addLock.current = true
    setAdding(true)
    if (add(product, 1)) {
      push(t('Added to demo cart.'), 'success')
      window.setTimeout(() => { addLock.current = false; setAdding(false) }, 900)
    } else {
      addLock.current = false
      setAdding(false)
    }
  }

  return (
    <article className="home-product-card shine-surface">
      <div className="home-product-card__image-wrap">
        <Link to={`/products/${product.slug}`} className="home-product-card__image-link" aria-label={`${t('View')} ${name}`}>
          {failed || !product.images[0] ? <div className="home-image-fallback" role="img" aria-label={name}><BookOpen size={30} aria-hidden="true" /><span>{name}</span></div> : <img src={product.images[0]} alt={name} loading="lazy" onError={() => setFailed(true)} />}
        </Link>
        {mode === 'demo' && <span className="home-product-card__badge">{t('DEMO')}</span>}
        <button className="home-product-card__wishlist" type="button" onClick={() => { toggle(product.id); push(t(saved ? 'Removed from wishlist' : 'Added to wishlist'), 'success') }} aria-pressed={saved} aria-label={wishlistLabel}><Heart size={17} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" /></button>
      </div>
      <div className="home-product-card__body">
        <div className="home-product-card__title-row"><Link to={`/products/${product.slug}`} className="home-product-card__name">{name}</Link><span className="home-product-card__price">{formatPKR(product.price)}</span></div>
        <p className="home-product-card__description">{t(product.shortDescription)}</p>
        <div className="home-product-card__bottom"><span className="home-product-card__availability">{availability}</span><button type="button" className="home-product-card__add" onClick={handleAdd} disabled={product.availabilityStatus === 'out-of-stock' || product.availabilityStatus === 'unavailable' || adding} aria-busy={adding} aria-label={product.variants.length ? `${t('Choose options for')} ${name}` : `${t('Add')} ${name} ${t('to demo cart')}`}><ShoppingBag size={15} aria-hidden="true" /><span>{t(product.variants.length ? 'Choose options' : 'Add')}</span></button></div>
      </div>
    </article>
  )
}
