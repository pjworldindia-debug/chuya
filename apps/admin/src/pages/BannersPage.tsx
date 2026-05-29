import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil, Trash2, X, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@chuya/shared/supabase'
import { bannerSchema, type BannerFormData } from '@chuya/shared/schemas'
import { uploadImage } from '@chuya/shared/storage'
import type { Banner } from '@chuya/shared/types'

export default function BannersPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imgUrl, setImgUrl] = useState('')

  const { data: banners, isLoading } = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: async () => {
      const { data, error } = await supabase.from('banners').select('*').order('display_order')
      if (error) throw error
      return data as Banner[]
    },
  })

  const form = useForm<BannerFormData>({ resolver: zodResolver(bannerSchema) })

  const openAdd = () => {
    setEditing(null)
    form.reset({ position: 'hero', text_color: 'light', overlay_opacity: 30, display_order: banners?.length || 0, is_active: false })
    setImgUrl('')
    setDialogOpen(true)
  }

  const openEdit = (b: Banner) => {
    setEditing(b)
    form.reset({
      image_url: b.image_url, video_url: b.video_url || '', position: b.position as 'hero' | 'secondary', title: b.title, subtitle: b.subtitle,
      cta_label: b.cta_label, cta_url: b.cta_url, text_color: b.text_color,
      overlay_opacity: b.overlay_opacity, display_order: b.display_order, is_active: b.is_active,
    })
    setImgUrl(b.image_url)
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (data: BannerFormData) => {
      const payload = { ...data, image_url: imgUrl }
      if (editing) {
        const { error } = await supabase.from('banners').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('banners').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] })
      setDialogOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('Delete this banner?')) return
      const { error } = await supabase.from('banners').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] }),
  })

  const toggleActive = async (banner: Banner) => {
    await supabase.from('banners').update({ is_active: !banner.is_active }).eq('id', banner.id)
    queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] })
  }

  const handleImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file, 'banner-images')
      setImgUrl(url)
      form.setValue('image_url', url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div id="banners-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Banners</h1>
        <button onClick={openAdd} className="admin-btn admin-btn-primary"><Plus size={16} /> Add Banner</button>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Loading...</p>
      ) : !banners?.length ? (
        <div className="admin-card text-center py-8">
          <p className="text-gray-400">No banners yet. Create your first hero banner.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="admin-card p-0 overflow-hidden group">
              <div className="relative aspect-[16/5]">
                {b.video_url ? (
                  <video src={b.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                ) : (
                  <img src={b.image_url} alt={b.title || ''} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${(b.overlay_opacity || 30) / 100})` }} />
                {b.title && (
                  <div className={`absolute bottom-3 left-3 ${b.text_color === 'dark' ? 'text-gray-900' : 'text-white'}`}>
                    <p className="font-medium text-sm">{b.title} <span className="ml-2 text-[10px] uppercase bg-black/20 px-1 rounded">{b.position}</span></p>
                    {b.subtitle && <p className="text-xs opacity-80">{b.subtitle}</p>}
                  </div>
                )}
              </div>
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(b)} className={`admin-btn p-1 ${b.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                    {b.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <span className={`admin-badge ${b.is_active ? 'admin-badge-active' : 'admin-badge-draft'}`}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(b)} className="admin-btn admin-btn-ghost p-1.5"><Pencil size={14} /></button>
                  <button onClick={() => deleteMutation.mutate(b.id)} className="admin-btn admin-btn-danger p-1.5"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDialogOpen(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">{editing ? 'Edit Banner' : 'Add Banner'}</h2>
              <button onClick={() => setDialogOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Image *</label>
                {imgUrl ? (
                  <div className="mt-2 relative aspect-[16/5] rounded overflow-hidden">
                    <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { setImgUrl(''); form.setValue('image_url', '') }} className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm flex items-center justify-center">×</button>
                  </div>
                ) : (
                  <label className="mt-2 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg py-8 cursor-pointer hover:border-gray-400">
                    {uploading ? 'Uploading...' : 'Click to upload banner image'}
                    <input type="file" accept="image/*" onChange={handleImgUpload} className="hidden" />
                  </label>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500 uppercase">Video URL (Optional)</label><input {...form.register('video_url')} placeholder="https://..." className="admin-input mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-500 uppercase">Position</label><select {...form.register('position')} className="admin-input mt-1"><option value="hero">Hero (Top)</option><option value="secondary">Secondary (Middle)</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500 uppercase">Title</label><input {...form.register('title')} className="admin-input mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-500 uppercase">Subtitle</label><input {...form.register('subtitle')} className="admin-input mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500 uppercase">CTA Label</label><input {...form.register('cta_label')} placeholder="Shop Now" className="admin-input mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-500 uppercase">CTA URL</label><input {...form.register('cta_url')} placeholder="/shop" className="admin-input mt-1" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Text Color</label>
                  <select {...form.register('text_color')} className="admin-input mt-1"><option value="light">Light</option><option value="dark">Dark</option></select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Overlay %</label>
                  <input {...form.register('overlay_opacity', { valueAsNumber: true })} type="number" min={0} max={80} className="admin-input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Order</label>
                  <input {...form.register('display_order', { valueAsNumber: true })} type="number" min={0} className="admin-input mt-1" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('is_active')} className="accent-chuya" /> Active</label>
              <button type="submit" className="admin-btn admin-btn-primary w-full justify-center" disabled={saveMutation.isPending || !imgUrl}>
                {saveMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
