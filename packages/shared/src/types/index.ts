import type { Database } from '../database.types'

// ── Table row types ──
export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export type Banner = Database['public']['Tables']['banners']['Row']
export type BannerInsert = Database['public']['Tables']['banners']['Insert']
export type BannerUpdate = Database['public']['Tables']['banners']['Update']

export type Order = Database['public']['Tables']['orders']['Row']
export type OrderInsert = Database['public']['Tables']['orders']['Insert']
export type OrderUpdate = Database['public']['Tables']['orders']['Update']

export type Coupon = Database['public']['Tables']['coupons']['Row']
export type CouponInsert = Database['public']['Tables']['coupons']['Insert']

export type CartItem = Database['public']['Tables']['cart_items']['Row']
export type CartItemInsert = Database['public']['Tables']['cart_items']['Insert']

export type WishlistItem = Database['public']['Tables']['wishlist_items']['Row']
export type WishlistItemInsert = Database['public']['Tables']['wishlist_items']['Insert']

export type Address = Database['public']['Tables']['addresses']['Row']
export type AddressInsert = Database['public']['Tables']['addresses']['Insert']
export type AddressUpdate = Database['public']['Tables']['addresses']['Update']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Subscriber = Database['public']['Tables']['subscribers']['Row']

// ── Cart types (Zustand) ──
export interface CartItemLocal {
  productId: string
  name: string
  slug: string
  price: number
  compareAtPrice: number | null
  image: string
  quantity: number
  stock: number
}

// ── Order item (stored in orders.items JSONB) ──
export interface OrderItem {
  productId: string
  name: string
  slug: string
  price: number
  quantity: number
  image: string
}

// ── Shipping address (stored in orders.shipping_address JSONB) ──
export interface ShippingAddress {
  name: string
  phone: string
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
}

// ── Order timeline event ──
export interface TimelineEvent {
  status: string
  timestamp: string
  note?: string
}

// ── Payment types ──
export interface PaymentInitiateRequest {
  orderId: string
  amount: number
  redirectUrl: string
  callbackUrl: string
  customerPhone: string
  customerEmail?: string
}

export interface PaymentInitiateResponse {
  success: boolean
  paymentUrl?: string
  qrCodeBase64?: string
  transactionId?: string
  error?: string
}

export interface PaymentCallbackPayload {
  code: string
  merchantId: string
  merchantTransactionId: string
  transactionId: string
  amount: number
  state: 'COMPLETED' | 'FAILED' | 'PENDING'
  responseCode: string
  paymentInstrument: {
    type: string
    utr?: string
    cardNetwork?: string
    accountType?: string
  }
}

// ── Coupon validation ──
export interface CouponValidateRequest {
  code: string
  subtotal: number
}

export interface CouponValidateResponse {
  valid: boolean
  discount: number
  discountType?: 'flat' | 'percent'
  discountValue?: number
  error?: string
}

// ── API response wrapper ──
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// ── Auth types ──
export interface AuthUser {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  role: 'customer' | 'owner'
}

// ── Admin dashboard metrics ──
export interface DashboardMetrics {
  todayRevenue: number
  weekRevenue: number
  monthOrders: number
  lowStockCount: number
}

export interface DailyRevenue {
  date: string
  revenue: number
}

// ── Filter types ──
export interface ProductFilters {
  category?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'name_asc'
  page?: number
  search?: string
}

// ── Indian states ──
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
] as const

export type IndianState = typeof INDIAN_STATES[number]
