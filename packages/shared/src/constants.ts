export const GST_RATE = 0.18

export const PRODUCTS_PER_PAGE = 12

export const CURRENCY_SYMBOL = '₹'

export const BRAND = {
  name: 'CHUYA',
  tagline: 'Luxury Handcrafted Indian Handbags',
  description: 'Crafted in 2025, Chuya was born out of a passion for premium accessories. From stunning evening clutches to high-end handbags, our focus is on delivering unique masterpieces that set you apart. Discover the world of Chuya—where every stitch tells a story of luxury.',
  email: 'chuya.co.in@gmail.com',
  address: 'Chuya, Station road dalauda 458667 Indore, M.P., India',
  instagram: 'https://www.instagram.com/chuya_pj?igsh=MTBtMnpsc2Q1Njczaw==',
  whatsapp: '918889008998',
} as const

export const COLORS = {
  cream: '#F8F5F0',
  chuya: '#1A1A1A',
  taupe: '#C9B99A',
  muted: '#8A8A8A',
  white: '#FFFFFF',
  phonepe: '#5F259F',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
} as const

export const ESTIMATED_DELIVERY_DAYS = 5

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim()
}

export function getEstimatedDeliveryDate(orderDate: Date): Date {
  const delivery = new Date(orderDate)
  let businessDays = ESTIMATED_DELIVERY_DAYS
  while (businessDays > 0) {
    delivery.setDate(delivery.getDate() + 1)
    const dayOfWeek = delivery.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays--
    }
  }
  return delivery
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}
