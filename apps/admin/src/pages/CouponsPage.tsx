import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { supabase } from '@chuya/shared/supabase'
import type { Database } from '@chuya/shared/database.types'

type Coupon = Database['public']['Tables']['coupons']['Row']

const couponSchema = z.object({
  code: z.string().min(2, 'Code is required').transform((v) => v.toUpperCase()),
  discount_type: z.enum(['flat', 'percent']),
  discount_value: z.coerce.number().min(1, 'Must be at least 1'),
  min_order_value: z.coerce.number().min(0).default(0),
  max_uses: z.coerce.number().nullable().default(null),
  expires_at: z.string().nullable().default(null),
  is_active: z.boolean().default(true),
  is_prepaid_only: z.boolean().default(false),
})

type CouponForm = z.infer<typeof couponSchema>

export default function CouponsPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const form = useForm<CouponForm>({
    resolver: zodResolver(couponSchema),
    defaultValues: { discount_type: 'percent', is_active: true, is_prepaid_only: false, min_order_value: 0 },
  })

  // Fetch coupons
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('is_active', { ascending: false })
        .order('code', { ascending: true })
      
      if (error) {
        console.error('Failed to fetch coupons:', error)
        throw error
      }
      return (data || []) as Coupon[]
    },
  })

  // Create / Update
  const saveMutation = useMutation({
    mutationFn: async (values: CouponForm) => {
      const payload = {
        ...values,
        max_uses: values.max_uses || null,
        expires_at: values.expires_at || null,
      }

      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update(payload as Record<string, unknown>)
          .eq('id', editingCoupon.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert(payload as Record<string, unknown>)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] })
      closeModal()
    },
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] })
      setDeleteId(null)
    },
  })

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('coupons').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] })
    },
  })

  const openCreate = () => {
    setEditingCoupon(null)
    form.reset({ discount_type: 'percent', is_active: true, is_prepaid_only: false, min_order_value: 0, code: '', discount_value: 0, max_uses: null, expires_at: null })
    setShowModal(true)
  }

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    form.reset({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_value: coupon.min_order_value,
      max_uses: coupon.max_uses,
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : null,
      is_active: coupon.is_active,
      is_prepaid_only: coupon.is_prepaid_only,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCoupon(null)
    form.reset()
  }

  const onSubmit = form.handleSubmit((values) => {
    saveMutation.mutate(values)
  })

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === 'percent') return `${coupon.discount_value}%`
    return `₹${coupon.discount_value}`
  }

  const isExpired = (coupon: Coupon) => {
    if (!coupon.expires_at) return false
    return new Date(coupon.expires_at) < new Date()
  }

  const isMaxedOut = (coupon: Coupon) => {
    if (!coupon.max_uses) return false
    return coupon.used_count >= coupon.max_uses
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Coupons</h1>
        <button onClick={openCreate} className="admin-btn admin-btn-primary" id="add-coupon-btn">
          <Plus size={16} className="mr-1" /> Add Coupon
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-400">Loading coupons...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">No coupons yet (or there was an error loading them).</p>
          <button onClick={openCreate} className="admin-btn admin-btn-primary">
            <Plus size={16} className="mr-1" /> Create your first coupon
          </button>
        </div>
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th><th>Discount</th><th>Min Order</th><th>Uses</th><th>Expires</th><th>Prepaid Only</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td>
                    <span className="font-mono font-bold text-sm bg-gray-100 px-2 py-1 rounded">
                      {coupon.code}
                    </span>
                  </td>
                  <td className="font-medium">{formatDiscount(coupon)}</td>
                  <td className="text-gray-500">₹{coupon.min_order_value}</td>
                  <td className="text-gray-500">
                    {coupon.used_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : ' / ∞'}
                  </td>
                  <td>
                    {coupon.expires_at ? (
                      <span className={isExpired(coupon) ? 'text-red-500' : 'text-gray-500'}>
                        {new Date(coupon.expires_at).toLocaleDateString()}
                        {isExpired(coupon) && ' (expired)'}
                      </span>
                    ) : (
                      <span className="text-gray-400">No expiry</span>
                    )}
                  </td>
                  <td>
                    {coupon.is_prepaid_only ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Yes</span>
                    ) : (
                      <span className="text-xs text-gray-400">No</span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => toggleMutation.mutate({ id: coupon.id, is_active: !coupon.is_active })}
                      className={`admin-badge cursor-pointer ${
                        coupon.is_active && !isExpired(coupon) && !isMaxedOut(coupon)
                          ? 'admin-badge-active'
                          : 'admin-badge-archived'
                      }`}
                    >
                      {coupon.is_active && !isExpired(coupon) && !isMaxedOut(coupon) ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(coupon)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(coupon.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h2>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase">Code *</label>
                  <input
                    {...form.register('code')}
                    placeholder="e.g. WELCOME20"
                    className="admin-input mt-1 uppercase"
                  />
                  {form.formState.errors.code && (
                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.code.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Discount Type *</label>
                  <select {...form.register('discount_type')} className="admin-input mt-1">
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Discount Value *</label>
                  <input
                    {...form.register('discount_value')}
                    type="number"
                    placeholder="e.g. 20"
                    className="admin-input mt-1"
                  />
                  {form.formState.errors.discount_value && (
                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.discount_value.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Min Order Value (₹)</label>
                  <input
                    {...form.register('min_order_value')}
                    type="number"
                    placeholder="0"
                    className="admin-input mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Max Uses</label>
                  <input
                    {...form.register('max_uses')}
                    type="number"
                    placeholder="Unlimited"
                    className="admin-input mt-1"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Leave empty for unlimited</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Expiry Date</label>
                  <input
                    {...form.register('expires_at')}
                    type="date"
                    className="admin-input mt-1"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Leave empty for no expiry</p>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    {...form.register('is_prepaid_only')}
                    type="checkbox"
                    id="coupon-prepaid"
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="coupon-prepaid" className="text-sm text-gray-700">Prepaid Orders Only</label>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    {...form.register('is_active')}
                    type="checkbox"
                    id="coupon-active"
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="coupon-active" className="text-sm text-gray-700">Active</label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="admin-btn flex-1">Cancel</button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="admin-btn admin-btn-primary flex-1"
                >
                  {saveMutation.isPending ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>

              {saveMutation.isError && (
                <p className="text-xs text-red-500 text-center">
                  {(saveMutation.error as Error)?.message || 'Failed to save coupon'}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2">Delete Coupon?</h2>
            <p className="text-sm text-gray-500 mb-6">This action cannot be undone. The coupon will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="admin-btn flex-1">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="admin-btn bg-red-600 text-white hover:bg-red-700 flex-1"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
