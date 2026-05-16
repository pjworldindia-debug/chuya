import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, MessageCircle } from 'lucide-react'
import { supabase } from '@chuya/shared/supabase'
import { formatCurrency, formatDate, getEstimatedDeliveryDate, BRAND } from '@chuya/shared/constants'
import type { Order, OrderItem } from '@chuya/shared/types'
import Button from '../components/Button'

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>()

  const { data: order, isLoading } = useQuery({
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

  if (!order) {
    return (
      <div className="section min-h-[60vh] text-center flex flex-col items-center justify-center">
        <h1 className="font-serif text-3xl mb-4">Order Not Found</h1>
        <Link to="/shop"><Button variant="ghost">Back to Shop</Button></Link>
      </div>
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

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
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
