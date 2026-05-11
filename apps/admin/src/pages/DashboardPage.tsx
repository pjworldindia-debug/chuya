import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, TrendingUp, Package, AlertTriangle } from 'lucide-react'
import { supabase } from '@chuya/shared/supabase'
import { formatCurrency, formatDate } from '@chuya/shared/constants'
import type { Order, Product } from '@chuya/shared/types'

export default function DashboardPage() {
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Today's revenue
  const { data: todayRevenue } = useQuery({
    queryKey: ['dashboard', 'todayRevenue'],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('total').gte('created_at', todayStart).eq('payment_status', 'paid')
      return data?.reduce((sum, o) => sum + Number(o.total), 0) || 0
    },
  })

  // Week's revenue
  const { data: weekRevenue } = useQuery({
    queryKey: ['dashboard', 'weekRevenue'],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('total').gte('created_at', weekAgo).eq('payment_status', 'paid')
      return data?.reduce((sum, o) => sum + Number(o.total), 0) || 0
    },
  })

  // Month's orders
  const { data: monthOrders } = useQuery({
    queryKey: ['dashboard', 'monthOrders'],
    queryFn: async () => {
      const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo)
      return count || 0
    },
  })

  // Low stock
  const { data: lowStockCount } = useQuery({
    queryKey: ['dashboard', 'lowStock'],
    queryFn: async () => {
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).lt('stock', 5).eq('status', 'active')
      return count || 0
    },
  })

  // Low stock products
  const { data: lowStockProducts } = useQuery({
    queryKey: ['dashboard', 'lowStockProducts'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id,name,stock,sku').lt('stock', 5).eq('status', 'active').order('stock', { ascending: true }).limit(10)
      return data as Pick<Product, 'id' | 'name' | 'stock' | 'sku'>[]
    },
  })

  // Recent orders
  const { data: recentOrders } = useQuery({
    queryKey: ['dashboard', 'recentOrders'],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10)
      return data as Order[]
    },
  })

  // Daily revenue chart (30 days)
  const { data: chartData } = useQuery({
    queryKey: ['dashboard', 'chartData'],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('total, created_at').gte('created_at', monthAgo).eq('payment_status', 'paid').order('created_at', { ascending: true })
      if (!data) return []
      const grouped: Record<string, number> = {}
      data.forEach((o) => {
        const date = new Date(o.created_at).toISOString().split('T')[0]
        grouped[date] = (grouped[date] || 0) + Number(o.total)
      })
      // Fill in empty days
      const result = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const key = d.toISOString().split('T')[0]
        result.push({ date: key, revenue: grouped[key] || 0 })
      }
      return result
    },
  })

  const statusBadge = (s: string) => {
    if (['paid','delivered'].includes(s)) return 'admin-badge-active'
    if (['failed','cancelled'].includes(s)) return 'admin-badge-archived'
    return 'admin-badge-draft'
  }

  const metrics = [
    { label: "Today's Revenue", value: formatCurrency(todayRevenue || 0), icon: DollarSign, color: 'text-green-600 bg-green-50' },
    { label: "Week's Revenue", value: formatCurrency(weekRevenue || 0), icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
    { label: "Month's Orders", value: String(monthOrders || 0), icon: Package, color: 'text-purple-600 bg-purple-50' },
    { label: 'Low Stock', value: String(lowStockCount || 0), icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
  ]

  return (
    <div className="space-y-6" id="dashboard">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="admin-card flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.color}`}>
              <m.icon size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{m.label}</p>
              <p className="text-xl font-bold mt-0.5">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="admin-card">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Revenue — Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} labelFormatter={(l: string) => formatDate(l)} />
            <Area type="monotone" dataKey="revenue" stroke="#C9B99A" fill="#C9B99A" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock */}
        <div className="admin-card">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Low Stock Alert</h2>
          {lowStockProducts?.length ? (
            <div className="space-y-3">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.sku || 'No SKU'}</p>
                  </div>
                  <span className={`admin-badge ${p.stock === 0 ? 'admin-badge-archived' : 'bg-amber-50 text-amber-700'}`}>
                    {p.stock} left
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">All products are well-stocked 🎉</p>
          )}
        </div>

        {/* Recent Orders */}
        <div className="admin-card">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Recent Orders</h2>
          {recentOrders?.length ? (
            <div className="space-y-3">
              {recentOrders.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-mono text-xs text-gray-500">#{o.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-400">{formatDate(o.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(o.total)}</p>
                    <span className={`admin-badge text-[10px] ${statusBadge(o.payment_status)}`}>{o.payment_status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No orders yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
