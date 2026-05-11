import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil, Trash2, GripVertical, X } from 'lucide-react'
import { supabase } from '@chuya/shared/supabase'
import { categorySchema, type CategoryFormData } from '@chuya/shared/schemas'
import { slugify } from '@chuya/shared/constants'
import { uploadImage } from '@chuya/shared/storage'
import type { Category } from '@chuya/shared/types'

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('display_order')
      if (error) throw error
      return data as Category[]
    },
  })

  const form = useForm<CategoryFormData>({ resolver: zodResolver(categorySchema) })

  const openAdd = () => {
    setEditing(null)
    form.reset({ name: '', slug: '', display_order: (categories?.length || 0) })
    setImageUrl('')
    setDialogOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    form.reset({ name: cat.name, slug: cat.slug, display_order: cat.display_order })
    setImageUrl(cat.image_url || '')
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const payload = { ...data, image_url: imageUrl || null }
      if (editing) {
        const { error } = await supabase.from('categories').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('categories').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setDialogOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('Delete this category?')) return
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file, 'product-images')
      setImageUrl(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div id="categories-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <button onClick={openAdd} className="admin-btn admin-btn-primary"><Plus size={16} /> Add Category</button>
      </div>

      <div className="admin-card">
        {isLoading ? (
          <p className="text-gray-400 text-center py-8">Loading...</p>
        ) : !categories?.length ? (
          <p className="text-gray-400 text-center py-8">No categories yet</p>
        ) : (
          <div className="space-y-1">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 group">
                <GripVertical size={16} className="text-gray-300 cursor-grab" />
                {cat.image_url ? (
                  <img src={cat.image_url} alt="" className="w-10 h-10 object-cover rounded" />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">—</div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{cat.name}</p>
                  <p className="text-xs text-gray-400">/{cat.slug}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(cat)} className="admin-btn admin-btn-ghost p-1.5"><Pencil size={14} /></button>
                  <button onClick={() => deleteMutation.mutate(cat.id)} className="admin-btn admin-btn-danger p-1.5"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDialogOpen(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">{editing ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setDialogOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Name *</label>
                <input {...form.register('name', { onChange: (e) => !editing && form.setValue('slug', slugify(e.target.value)) })} className="admin-input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Slug *</label>
                <input {...form.register('slug')} className="admin-input mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Image</label>
                <div className="flex items-center gap-3 mt-1">
                  {imageUrl ? (
                    <div className="relative w-16 h-16">
                      <img src={imageUrl} alt="" className="w-full h-full object-cover rounded" />
                      <button type="button" onClick={() => setImageUrl('')} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
                    </div>
                  ) : null}
                  <label className="admin-btn admin-btn-ghost cursor-pointer text-xs">
                    {uploading ? 'Uploading...' : 'Upload Image'}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>
              <button type="submit" className="admin-btn admin-btn-primary w-full justify-center" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
