import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@chuya/shared/database.types'

const router = Router()

const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const PHONEPE_MERCHANT_ID = (process.env.PHONEPE_MERCHANT_ID || '').trim()
const PHONEPE_SALT_KEY = (process.env.PHONEPE_SALT_KEY || '').trim()
const PHONEPE_SALT_INDEX = (process.env.PHONEPE_SALT_INDEX || '1').trim()
const PHONEPE_API_URL = (process.env.PHONEPE_API_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox').trim()

/**
 * POST /api/payment/initiate
 * Creates a PhonePe payment and returns the redirect URL
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
        // Non-critical, log and continue
        console.warn('Failed to increment coupon usage')
      })
    }

    // PhonePe payment payload
    const merchantTransactionId = orderId
    const amountInPaise = Math.round(amount * 100)

    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: userId || 'guest',
      amount: amountInPaise,
      redirectUrl: `${redirectUrl}/${orderId}`,
      redirectMode: 'REDIRECT',
      callbackUrl,
      mobileNumber: customerPhone || '',
      paymentInstrument: { type: 'PAY_PAGE' },
    }

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')
    const stringToHash = base64Payload + '/pg/v1/pay' + PHONEPE_SALT_KEY
    const sha256Hash = crypto.createHash('sha256').update(stringToHash).digest('hex')
    const xVerify = `${sha256Hash}###${PHONEPE_SALT_INDEX}`

    const targetUrl = `${PHONEPE_API_URL}/pg/v1/pay`
    console.log('--- PHONEPE DEBUG ---')
    console.log('Base URL configured:', PHONEPE_API_URL)
    console.log('Target URL attempted:', targetUrl)
    console.log('Payload:', payload)

    const phonePeResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
      },
      body: JSON.stringify({ request: base64Payload }),
    })

    const phonePeData = await phonePeResponse.json()
    console.log('PhonePe Raw Response:', phonePeData)

    if (phonePeData.success && phonePeData.data?.instrumentResponse?.redirectInfo?.url) {
      res.json({
        success: true,
        paymentUrl: phonePeData.data.instrumentResponse.redirectInfo.url,
        transactionId: merchantTransactionId,
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
 * POST /api/payment/callback
 * PhonePe webhook — verifies signature and updates order status
 */
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { response: encodedResponse } = req.body

    if (!encodedResponse) {
      res.status(400).json({ success: false })
      return
    }

    // Verify signature (warn but don't block in UAT/sandbox mode)
    const stringToHash = encodedResponse + '/pg/v1/pay' + PHONEPE_SALT_KEY
    const expectedHash = crypto.createHash('sha256').update(stringToHash).digest('hex')
    const expectedVerify = `${expectedHash}###${PHONEPE_SALT_INDEX}`
    const receivedVerify = req.headers['x-verify'] as string

    const isUAT = PHONEPE_API_URL.includes('sandbox') || PHONEPE_API_URL.includes('preprod')

    if (expectedVerify !== receivedVerify) {
      console.warn('Signature mismatch — expected:', expectedVerify, 'received:', receivedVerify)
      if (!isUAT) {
        // Only block in production mode
        res.status(401).json({ success: false, error: 'Invalid signature' })
        return
      }
      console.warn('Proceeding anyway (UAT/sandbox mode)')
    }

    // Decode response
    const decodedResponse = JSON.parse(Buffer.from(encodedResponse, 'base64').toString('utf-8'))
    const { merchantTransactionId, state, transactionId } = decodedResponse.data || {}

    if (!merchantTransactionId) {
      res.status(400).json({ success: false })
      return
    }

    const paymentStatus = state === 'COMPLETED' ? 'paid' : state === 'FAILED' ? 'failed' : 'pending'

    // Update order
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: paymentStatus,
        phonepe_transaction_id: transactionId || null,
        fulfilment_status: paymentStatus === 'paid' ? 'confirmed' : 'placed',
      })
      .eq('id', merchantTransactionId)

    if (updateError) {
      console.error('Order update error:', updateError)
    }

    // Decrement stock for each item when payment is successful
    if (paymentStatus === 'paid') {
      const { data: orderData } = await supabaseAdmin
        .from('orders')
        .select('items')
        .eq('id', merchantTransactionId)
        .single()

      if (orderData && Array.isArray(orderData.items)) {
        for (const item of orderData.items as { productId: string; quantity: number }[]) {
          const productId = item.productId
          if (!productId) {
            console.error('Missing productId in order item:', item)
            continue
          }
          // Direct update (no RPC needed)
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('stock')
            .eq('id', productId)
            .single()
          if (product) {
            const newStock = Math.max(0, product.stock - item.quantity)
            await supabaseAdmin
              .from('products')
              .update({ stock: newStock })
              .eq('id', productId)
            console.log(`Stock updated: ${productId} → ${product.stock} → ${newStock}`)
          }
        }
      }
    }

    // Add timeline entry
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('timeline')
      .eq('id', merchantTransactionId)
      .single()

    if (order) {
      const timeline = Array.isArray(order.timeline) ? order.timeline : []
      timeline.push({
        status: paymentStatus === 'paid' ? 'confirmed' : paymentStatus,
        timestamp: new Date().toISOString(),
        note: paymentStatus === 'paid' ? 'Payment confirmed' : `Payment ${paymentStatus}`,
      })
      await supabaseAdmin
        .from('orders')
        .update({ timeline })
        .eq('id', merchantTransactionId)
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Payment callback error:', error)
    res.status(500).json({ success: false })
  }
})

export { router as paymentRouter }
