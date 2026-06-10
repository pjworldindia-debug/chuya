import { createClient } from '@supabase/supabase-js'
import type { Database } from '@chuya/shared/database.types'

const SHIPROCKET_API_BASE = 'https://apiv2.shiprocket.in'
let cachedToken: string | null = null
let tokenExpiryTime: number = 0

async function getAuthToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiryTime) {
    return cachedToken
  }

  const email = process.env.SHIPROCKET_EMAIL
  const password = process.env.SHIPROCKET_PASSWORD

  if (!email || !password) {
    throw new Error('Shiprocket credentials are not configured in the environment')
  }

  const res = await fetch(`${SHIPROCKET_API_BASE}/v1/external/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(`Shiprocket Auth Failed: ${JSON.stringify(data)}`)
  }

  cachedToken = data.token
  // Token is usually valid for 10 days, we'll cache it for 24 hours just to be safe
  tokenExpiryTime = Date.now() + 24 * 60 * 60 * 1000
  return cachedToken!
}

export async function createShiprocketOrder(
  supabaseAdmin: ReturnType<typeof createClient<Database>>,
  orderId: string
) {
  try {
    // 1. Fetch Order
    const { data: rawOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    const order = rawOrder as any

    if (orderError || !order) {
      throw new Error(`Order ${orderId} not found`)
    }

    // 2. Format Address
    const address = order.shipping_address as any
    if (!address) {
      throw new Error('Shipping address missing in order')
    }

    const items = order.items as any[]
    if (!items || !items.length) {
      throw new Error('Items missing in order')
    }

    // 3. Extract items and calculate package dimensions
    const orderItems = []
    let totalWeight = 0
    let maxLength = 30
    let maxWidth = 20
    let maxHeight = 10

    for (const item of items) {
      // Fetch product to get weight and dimensions
      const { data: rawProduct } = await supabaseAdmin
        .from('products')
        .select('weight_kg, length_cm, width_cm, height_cm, sku')
        .eq('id', item.productId)
        .single()
        
      const product = rawProduct as any

      if (product) {
        totalWeight += (product.weight_kg || 1) * item.quantity
        if (product.length_cm && product.length_cm > maxLength) maxLength = product.length_cm
        if (product.width_cm && product.width_cm > maxWidth) maxWidth = product.width_cm
        if (product.height_cm && product.height_cm > maxHeight) maxHeight = product.height_cm
      } else {
        totalWeight += 1 * item.quantity // default 1kg
      }

      orderItems.push({
        name: item.name,
        sku: product?.sku || item.slug || item.productId,
        units: item.quantity,
        selling_price: item.price,
        discount: 0,
        tax: 0,
        hsn: 0
      })
    }

    if (totalWeight === 0) totalWeight = 1

    // 4. Construct Payload
    const payload = {
      order_id: orderId,
      order_date: new Date(order.created_at || Date.now()).toISOString().split('T')[0],
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
      billing_customer_name: address.name,
      billing_last_name: '',
      billing_address: address.line1,
      billing_address_2: address.line2 || '',
      billing_city: address.city,
      billing_pincode: address.pincode,
      billing_state: address.state,
      billing_country: 'India',
      billing_email: order.guest_email || 'customer@chuya.in',
      billing_phone: address.phone,
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: 'Prepaid',
      sub_total: order.subtotal,
      length: maxLength,
      breadth: maxWidth,
      height: maxHeight,
      weight: totalWeight
    }

    // 5. Send to Shiprocket
    const token = await getAuthToken()
    const response = await fetch(`${SHIPROCKET_API_BASE}/v1/external/orders/create/ad-hoc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })

    const responseData = (await response.json()) as any

    if (!response.ok) {
      throw new Error(`Failed to create Shiprocket order: ${JSON.stringify(responseData)}`)
    }

    console.log(`Shiprocket order created successfully for ${orderId}:`, responseData.order_id)
    return responseData
  } catch (error) {
    console.error(`Shiprocket API Error for order ${orderId}:`, error)
    // We don't throw here to prevent crashing the payment status update loop
    // Instead we log it so the admin can retry manually if needed
    return null
  }
}
