import { Router, type Request, type Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@chuya/shared/database.types'

import { cache } from '../utils/cache.js'

const router = Router()

let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient<Database>(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
    )
  }
  return _supabaseAdmin
}

/**
 * POST /api/coupons/validate
 * Validates a coupon code and returns the discount amount
 */
router.post('/validate', async (req: Request, res: Response) => {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const { code, subtotal } = req.body

    if (!code || typeof subtotal !== 'number') {
      res.status(400).json({ valid: false, error: 'Code and subtotal are required' })
      return
    }

    const upperCode = code.toUpperCase()
    const cacheKey = `coupon_${upperCode}`
    let coupon = cache.get<any>(cacheKey)

    if (!coupon) {
      const { data, error } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', upperCode)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        res.json({ valid: false, discount: 0, error: 'Coupon not found' })
        return
      }
      
      coupon = data
      cache.set(cacheKey, coupon, 5 * 60 * 1000) // cache for 5 minutes
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      res.json({ valid: false, discount: 0, error: 'Coupon has expired' })
      return
    }

    // Check usage limit
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      res.json({ valid: false, discount: 0, error: 'Coupon usage limit reached' })
      return
    }

    // Check minimum order value
    if (subtotal < coupon.min_order_value) {
      res.json({
        valid: false,
        discount: 0,
        error: `Minimum order value is ₹${coupon.min_order_value}`,
      })
      return
    }

    // Calculate discount
    let discount = 0
    if (coupon.discount_type === 'flat') {
      discount = coupon.discount_value
    } else if (coupon.discount_type === 'percent') {
      discount = Math.round((subtotal * coupon.discount_value) / 100)
    }

    // Cap discount at subtotal
    discount = Math.min(discount, subtotal)

    res.json({
      valid: true,
      discount,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
    })
  } catch (error) {
    console.error('Coupon validation error:', error)
    res.status(500).json({ valid: false, error: 'Internal server error' })
  }
})

export { router as couponRouter }
