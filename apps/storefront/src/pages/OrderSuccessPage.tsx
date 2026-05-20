import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, MessageCircle, Phone, Package } from 'lucide-react'
import { supabase } from '@chuya/shared/supabase'
import { formatCurrency, formatDate, getEstimatedDeliveryDate, BRAND } from '@chuya/shared/constants'
import type { Order, OrderItem } from '@chuya/shared/types'
import Button from '../components/Button'

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>()

  // Ping API to check and verify PhonePe status
  useEffect(() => {
    if (orderId) {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      fetch(`${apiUrl}/api/payment/status/${orderId}`).catch(console.error)
    }
  }, [orderId])

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId!)
        .single()
      if (error) throw error
      return data as Order
    },
    enabled: !!orderId,
    retry: 2,
  })

  if (isLoading) {
    return (
      <div className="section min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 rounded-full bg-cream skeleton mx-auto mb-4" />
          <div className="h-6 w-48 skeleton mx-auto" />
        </div>
      </div>
    )
  }

  // If order can't be loaded, still show success with basic info
  if (error || !order) {
    return (
      <>
        <Helmet><title>Order Placed — CHUYA</title></Helmet>
        <div className="section min-h-[70vh]" id="order-success">
          <div className="max-w-[600px] mx-auto text-center">
            <div className="w-16 h-16 bg-green-50 flex items-center justify-center mx-auto mb-6 animate-fade-in">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h1 className="font-serif text-3xl md:text-4xl mb-2 animate-fade-in">Thank You!</h1>
            <p className="text-muted mb-4 animate-fade-in">Your order has been placed successfully.</p>
            {orderId && (
              <p className="text-sm text-muted mb-8">Order ID: <span className="font-mono">{orderId.slice(0, 12)}...</span></p>
            )}

            {/* Customer Service Section */}
            <div className="bg-amber-50 border border-amber-200 p-6 text-left space-y-3 mb-6 animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <Package size={18} className="text-amber-700" />
                <h3 className="font-medium text-amber-900">Track Your Order / Customer Service</h3>
              </div>
              <p className="text-sm text-amber-800">
                For order tracking, updates, or any queries, reach out to us on WhatsApp:
              </p>
              <a
                href={`https://wa.me/${BRAND.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800"
              >
                <Phone size={14} /> +91 {BRAND.whatsapp.slice(2)}
              </a>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(`Hi CHUYA! I just placed order #${orderId?.slice(0, 8) || ''}. Can you help me track it?`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="accent" fullWidth>
                  <MessageCircle size={16} className="mr-2" /> Chat on WhatsApp
                </Button>
              </a>
              <Link to="/shop" className="flex-1">
                <Button variant="ghost" fullWidth>Continue Shopping</Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  const items = order.items as unknown as OrderItem[]
  const estimatedDelivery = getEstimatedDeliveryDate(new Date(order.created_at))

  const whatsappMessage = encodeURIComponent(
    `Hi CHUYA! 🛍️\nI just placed order #${order.id.slice(0, 8)}\nTotal: ${formatCurrency(order.total)}\nItems: ${items.map((i) => `${i.name} x${i.quantity}`).join(', ')}`
  )

  return (
    <>
      <Helmet><title>Order Confirmed — CHUYA</title></Helmet>
      <div className="section min-h-[70vh]" id="order-success">
        <div className="max-w-[600px] mx-auto text-center">
          <div className="w-16 h-16 bg-green-50 flex items-center justify-center mx-auto mb-6 animate-fade-in">
            <CheckCircle size={32} className="text-green-500" />
          </div>

          <h1 className="font-serif text-3xl md:text-4xl mb-2 animate-fade-in">Thank You!</h1>
          <p className="text-muted mb-8 animate-fade-in">Your order has been placed successfully.</p>

          <div className="bg-white p-6 md:p-8 text-left space-y-4 animate-slide-up">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Order ID</span>
              <span className="font-mono">{order.id.slice(0, 12)}...</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Date</span>
              <span>{formatDate(order.created_at)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Estimated Delivery</span>
              <span>{formatDate(estimatedDelivery)}</span>
            </div>

            <div className="h-px bg-chuya/10" />

            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <img src={item.image} alt={item.name} className="w-14 h-14 object-cover" />
                <div className="flex-1 text-sm">
                  <p>{item.name}</p>
                  <p className="text-muted">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            ))}

            <div className="h-px bg-chuya/10" />

            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Customer Service / Track Order Section */}
          <div className="bg-amber-50 border border-amber-200 p-6 text-left space-y-3 mt-6 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <Package size={18} className="text-amber-700" />
              <h3 className="font-medium text-amber-900">Track Your Order / Customer Service</h3>
            </div>
            <p className="text-sm text-amber-800">
              For order tracking, updates, or any queries, reach out to us on WhatsApp:
            </p>
            <a
              href={`https://wa.me/${BRAND.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800"
            >
              <Phone size={14} /> +91 {BRAND.whatsapp.slice(2)}
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <a
              href={`https://wa.me/${BRAND.whatsapp}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button variant="accent" fullWidth>
                <MessageCircle size={16} className="mr-2" /> Chat on WhatsApp
              </Button>
            </a>
            <Link to="/shop" className="flex-1">
              <Button variant="ghost" fullWidth>Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
