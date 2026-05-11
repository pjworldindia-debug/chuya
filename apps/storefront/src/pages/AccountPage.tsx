import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, MapPin, Heart, LogOut, Trash2, ChevronRight } from 'lucide-react'
import { supabase } from '@chuya/shared/supabase'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { formatCurrency, formatDate } from '@chuya/shared/constants'
import type { Order, Address, Product } from '@chuya/shared/types'
import Button from '../components/Button'
import ProductCard from '../components/ProductCard'

type Tab = 'orders' | 'addresses' | 'wishlist'

export default function AccountPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const setUser = useAuthStore((s) => s.setUser)
  const clearCart = useCartStore((s) => s.clearCart)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('orders')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) navigate('/auth', { state: { from: '/account' } })
  }, [user, loading, navigate])

  const { data: orders } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').eq('user_id', user!.id).order('created_at', { ascending: false })
      if (error) throw error
      return data as Order[]
    },
    enabled: !!user,
  })

  const { data: addresses } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('addresses').select('*').eq('user_id', user!.id).order('is_default', { ascending: false })
      if (error) throw error
      return data as Address[]
    },
    enabled: !!user,
  })

  const { data: wishlistProducts } = useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('wishlist_items').select('product_id, products(*)').eq('user_id', user!.id)
      if (error) throw error
      return data.map((w) => w.products as unknown as Product).filter(Boolean)
    },
    enabled: !!user,
  })

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('addresses').delete().eq('id', id); if (error) throw error },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  })

  const setDefaultAddress = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user!.id)
      const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  })

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); clearCart(); navigate('/') }

  const statusBadge = (s: string) => {
    if (['paid','delivered'].includes(s)) return 'badge-success'
    if (['pending','placed','confirmed'].includes(s)) return 'badge-warning'
    if (['failed','cancelled'].includes(s)) return 'badge-error'
    return 'badge-info'
  }

  if (loading || !user) return <div className="section min-h-[60vh]" />

  return (
    <>
      <Helmet><title>My Account — CHUYA</title></Helmet>
      <div className="section" id="account-page">
        <div className="max-w-[1000px] mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="font-serif text-3xl">Welcome, {user.fullName || 'there'}</h1>
              <p className="text-muted text-sm mt-1">{user.email}</p>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-muted hover:text-chuya" id="logout-btn">
              <LogOut size={16} /> Sign Out
            </button>
          </div>

          <div className="flex gap-1 border-b border-chuya/10 mb-8">
            {(['orders','addresses','wishlist'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex items-center gap-2 px-5 py-3 text-sm tracking-wider uppercase ${activeTab === t ? 'text-chuya border-b-2 border-chuya' : 'text-muted'}`}>
                {t === 'orders' ? <Package size={16}/> : t === 'addresses' ? <MapPin size={16}/> : <Heart size={16}/>} {t}
              </button>
            ))}
          </div>

          {activeTab === 'orders' && (
            <div className="space-y-4">
              {!orders?.length ? (
                <div className="text-center py-16"><p className="text-muted mb-4">No orders yet</p><Link to="/shop"><Button variant="ghost">Start Shopping</Button></Link></div>
              ) : orders.map((order) => (
                <div key={order.id} className="bg-white p-5">
                  <button onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-6 text-sm">
                      <div><span className="text-muted text-xs">Order</span><p className="font-mono text-xs">{order.id.slice(0,8)}</p></div>
                      <div><span className="text-muted text-xs">Date</span><p>{formatDate(order.created_at)}</p></div>
                      <div><span className="text-muted text-xs">Total</span><p className="font-medium">{formatCurrency(order.total)}</p></div>
                      <span className={`badge ${statusBadge(order.payment_status)}`}>{order.payment_status}</span>
                      <span className={`badge ${statusBadge(order.fulfilment_status)}`}>{order.fulfilment_status}</span>
                    </div>
                    <ChevronRight size={16} className={`transition-transform ${expandedOrder === order.id ? 'rotate-90' : ''}`}/>
                  </button>
                  {expandedOrder === order.id && (
                    <div className="mt-4 pt-4 border-t border-chuya/10 animate-fade-in space-y-3">
                      {(order.items as Array<{name:string;quantity:number;price:number;image:string}>).map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <img src={item.image} alt={item.name} className="w-12 h-12 object-cover"/>
                          <div className="flex-1"><p>{item.name}</p><p className="text-muted">Qty: {item.quantity}</p></div>
                          <p>{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses?.map((a) => (
                <div key={a.id} className={`bg-white p-5 relative ${a.is_default ? 'ring-1 ring-taupe' : ''}`}>
                  {a.is_default && <span className="badge bg-taupe/20 text-chuya absolute top-4 right-4">Default</span>}
                  <p className="font-medium">{a.name}</p>
                  <p className="text-sm text-muted mt-1">{a.phone}</p>
                  <p className="text-sm text-muted mt-1">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                  <p className="text-sm text-muted">{a.city}, {a.state} - {a.pincode}</p>
                  <div className="flex gap-3 mt-3">
                    {!a.is_default && <button onClick={() => setDefaultAddress.mutate(a.id)} className="text-xs text-muted hover:text-chuya">Set Default</button>}
                    <button onClick={() => deleteAddress.mutate(a.id)} className="text-xs text-red-500"><Trash2 size={12}/></button>
                  </div>
                </div>
              ))}
              {!addresses?.length && <div className="col-span-2 text-center py-16"><p className="text-muted">No saved addresses</p></div>}
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div>
              {!wishlistProducts?.length ? (
                <div className="text-center py-16"><p className="text-muted mb-4">Wishlist empty</p><Link to="/shop"><Button variant="ghost">Browse</Button></Link></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlistProducts.map((p) => <ProductCard key={p.id} product={p}/>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
