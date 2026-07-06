import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '@chuya/shared/supabase'
import { formatCurrency, formatDate } from '@chuya/shared/constants'
import type { Order } from '@chuya/shared/types'

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin', 'orders', statusFilter],
    queryFn: async () => {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false })
      if (statusFilter) query = query.eq('payment_status', statusFilter)
      const { data, error } = await query
      if (error) throw error
      return data as Order[]
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: 'payment_status' | 'fulfilment_status'; value: string }) => {
      const { error } = await supabase.from('orders').update({ [field]: value }).eq('id', id)
      if (error) throw error

      // Add timeline entry
      const { data: order } = await supabase.from('orders').select('timeline').eq('id', id).single()
      if (order) {
        const timeline = Array.isArray(order.timeline) ? order.timeline : []
        timeline.push({ status: value, timestamp: new Date().toISOString(), note: `Status updated to ${value}` })
        await supabase.from('orders').update({ timeline }).eq('id', id)
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
  })

  const updateTracking = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      const { error } = await supabase.from('orders').update({ tracking_url: url }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
  })

  const badge = (s: string) => {
    if (['paid', 'delivered'].includes(s)) return 'admin-badge-active'
    if (['failed', 'cancelled', 'refunded'].includes(s)) return 'admin-badge-archived'
    return 'admin-badge-draft'
  }

  return (
    <div id="orders-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-input w-40">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr><th></th><th>Order ID</th><th>Date</th><th>Customer</th><th>Total</th><th>Payment</th><th>Fulfilment</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : !orders?.length ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No orders found</td></tr>
            ) : orders.map((order) => (
              <>
                <tr key={order.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                  <td>{expandedId === order.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                  <td className="font-mono text-xs">{order.id.slice(0, 8)}</td>
                  <td className="text-xs text-gray-500">{formatDate(order.created_at)}</td>
                  <td className="text-xs">{order.guest_email || order.user_id?.slice(0, 8) || '—'}</td>
                  <td className="font-medium">{formatCurrency(order.total)}</td>
                  <td>
                    <select
                      value={order.payment_status}
                      onChange={(e) => { e.stopPropagation(); updateStatus.mutate({ id: order.id, field: 'payment_status', value: e.target.value }) }}
                      onClick={(e) => e.stopPropagation()}
                      className={`admin-badge ${badge(order.payment_status)} border-0 cursor-pointer text-[11px]`}
                    >
                      <option value="pending">pending</option><option value="paid">paid</option><option value="failed">failed</option><option value="refunded">refunded</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={order.fulfilment_status}
                      onChange={(e) => { e.stopPropagation(); updateStatus.mutate({ id: order.id, field: 'fulfilment_status', value: e.target.value }) }}
                      onClick={(e) => e.stopPropagation()}
                      className={`admin-badge ${badge(order.fulfilment_status)} border-0 cursor-pointer text-[11px]`}
                    >
                      <option value="placed">placed</option><option value="confirmed">confirmed</option><option value="shipped">shipped</option><option value="delivered">delivered</option><option value="cancelled">cancelled</option>
                    </select>
                  </td>
                </tr>
                {expandedId === order.id && (
                  <tr key={`${order.id}-details`}>
                    <td colSpan={7} className="bg-gray-50/50 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Items</h4>
                          <div className="space-y-2">
                            {(order.items as Array<{ name: string; quantity: number; price: number; image: string }>).map((item, i) => (
                              <div key={i} className="flex items-center gap-3 text-sm">
                                <img src={item.image} alt="" className="w-10 h-10 object-cover rounded" />
                                <div className="flex-1"><p>{item.name}</p><p className="text-xs text-gray-400">Qty: {item.quantity}</p></div>
                                <p>{formatCurrency(item.price * item.quantity)}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                            {order.gst > 0 && <div className="flex justify-between"><span className="text-gray-500">GST</span><span>{formatCurrency(order.gst)}</span></div>}
                            {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(order.discount)}</span></div>}
                            <div className="flex justify-between font-medium"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Shipping Address</h4>
                          {(() => {
                            const addr = order.shipping_address as { name: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string }
                            return (
                              <div className="text-sm space-y-0.5">
                                <p className="font-medium">{addr.name}</p>
                                <p className="text-gray-500">{addr.phone}</p>
                                <p className="text-gray-500">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                                <p className="text-gray-500">{addr.city}, {addr.state} - {addr.pincode}</p>
                              </div>
                            )
                          })()}
                          {order.coupon_code && (
                            <p className="mt-3 text-xs text-gray-400">Coupon: <span className="font-mono">{order.coupon_code}</span></p>
                          )}
                          {order.phonepe_transaction_id && (
                            <p className="mt-1 text-xs text-gray-400">PhonePe TXN: <span className="font-mono">{order.phonepe_transaction_id}</span></p>
                          )}
                          
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Tracking Link</h4>
                            <div className="flex items-center gap-2">
                              <input 
                                type="url" 
                                placeholder="https://shiprocket..." 
                                className="admin-input flex-1 text-xs" 
                                defaultValue={order.tracking_url || ''}
                                onBlur={(e) => {
                                  if (e.target.value !== (order.tracking_url || '')) {
                                    updateTracking.mutate({ id: order.id, url: e.target.value })
                                  }
                                }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Blur input to save automatically.</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
