import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@chuya/shared/database.types'
import { createShiprocketOrder } from '../services/shiprocket'

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

function getPhonePeConfig() {
  const PHONEPE_MERCHANT_ID = (process.env.PHONEPE_MERCHANT_ID || '').trim()
  const PHONEPE_CLIENT_ID = (process.env.PHONEPE_CLIENT_ID || '').trim()
  const PHONEPE_CLIENT_SECRET = (process.env.PHONEPE_CLIENT_SECRET || '').trim()
  const PHONEPE_ENV = (process.env.PHONEPE_ENV || 'production').trim()
  const IS_PROD = PHONEPE_ENV === 'production'

  if (!PHONEPE_CLIENT_ID || !PHONEPE_CLIENT_SECRET) {
    console.error('CRITICAL: PHONEPE_CLIENT_ID or PHONEPE_CLIENT_SECRET is missing or empty in environment variables.')
  }

  return {
    PHONEPE_MERCHANT_ID,
    PHONEPE_CLIENT_ID,
    PHONEPE_CLIENT_SECRET,
    PHONEPE_ENV,
    IS_PROD,
    URLS: {
      token: IS_PROD 
        ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token' 
        : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token',
      checkout: IS_PROD 
        ? 'https://api.phonepe.com/apis/pg/checkout/v2/pay' 
        : 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay',
      status: IS_PROD 
        ? 'https://api.phonepe.com/apis/pg/checkout/v2/order' 
        : 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order'
    }
  }
}

/**
 * Get PhonePe OAuth Token (V2)
 */
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getPhonePeToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  const { PHONEPE_CLIENT_ID, PHONEPE_CLIENT_SECRET, URLS } = getPhonePeConfig()

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
  
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + ((data.expires_in || 3600) * 1000) - 60000; // 1 minute buffer
  return cachedToken;
}

/**
 * POST /api/payment/initiate
 * Creates a PhonePe payment (V2) and returns the redirect URL
 */
router.post('/initiate', async (req: Request, res: Response) => {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const {
      orderId, amount, items, shippingAddress, userId,
      couponCode, subtotal, gst, discount,
      redirectUrl, callbackUrl, customerPhone, customerEmail,
      paymentMethod,
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
      payment_status: paymentMethod === 'cod' ? 'pending_cod' : 'pending',
      fulfilment_status: 'placed',
      timeline: [{ status: 'placed', timestamp: new Date().toISOString(), note: paymentMethod === 'cod' ? 'Order placed (Cash on Delivery)' : 'Order placed' }],
    })

    if (orderError) {
      console.error('Order creation error:', orderError)
      res.status(500).json({ success: false, error: 'Failed to create order' })
      return
    }

    // Increment coupon used_count if applicable
    if (couponCode) {
      const { error: couponError } = await supabaseAdmin.rpc('increment_coupon_used', { coupon_code: couponCode })
      if (couponError) {
        console.warn('Failed to increment coupon usage')
      }
    }

    if (paymentMethod === 'cod') {
      // Create Shiprocket order for COD
      createShiprocketOrder(supabaseAdmin, orderId).then(async (shiprocketRes: any) => {
        if (shiprocketRes) {
          const { data: currentOrder } = await supabaseAdmin.from('orders').select('timeline').eq('id', orderId).single();
          const timeline = Array.isArray(currentOrder?.timeline) ? currentOrder.timeline : [];
          const newTimeline = [...timeline, {
            status: 'confirmed',
            timestamp: new Date().toISOString(),
            note: `COD Order automatically pushed to Shiprocket (Shipment ID: ${shiprocketRes.shipment_id})`
          }]
          await supabaseAdmin.from('orders').update({ timeline: newTimeline }).eq('id', orderId)
        }
      }).catch((err: any) => {
        console.error('Shiprocket creation error for COD:', err);
      });

      // Redirect user directly
      res.json({
        success: true,
        paymentUrl: redirectUrl, // This will go straight to the success page
        transactionId: orderId,
      })
      return
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
          redirectUrl: redirectUrl, // User goes here after payment
          callbackUrl: callbackUrl // Server-to-server webhook (optional in V2 if we use status check)
        }
      }
    }

    console.log('--- PHONEPE V2 INITIATE ---')
    console.log('Payload:', payload)

    const { URLS } = getPhonePeConfig()

    const response = await fetch(URLS.checkout, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `O-Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    })
    
    const phonePeData = (await response.json()) as any
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
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Internal server error' })
  }
})

async function checkAndUpdateStatus(orderId: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const accessToken = await getPhonePeToken()
  const { URLS } = getPhonePeConfig()
  
  // Status endpoint: /apis/pg/checkout/v2/order/{merchantOrderId}/status
  const statusUrl = `${URLS.status}/${orderId}/status`

  const response = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Authorization': `O-Bearer ${accessToken}`
    }
  })

  const phonePeData = (await response.json()) as any
  console.log(`PhonePe Status Response for ${orderId}:`, phonePeData)
  
  const state = phonePeData.data?.state || phonePeData.state
  if (state) {
    const paymentStatus = state === 'COMPLETED' ? 'paid' : state === 'FAILED' ? 'failed' : 'pending'

    if (paymentStatus === 'paid') {
      const { data, error } = await supabaseAdmin.rpc('mark_order_paid_and_decrement_stock', { p_order_id: orderId });
      
      if (error) {
        console.error('RPC Error processing paid order:', error);
        throw new Error('Failed to process successful payment idempotently');
      }
      
      // Push to shiprocket only if we just processed it
      if (data === 'processed') {
        createShiprocketOrder(supabaseAdmin, orderId).then(async (shiprocketRes: any) => {
          if (shiprocketRes) {
             const { data: currentOrder } = await supabaseAdmin.from('orders').select('timeline').eq('id', orderId).single();
             const timeline = Array.isArray(currentOrder?.timeline) ? currentOrder.timeline : [];
             const newTimeline = [...timeline, {
               status: 'confirmed',
               timestamp: new Date().toISOString(),
               note: `Order automatically pushed to Shiprocket (Shipment ID: ${shiprocketRes.shipment_id})`
             }]
             await supabaseAdmin.from('orders').update({ timeline: newTimeline }).eq('id', orderId)
          }
        }).catch((err: any) => {
          console.error('Shiprocket creation error:', err);
        });
      }
    } else {
      // For non-paid statuses, just update the order if it's not already that status
      const { data: currentOrder } = await supabaseAdmin
        .from('orders')
        .select('payment_status, timeline')
        .eq('id', orderId)
        .single()
        
      if (currentOrder && currentOrder.payment_status !== paymentStatus) {
        const timeline = Array.isArray(currentOrder.timeline) ? currentOrder.timeline : []
        timeline.push({
          status: paymentStatus,
          timestamp: new Date().toISOString(),
          note: `Payment ${paymentStatus}`,
        })
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            payment_status: paymentStatus,
            timeline
          })
          .eq('id', orderId)

        if (updateError) {
          console.error('Order update error:', updateError)
          throw new Error('Failed to update order status');
        }
      }
    }

    return paymentStatus
  }
  
  throw new Error('Could not fetch status from PhonePe')
}

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

    const paymentStatus = await checkAndUpdateStatus(orderId)
    res.json({ success: true, status: paymentStatus })
  } catch (error) {
    console.error('Status check error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

/**
 * POST /api/payment/callback
 * Server-to-server webhook from PhonePe
 */
router.post('/callback', async (req: Request, res: Response) => {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const { response } = req.body
    
    if (response) {
      // PhonePe sends Base64 encoded JSON response
      const decodedResponse = Buffer.from(response, 'base64').toString('utf-8')
      const payload = JSON.parse(decodedResponse)
      
      const orderId = payload.data?.merchantTransactionId || payload.data?.merchantOrderId
      if (orderId) {
        // Securely fetch status directly from PhonePe instead of relying on the payload
        await checkAndUpdateStatus(orderId)
      }
    }
    
    // Always return 200 OK so PhonePe stops retrying
    res.status(200).send('OK')
  } catch (error) {
    console.error('Callback error:', error)
    res.status(200).send('OK') // Still return 200 to acknowledge receipt
  }
})

/**
 * ALL /api/payment/redirect/:orderId
 * Handles PhonePe redirect (which might be POST) and converts it to a GET redirect to frontend
 */
router.all('/redirect/:orderId', async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const frontendUrl = req.query.frontend as string;

  try {
    // Proactively check status before redirecting to ensure it's updated immediately
    await checkAndUpdateStatus(orderId);
  } catch (error: any) {
    console.error('Redirect status check error:', error.message || error);
  }

  // Force the absolute URL, completely ignoring any frontendUrl query parameter.
  // PhonePe often mangles query parameters by appending the transaction ID to the end of the URL.
  const { PHONEPE_ENV } = getPhonePeConfig()
  const fallbackBase = PHONEPE_ENV === 'production'
    ? 'https://chuya.in'
    : (process.env.STOREFRONT_URL || 'http://localhost:3000');
  res.redirect(302, `${fallbackBase}/order-success/${orderId}`);
})

export { router as paymentRouter }
