import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/LocaleContext'
import { usePageMeta } from '../hooks/usePageMeta'

export function NotFoundPage() {
  const { t } = useI18n()
  usePageMeta(t('Page not found'), t('This Paperloom demo page could not be found. Explore the current sample collection instead.'))
  return <div className="page-shell not-found"><span className="not-found__icon"><Compass size={28} /></span><span className="eyebrow">404 · {t('Page not found')}</span><h1>{t('This page took')} <em>{t('a wrong turn.')}</em></h1><p>{t('We couldn’t find the page you were looking for. The demo collection is still here.')}</p><Link to="/shop" className="button button--dark"><ArrowLeft size={15} aria-hidden="true" /> {t('Back to the shop')}</Link></div>
}
