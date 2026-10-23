export const DEMO_MODE = true as const
export const COD_ENABLED = false as const

/** Set to a verified numeric fee only after delivery terms are confirmed; null means not configured. */
export const DELIVERY_FEE: number | null = null

/** Keep blank until a genuine, business-controlled WhatsApp number is configured. */
export const WHATSAPP_NUMBER = ''
export const STORE_NAME = 'Paperloom'
export const STORE_CURRENCY = 'PKR' as const
export const ANNOUNCEMENT_TEXT = ''
/** Configure only after verifying genuine, business-controlled contact details. */
export const STORE_CONTACT = { email: '', phone: '', address: '' } as const
/** Social URLs stay blank until genuine business-controlled profiles are supplied. */
export const SOCIAL_LINKS: { label: 'Facebook' | 'Instagram' | 'TikTok' | 'WhatsApp'; href: string }[] = [
  { label: 'Facebook', href: '' },
  { label: 'Instagram', href: '' },
  { label: 'TikTok', href: '' },
  { label: 'WhatsApp', href: '' },
]

export const DEMO_DATA_NOTICE = 'Demo data — sample prices, descriptions and availability are not a live offer.'
