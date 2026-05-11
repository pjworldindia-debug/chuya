export const GST_RATE = 0.18

export const PRODUCTS_PER_PAGE = 12

export const CURRENCY_SYMBOL = '₹'

export const BRAND = {
  name: 'CHUYA',
  tagline: 'Luxury Handcrafted Indian Handbags',
  description: 'CHUYA is a luxury Indian handbag brand that celebrates the art of Indian craftsmanship. Each piece is meticulously handcrafted using the finest materials, blending traditional techniques with contemporary design.',
  email: 'hello@chuya.in',
  phone: '+91 98765 43210',
  instagram: 'https://instagram.com/chuya.in',
  whatsapp: 'https://wa.me/919876543210',
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
