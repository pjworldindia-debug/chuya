import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@chuya/shared/database.types'

const router = Router()

const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// PhonePe V2 Credentials
const PHONEPE_MERCHANT_ID = (process.env.PHONEPE_MERCHANT_ID || '').trim()
const PHONEPE_CLIENT_ID = (process.env.PHONEPE_CLIENT_ID || '').trim()
const PHONEPE_CLIENT_SECRET = (process.env.PHONEPE_CLIENT_SECRET || '').trim()
const PHONEPE_ENV = (process.env.PHONEPE_ENV || 'production').trim()

const IS_PROD = PHONEPE_ENV === 'production'

const URLS = {
  token: IS_PROD 
    ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token' 
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token',
  checkout: IS_PROD 
    ? 'https://api.phonepe.com/apis/pg/checkout/v2/pay' 
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay',
  status: IS_PROD 
    ? 'https://api.phonepe.com/apis/pg/v3/transaction' 
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v3/transaction'
}

/**
 * Get PhonePe OAuth Token (V2)
 */
async function getPhonePeToken() {
  const params = new URLSearchParams()
  params.append('client_id', PHONEPE_CLIENT_ID)
  params.append('client_secret', PHONEPE_CLIENT_SECRET)
  params.append('client_version', '1')
  params.append('grant_type', 'client_credentials')

  const res = await fetch(URLS.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  })
  
  const data = await res.json()
  if (!res.ok || !data.access_token) {
    throw new Error('OAuth failed: ' + JSON.stringify(data))
  }
  return data.access_token
}

/**
 * POST /api/payment/initiate
 * Creates a PhonePe payment (V2) and returns the redirect URL
 */
router.post('/initiate', async (req: Request, res: Response) => {
  try {
    const {
      orderId, amount, items, shippingAddress, userId,
      couponCode, subtotal, gst, discount,
      redirectUrl, callbackUrl, customerPhone, customerEmail,
    } = req.body

    if (!orderId || !amount || !items || !shippingAddress) {
      res.status(400).json({ success: false, error: 'Missing required fields' })
      return
    }

    // Create order in database
    const { error: orderError } = await supabaseAdmin.from('orders').insert({
      id: orderId,
      user_id: userId || null,
      guest_email: customerEmail || null,
      items,
      shipping_address: shippingAddress,
      subtotal,
      gst,
      discount: discount || 0,
      coupon_code: couponCode || null,
      total: amount,
      payment_status: 'pending',
      fulfilment_status: 'placed',
      timeline: [{ status: 'placed', timestamp: new Date().toISOString(), note: 'Order placed' }],
    })

    if (orderError) {
      console.error('Order creation error:', orderError)
      res.status(500).json({ success: false, error: 'Failed to create order' })
      return
    }

    // Increment coupon used_count if applicable
    if (couponCode) {
      await supabaseAdmin.rpc('increment_coupon_used', { coupon_code: couponCode }).catch(() => {
        console.warn('Failed to increment coupon usage')
      })
    }

    // Get Auth Token
    const accessToken = await getPhonePeToken()
    const amountInPaise = Math.round(amount * 100)

    const payload = {
      merchantOrderId: orderId,
      amount: amountInPaise,
      paymentFlow: {
        type: 'PG_CHECKOUT',
        message: `Order ${orderId.slice(0, 8)}`,
        merchantUrls: {
          redirectUrl: `${redirectUrl}/${orderId}`, // User goes here after payment
          callbackUrl: callbackUrl // Server-to-server webhook (optional in V2 if we use status check)
        }
      }
    }

    console.log('--- PHONEPE V2 INITIATE ---')
    console.log('Payload:', payload)

    const response = await fetch(URLS.checkout, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `O-Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    })
    
    const phonePeData = await response.json()
    console.log('PhonePe Response:', phonePeData)

    if (phonePeData.redirectUrl) {
      res.json({
        success: true,
        paymentUrl: phonePeData.redirectUrl,
        transactionId: orderId, // V2 maps orderId directly
      })
    } else {
      console.error('PhonePe error:', phonePeData)
      res.status(400).json({
        success: false,
        error: phonePeData.message || 'Payment initiation failed',
      })
    }
  } catch (error) {
    console.error('Payment initiation error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

/**
 * GET /api/payment/status/:orderId
 * Safely checks PhonePe V2 status and updates the database
 */
router.get('/status/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params

    if (!orderId) {
      res.status(400).json({ success: false, error: 'Order ID required' })
      return
    }

    const accessToken = await getPhonePeToken()
    
    // Status endpoint: /apis/pg/v3/transaction/{merchantId}/{merchantOrderId}/status
    const statusUrl = `${URLS.status}/${PHONEPE_MERCHANT_ID}/${orderId}/status`

    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `O-Bearer ${accessToken}`
      }
    })

    const phonePeData = await response.json()
    
    if (phonePeData.state) {
      const paymentStatus = phonePeData.state === 'COMPLETED' ? 'paid' : phonePeData.state === 'FAILED' ? 'failed' : 'pending'

      // Check current status before updating to avoid duplicate decrements
      const { data: currentOrder } = await supabaseAdmin
        .from('orders')
        .select('payment_status, items, timeline')
        .eq('id', orderId)
        .single()

      if (currentOrder && currentOrder.payment_status !== paymentStatus) {
        // Update order
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            payment_status: paymentStatus,
            fulfilment_status: paymentStatus === 'paid' ? 'confirmed' : 'placed',
          })
          .eq('id', orderId)

        if (updateError) {
          console.error('Order update error:', updateError)
        }

        // Decrement stock if newly paid
        if (paymentStatus === 'paid' && currentOrder.payment_status !== 'paid') {
          if (Array.isArray(currentOrder.items)) {
            for (const item of currentOrder.items as { productId: string; quantity: number }[]) {
              const productId = item.productId
              if (!productId) continue
              
              const { data: product } = await supabaseAdmin
                .from('products')
                .select('stock')
                .eq('id', productId)
                .single()
                
              if (product) {
                const newStock = Math.max(0, product.stock - item.quantity)
                await supabaseAdmin.from('products').update({ stock: newStock }).eq('id', productId)
              }
            }
          }
        }

        // Add timeline entry
        const timeline = Array.isArray(currentOrder.timeline) ? currentOrder.timeline : []
        timeline.push({
          status: paymentStatus === 'paid' ? 'confirmed' : paymentStatus,
          timestamp: new Date().toISOString(),
          note: paymentStatus === 'paid' ? 'Payment confirmed' : `Payment ${paymentStatus}`,
        })
        await supabaseAdmin.from('orders').update({ timeline }).eq('id', orderId)
      }

      res.json({ success: true, status: paymentStatus })
    } else {
      res.status(400).json({ success: false, error: 'Could not fetch status' })
    }
  } catch (error) {
    console.error('Status check error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export { router as paymentRouter }
