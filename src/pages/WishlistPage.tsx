import { Heart, Info } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState } from '../components/common/States'
import { ProductGrid } from '../components/products/ProductGrid'
import { useCatalog } from '../contexts/CatalogContext'
import { useWishlist } from '../contexts/WishlistContext'
import { useI18n } from '../i18n/LocaleContext'
import { usePageMeta } from '../hooks/usePageMeta'
import type { Product } from '../types/product'

export function WishlistPage() {
  const { t } = useI18n()
  const { ids } = useWishlist()
  const { findProductById, status, error, mode } = useCatalog()
  usePageMeta(t('Wishlist'), t('Saved product identifiers stay in this browser only; product details come from the current catalog.'))
  const products = ids.map((id) => findProductById(id)).filter((product): product is Product => Boolean(product))
  const notice = mode === 'demo' ? 'Wishlist identifiers stay in this browser; sample product details are not live offers.' : mode === 'supabase' ? 'Wishlist identifiers stay in this browser only. Product details are read from Supabase.' : 'The catalog is not configured. No mock products are displayed, and saved identifiers are not sent anywhere.'
  return <div className="page-shell wishlist-page"><div className="page-heading"><span className="eyebrow"><Heart size={14} /> {t('Your saved pages')}</span><h1>{t('A little list of')} <em>{t('maybes.')}</em></h1><p>{t('Saved product identifiers remain in this browser. No account data is written here.')}</p></div><div className="demo-notice demo-notice--compact" role="note"><Info size={16} aria-hidden="true" /><span>{t(notice)}</span></div>{status === 'loading' && <LoadingState label="Loading saved products…" />}{status === 'error' && <ErrorState message={error || 'The catalog could not be loaded.'} />}{status === 'unconfigured' && <ErrorState message="Supabase is not configured. No mock wishlist products were loaded." />}{status === 'ready' && (products.length ? <ProductGrid products={products} /> : <EmptyState title="Nothing saved just yet" description="Tap the heart on an active catalog listing to keep its identifier in this browser." actionLabel="Explore the collection" actionHref="/shop" />)}</div>
}
