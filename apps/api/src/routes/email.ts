import { Router, type Request, type Response } from 'express'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@chuya/shared/database.types'

const router = Router()
const resend = new Resend(process.env.RESEND_API_KEY || '')
const getSupabaseAdmin = () => createClient<Database>(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
)

/**
 * POST /api/email/order-confirmation
 * Sends an order confirmation email via Resend
 */
router.post('/order-confirmation', async (req: Request, res: Response) => {
  try {
    const { to, orderId, items, total, shippingAddress, estimatedDelivery } = req.body

    if (!to || !orderId) {
      res.status(400).json({ success: false, error: 'Missing required fields' })
      return
    }

    const itemsHtml = (items as Array<{ name: string; quantity: number; price: number }>)
      .map(
        (item) =>
          `<tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-family: 'DM Sans', sans-serif; font-size: 14px;">${item.name}</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
          </tr>`
      )
      .join('')

    const address = shippingAddress as { name: string; line1: string; city: string; state: string; pincode: string }

    const { error } = await resend.emails.send({
      from: 'CHUYA <orders@chuya.in>',
      to: [to],
      subject: `Order Confirmed — #${orderId.slice(0, 8)}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'DM Sans', Arial, sans-serif; color: #1A1A1A; background: #F8F5F0; padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; letter-spacing: 0.15em; margin: 0;">CHUYA</h1>
          </div>
          <div style="background: white; padding: 30px;">
            <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; margin: 0 0 20px;">Thank you for your order!</h2>
            <p style="font-size: 14px; color: #8A8A8A; margin: 0 0 20px;">Order #${orderId.slice(0, 8)} has been confirmed.</p>
            <table style="width: 100%; border-collapse: collapse;">
              <thead><tr>
                <th style="text-align: left; padding: 8px 0; border-bottom: 2px solid #1A1A1A; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Item</th>
                <th style="text-align: center; padding: 8px 0; border-bottom: 2px solid #1A1A1A; font-size: 12px; text-transform: uppercase;">Qty</th>
                <th style="text-align: right; padding: 8px 0; border-bottom: 2px solid #1A1A1A; font-size: 12px; text-transform: uppercase;">Amount</th>
              </tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <div style="text-align: right; margin-top: 16px; font-size: 18px; font-weight: 600;">
              Total: ₹${Number(total).toLocaleString('en-IN')}
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #8A8A8A; margin: 0 0 8px;">Shipping To</h3>
            <p style="font-size: 14px; line-height: 1.6; margin: 0;">${address.name}<br/>${address.line1}<br/>${address.city}, ${address.state} - ${address.pincode}</p>
            ${estimatedDelivery ? `<p style="font-size: 14px; color: #8A8A8A; margin-top: 12px;">Estimated delivery: ${estimatedDelivery}</p>` : ''}
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <p style="font-size: 12px; color: #8A8A8A;">© ${new Date().getFullYear()} CHUYA. All rights reserved.</p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Email error:', error)
      res.status(500).json({ success: false, error: 'Failed to send email' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Email error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

/**
 * POST /api/email/newsletter
 * Sends a newsletter subscription notification email
 */
router.post('/newsletter', async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' })
      return
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { error: insertError } = await supabaseAdmin.from('subscribers').insert({ email })
    if (insertError) {
      console.warn('Subscriber insert failed (might already exist):', insertError)
    }

    const { error } = await resend.emails.send({
      from: 'CHUYA <orders@chuya.in>',
      to: ['pjworldindia@gmail.com'],
      subject: 'New Newsletter Subscriber',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1A1A1A;">New Newsletter Subscription!</h2>
          <p>A new user has subscribed to the CHUYA newsletter.</p>
          <p><strong>Email:</strong> ${email}</p>
        </div>
      `,
    })

    if (error) {
      console.error('Newsletter email error:', error)
      res.status(500).json({ success: false, error: 'Failed to send email' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Newsletter route error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export { router as emailRouter }
