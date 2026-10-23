import { ArrowLeft, ArrowRight, Info } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../components/common/States'
import { CartItem } from '../components/cart/CartItem'
import { useCart } from '../contexts/CartContext'
import { useCatalog } from '../contexts/CatalogContext'
import { submitDemoOrder } from '../services/orders/orderService'
import type { CheckoutFormValues } from '../types/order'
import { usePageMeta } from '../hooks/usePageMeta'
import { validateCheckout, type CheckoutErrors } from '../utils/validation'
import { useI18n } from '../i18n/LocaleContext'
import { DELIVERY_FEE } from '../config/store'
import { formatPKR } from '../utils/money'
import { getCartLineUnitPrice, isCartLineAvailable } from '../utils/cart'

const emptyForm: CheckoutFormValues = { fullName: '', phone: '', city: '', address: '', email: '', instructions: '' }
const testValues: CheckoutFormValues = {
  fullName: 'Demo Customer', phone: '0300 000 0000', city: 'Test City', address: 'Demo checkout address — not a delivery location.', email: 'demo@example.invalid', instructions: 'Test data only.',
}

function DemoNotice({ t, mode }: { t: (english: string) => string; mode: 'supabase' | 'demo' | 'unconfigured' }) {
  const copy = mode === 'supabase' ? 'Catalog items and prices are read from Supabase. Checkout is still a demonstration and never submits an order.' : mode === 'demo' ? 'Sample prices, descriptions and availability are not a live offer. Checkout does not submit an order.' : 'No catalog is configured, no mock products are shown, and no order can be submitted.'
  return <div className="demo-notice" role="note"><Info size={16} aria-hidden="true" /><span><strong>{t(mode === 'demo' ? 'Demo mode.' : mode === 'supabase' ? 'Live catalog, demo checkout.' : 'Catalog not configured.')}</strong> {t(copy)}</span></div>
}

function LocalizedOrderSummary({ subtotal, label, mode }: { subtotal: number; label: string; mode: 'supabase' | 'demo' | 'unconfigured' }) {
  const { t } = useI18n()
  const total = subtotal + (DELIVERY_FEE ?? 0)
  return <section className="order-summary" aria-label={label}><h2>{label}</h2><div className="order-summary__row"><span>{t('Item subtotal')} {mode === 'demo' && <small>{t('sample prices')}</small>}</span><strong>{formatPKR(subtotal)}</strong></div><div className="order-summary__row"><span>{t('Delivery fee')} <small>{t('not yet configured')}</small></span><strong>{DELIVERY_FEE === null ? t('To be confirmed') : formatPKR(DELIVERY_FEE)}</strong></div><div className="order-summary__total"><span>{t('Estimated total')}{DELIVERY_FEE === null ? ` ${t('before delivery')}` : ''}</span><strong>{formatPKR(total)}</strong></div><p>{t('Demonstration calculation only. No payment or delivery is arranged.')}</p></section>
}

export function CheckoutPage() {
  const { t } = useI18n()
  usePageMeta(t('Demo checkout'), t('Try the Paperloom checkout interface with clearly identified test data. Nothing is stored or submitted as a real order.'))
  const { lines, setQuantity, remove } = useCart()
  const { findProductById, status, error, mode } = useCatalog()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState<CheckoutFormValues>(emptyForm)
  const [errors, setErrors] = useState<CheckoutErrors>({})
  const subtotal = lines.reduce((sum, line) => sum + getCartLineUnitPrice(findProductById(line.productId), line) * line.quantity, 0)
  const checkoutEnabled = status === 'ready' && lines.length > 0 && lines.every((line) => isCartLineAvailable(findProductById(line.productId), line))
  if (status === 'loading' && lines.length > 0) return <div className="page-shell"><LoadingState label="Checking catalog items before the demo checkout…" /></div>
  if (status === 'error' && lines.length > 0) return <div className="page-shell"><ErrorState message={error || 'The catalog could not be loaded.'} /><Link className="back-link" to="/cart">{t('Return to demo cart')}</Link></div>
  if (lines.length === 0) return <div className="page-shell"><EmptyState title={t('Your demo cart is empty')} description={t('Add a sample listing before trying the demo checkout.')} actionLabel={t('Browse demo listings')} /></div>
  if (!checkoutEnabled) return <div className="page-shell"><EmptyState title={t('Some cart items are unavailable')} description={t('Remove unpublished or unavailable items to continue the demonstration checkout.')} actionLabel={t('Review demo cart')} actionHref="/cart" /></div>
  function setField(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }
  function fieldError(name: keyof CheckoutFormValues) {
    return errors[name] ? <span className="field-error" id={`${name}-error`}>{t(errors[name] as string)}</span> : null
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateCheckout(form, lines.length > 0)
    setErrors(result)
    if (Object.keys(result).length) {
      const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]')
      firstInvalid?.focus()
      return
    }
    const response = submitDemoOrder({ items: lines, form, mode: 'demo' })
    navigate('/order-confirmation', { state: { message: response.message, from: location.pathname } })
  }
  return <div className="page-shell checkout-page"><Link to="/cart" className="back-link"><ArrowLeft size={15} /> {t('Back to demo cart')}</Link><div className="page-heading"><span className="eyebrow">{t('A checkout walkthrough')}</span><h1>{t('Try the')} <em>{t('demo flow.')}</em></h1><p>{t('Use the prefilled test values to explore validation without entering real personal details.')}</p></div><DemoNotice t={t} mode={mode} /><div className="checkout-layout"><form className="checkout-form" onSubmit={submit} noValidate>
    <div className="checkout-form__section-head"><div><span className="eyebrow">{t('01 · Test details')}</span><h2>{t('For the demonstration')}</h2></div><button className="text-link text-button" type="button" onClick={() => { setForm(testValues); setErrors({}) }}>{t('Fill clearly marked test data')}</button></div>
    <div className="test-data-note"><Info size={17} /><p>{t('The values inserted by this button are fictional test values, not a delivery destination. Form data stays in memory only and is never transmitted or saved.')}</p></div>
    <div className="form-grid"><div className="form-field"><label htmlFor="fullName">{t('Full name')} <span>{t('Required')}</span></label><input id="fullName" name="fullName" autoComplete="name" value={form.fullName} onChange={setField} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'fullName-error' : undefined} />{fieldError('fullName')}</div>
    <div className="form-field"><label htmlFor="phone">{t('Pakistani mobile number')} <span>{t('Required')}</span></label><input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="03xx xxx xxxx" value={form.phone} onChange={setField} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'phone-error' : 'phone-help'} />{!errors.phone && <small id="phone-help">{t('Formats such as 03xx xxx xxxx or +92 3xx xxx xxxx.')}</small>}{fieldError('phone')}</div>
    <div className="form-field"><label htmlFor="city">{t('City')} <span>{t('Required')}</span></label><input id="city" name="city" autoComplete="address-level2" value={form.city} onChange={setField} aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? 'city-error' : undefined} />{fieldError('city')}</div>
    <div className="form-field"><label htmlFor="email">{t('Email')} <span>{t('Optional')}</span></label><input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={setField} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />{fieldError('email')}</div>
    <div className="form-field form-field--wide"><label htmlFor="address">{t('Complete delivery address')} <span>{t('Required for this demo form')}</span></label><textarea id="address" name="address" rows={3} autoComplete="street-address" value={form.address} onChange={setField} aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? 'address-error' : undefined} />{fieldError('address')}</div>
    <div className="form-field form-field--wide"><label htmlFor="instructions">{t('Delivery instructions')} <span>{t('Optional')}</span></label><textarea id="instructions" name="instructions" rows={2} value={form.instructions} onChange={setField} /></div></div>
    {errors.items && <p className="field-error">{t(errors.items)}</p>}<button className="button button--dark button--full checkout-submit" type="submit">{t('Continue demo checkout')} <ArrowRight size={16} /></button><p className="checkout-form__disclaimer">{t('This button does not place an order. It only demonstrates form validation and the confirmation screen.')}</p>
  </form><aside className="checkout-sidebar"><div className="checkout-order-card"><h2>{t('Demo items')}</h2><div className="checkout-mini-items">{lines.map((line, index) => <CartItem key={`${line.productId}-${line.variantId ?? 'default'}-${index}`} line={line} onQuantity={(quantity) => setQuantity(line.productId, line.variantId, quantity)} onRemove={() => remove(line.productId, line.variantId)} />)}</div><LocalizedOrderSummary subtotal={subtotal} label={t('Demo total')} mode={mode} /></div><div className="checkout-policy-note"><strong>{t('Business terms are not confirmed.')}</strong><p>{t('COD is disabled. Delivery fee, shipping timelines and returns remain launch placeholders.')}</p><Link to="/shipping">{t('Shipping note')}</Link><span> · </span><Link to="/returns">{t('Returns note')}</Link></div></aside></div></div>
}
