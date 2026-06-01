import { z } from 'zod'

// ── Product schemas ──
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  description: z.string().nullable().optional().transform(v => v === '' ? null : v),
  price: z.number().positive('Price must be positive').multipleOf(0.01),
  compare_at_price: z.number().positive().multipleOf(0.01).nullable().optional(),
  category_id: z.union([z.string().uuid(), z.literal('')]).nullable().optional().transform(v => v === '' ? null : v),
  tags: z.array(z.string()).nullable().optional(),
  images: z.array(z.string().url()).nullable().optional(),
  stock: z.number().int().min(0, 'Stock cannot be negative').default(0),
  sku: z.string().nullable().optional().transform(v => v === '' ? null : v),
  is_featured: z.boolean().default(false),
  is_new_arrival: z.boolean().default(false),
  status: z.enum(['active', 'draft', 'archived']).default('draft'),
  material: z.string().nullable().optional().transform(v => v === '' ? null : v),
  dimensions: z.string().nullable().optional().transform(v => v === '' ? null : v),
  care_instructions: z.string().nullable().optional().transform(v => v === '' ? null : v),
  seo_title: z.string().max(70).nullable().optional().transform(v => v === '' ? null : v),
  seo_description: z.string().max(160).nullable().optional().transform(v => v === '' ? null : v),
  related_product_slugs: z.array(z.string()).nullable().optional(),
  color_variants: z.array(z.object({
    name: z.string().min(1, 'Color name is required'),
    url: z.string().min(1, 'Product URL is required')
  })).nullable().optional(),
})

export type ProductFormData = z.infer<typeof productSchema>

// ── Category schemas ──
export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  image_url: z.string().url().nullable().optional(),
  display_order: z.number().int().min(0).default(0),
})

export type CategoryFormData = z.infer<typeof categorySchema>

// ── Banner schemas ──
export const bannerSchema = z.object({
  image_url: z.string().url('Banner image URL is required'),
  secondary_image_url: z.string().url().nullable().optional().or(z.literal('')),
  video_url: z.string().url().nullable().optional().or(z.literal('')),
  position: z.enum(['hero', 'secondary', 'story']).default('hero'),
  title: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  cta_label: z.string().nullable().optional(),
  cta_url: z.string().nullable().optional(),
  text_color: z.enum(['light', 'dark']).default('light'),
  overlay_opacity: z.number().int().min(0).max(80).default(30),
  display_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(false),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
})

export type BannerFormData = z.infer<typeof bannerSchema>

// ── Address schemas ──
export const addressSchema = z.object({
  name: z.string().min(1, 'Full name is required').max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  line1: z.string().min(1, 'Address line 1 is required').max(200),
  line2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
  is_default: z.boolean().default(false),
})

export type AddressFormData = z.infer<typeof addressSchema>

// ── Auth schemas ──
export const signInSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type SignInFormData = z.infer<typeof signInSchema>

export const signUpSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number').optional().or(z.literal('')),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export type SignUpFormData = z.infer<typeof signUpSchema>

// ── Coupon validate schema ──
export const couponValidateSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').max(50).transform(val => val.toUpperCase()),
  subtotal: z.number().positive(),
})

export type CouponValidateData = z.infer<typeof couponValidateSchema>

// ── Newsletter subscriber ──
export const subscriberSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

export type SubscriberFormData = z.infer<typeof subscriberSchema>

// ── Order schemas ──
export const orderItemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  image: z.string(),
})

export const checkoutSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Cart is empty'),
  shipping_address: addressSchema,
  coupon_code: z.string().optional(),
})

export type CheckoutFormData = z.infer<typeof checkoutSchema>

// ── Coupon admin schema ──
export const couponSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50).transform(val => val.toUpperCase()),
  discount_type: z.enum(['flat', 'percent']),
  discount_value: z.number().positive('Discount must be positive'),
  min_order_value: z.number().min(0).default(0),
  max_uses: z.number().int().positive().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
})

export type CouponFormData = z.infer<typeof couponSchema>
