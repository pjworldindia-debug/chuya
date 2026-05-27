import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Search, Pencil, Trash2, X, Link } from 'lucide-react'
import { supabase } from '@chuya/shared/supabase'
import { productSchema, type ProductFormData } from '@chuya/shared/schemas'
import { formatCurrency, slugify } from '@chuya/shared/constants'
import { uploadImage, deleteImage } from '@chuya/shared/storage'
import type { Product, Category, ColorVariant } from '@chuya/shared/types'

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [relatedSlugs, setRelatedSlugs] = useState<string[]>([])
  const [relatedUrlInput, setRelatedUrlInput] = useState('')
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([])
  const [colorNameInput, setColorNameInput] = useState('')
  const [colorUrlInput, setColorUrlInput] = useState('')

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Product[]
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('name')
      return data as Category[]
    },
  })

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { status: 'draft', stock: 0, is_featured: false, is_new_arrival: false },
  })

  const openAdd = () => {
    setEditingProduct(null)
    form.reset({ status: 'draft', stock: 0, is_featured: false, is_new_arrival: false })
    setImageUrls([])
    setRelatedSlugs([])
    setRelatedUrlInput('')
    setColorVariants([])
    setColorNameInput('')
    setColorUrlInput('')
    setSheetOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    form.reset({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price: product.price,
      compare_at_price: product.compare_at_price,
      category_id: product.category_id,
      tags: product.tags,
      stock: product.stock,
      sku: product.sku,
      is_featured: product.is_featured,
      is_new_arrival: product.is_new_arrival,
      status: product.status,
      material: product.material,
      dimensions: product.dimensions,
      care_instructions: product.care_instructions,
      seo_title: product.seo_title,
      seo_description: product.seo_description,
    })
    setImageUrls(product.images || [])
    setRelatedSlugs(product.related_product_slugs || [])
    setRelatedUrlInput('')
    setColorVariants((product.color_variants as ColorVariant[]) || [])
    setColorNameInput('')
    setColorUrlInput('')
    setSheetOpen(true)
  }

  const extractSlugFromUrl = (input: string): string => {
    const trimmed = input.trim()
    try {
      const url = new URL(trimmed)
      const parts = url.pathname.split('/').filter(Boolean)
      const productIdx = parts.indexOf('product')
      if (productIdx !== -1 && parts[productIdx + 1]) return parts[productIdx + 1]
      return parts[parts.length - 1] || trimmed
    } catch {
      return trimmed.replace(/^\/+|\/+$/g, '').split('/').pop() || trimmed
    }
  }

  const handleAddRelatedProduct = () => {
    if (!relatedUrlInput.trim()) return
    const slug = extractSlugFromUrl(relatedUrlInput)
    if (slug && !relatedSlugs.includes(slug)) {
      setRelatedSlugs((prev) => [...prev, slug])
    }
    setRelatedUrlInput('')
  }

  const handleAddColorVariant = () => {
    if (!colorNameInput.trim() || !colorUrlInput.trim()) return
    setColorVariants((prev) => [...prev, { name: colorNameInput.trim(), url: colorUrlInput.trim() }])
    setColorNameInput('')
    setColorUrlInput('')
  }

  const saveMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const payload = { 
        ...data, 
        images: imageUrls, 
        related_product_slugs: relatedSlugs.length > 0 ? relatedSlugs : null,
        color_variants: colorVariants.length > 0 ? colorVariants : null
      }
      if (editingProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('products').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      setSheetOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('Delete this product permanently?')) return
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })

  const updateStock = async (id: string, stock: number) => {
    await supabase.from('products').update({ stock }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const url = await uploadImage(file, 'product-images')
        setImageUrls((prev) => [...prev, url])
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = async (url: string) => {
    try {
      await deleteImage(url, 'product-images')
    } catch { /* ignore delete errors */ }
    setImageUrls((prev) => prev.filter((u) => u !== url))
  }

  const filteredProducts = products?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusBadge = (s: string) => s === 'active' ? 'admin-badge-active' : s === 'archived' ? 'admin-badge-archived' : 'admin-badge-draft'

  return (
    <div id="products-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <button onClick={openAdd} className="admin-btn admin-btn-primary" id="add-product">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="admin-input pl-9"
          id="product-search"
        />
      </div>

      {/* Table */}
      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Image</th><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : !filteredProducts?.length ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No products found</td></tr>
            ) : filteredProducts.map((product) => (
              <tr key={product.id}>
                <td>
                  <img src={product.images?.[0] || ''} alt="" className="w-10 h-10 object-cover rounded" />
                </td>
                <td className="font-medium">{product.name}</td>
                <td className="text-gray-500 text-xs font-mono">{product.sku || '—'}</td>
                <td>{formatCurrency(product.price)}</td>
                <td>
                  <input
                    type="number"
                    defaultValue={product.stock}
                    min={0}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value)
                      if (!isNaN(val) && val !== product.stock) updateStock(product.id, val)
                    }}
                    className="w-16 admin-input text-center py-1 px-2"
                  />
                </td>
                <td><span className={`admin-badge ${statusBadge(product.status)}`}>{product.status}</span></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(product)} className="admin-btn admin-btn-ghost p-1.5"><Pencil size={14} /></button>
                    <button onClick={() => deleteMutation.mutate(product.id)} className="admin-btn admin-btn-danger p-1.5"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSheetOpen(false)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto animate-slide-in-right shadow-2xl">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b">
              <h2 className="font-bold">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setSheetOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Name *</label>
                <input {...form.register('name', { onChange: (e) => !editingProduct && form.setValue('slug', slugify(e.target.value)) })} className="admin-input mt-1" />
                {form.formState.errors.name && <p className="text-red-500 text-xs mt-0.5">{form.formState.errors.name.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Slug *</label>
                <input {...form.register('slug')} className="admin-input mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Price (₹) *</label>
                  <input {...form.register('price', { valueAsNumber: true })} type="number" step="0.01" className="admin-input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Compare At</label>
                  <input {...form.register('compare_at_price', { valueAsNumber: true })} type="number" step="0.01" className="admin-input mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Category</label>
                  <select {...form.register('category_id')} className="admin-input mt-1">
                    <option value="">None</option>
                    {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <select {...form.register('status')} className="admin-input mt-1">
                    <option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Stock *</label>
                  <input {...form.register('stock', { valueAsNumber: true })} type="number" className="admin-input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">SKU</label>
                  <input {...form.register('sku')} className="admin-input mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                <textarea {...form.register('description')} rows={4} className="admin-input mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Material</label>
                  <input {...form.register('material')} className="admin-input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Dimensions</label>
                  <input {...form.register('dimensions')} className="admin-input mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Care Instructions</label>
                <textarea {...form.register('care_instructions')} rows={2} className="admin-input mt-1" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('is_featured')} className="accent-chuya" /> Featured</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('is_new_arrival')} className="accent-chuya" /> New Arrival</label>
              </div>

              {/* Images */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Images</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 group">
                      <img src={url} alt="" className="w-full h-full object-cover rounded" />
                      <button type="button" onClick={() => handleRemoveImage(url)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100">×</button>
                    </div>
                  ))}
                  <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded flex items-center justify-center cursor-pointer hover:border-gray-400">
                    {uploading ? <span className="animate-spin text-xs">⏳</span> : <Plus size={20} className="text-gray-400" />}
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Related Products */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1.5">
                  <Link size={13} /> Related Products (Similar Products)
                </label>
                <p className="text-xs text-gray-400 mt-0.5 mb-2">Paste product URLs or slugs to show as "Similar Products" on the storefront.</p>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={relatedUrlInput}
                    onChange={(e) => setRelatedUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddRelatedProduct() } }}
                    placeholder="https://chuya.in/product/product-slug or slug"
                    className="admin-input flex-1"
                    id="related-product-input"
                  />
                  <button type="button" onClick={handleAddRelatedProduct} className="admin-btn admin-btn-primary px-3 py-1.5 text-xs flex-shrink-0">
                    <Plus size={14} /> Add
                  </button>
                </div>
                {relatedSlugs.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {relatedSlugs.map((slug, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-1.5 text-sm">
                        <Link size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="flex-1 font-mono text-xs truncate">{slug}</span>
                        <button
                          type="button"
                          onClick={() => setRelatedSlugs((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-red-400 hover:text-red-600 flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Color Variants */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Color Variants</label>
                <p className="text-xs text-gray-400 mt-0.5 mb-2">Add color buttons that redirect to other product pages.</p>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={colorNameInput}
                    onChange={(e) => setColorNameInput(e.target.value)}
                    placeholder="Color Name (e.g. Red)"
                    className="admin-input flex-1"
                  />
                  <input
                    type="text"
                    value={colorUrlInput}
                    onChange={(e) => setColorUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddColorVariant() } }}
                    placeholder="URL (e.g. /product/red-bag)"
                    className="admin-input flex-1"
                  />
                  <button type="button" onClick={handleAddColorVariant} className="admin-btn admin-btn-primary px-3 py-1.5 text-xs flex-shrink-0">
                    <Plus size={14} /> Add
                  </button>
                </div>
                {colorVariants.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {colorVariants.map((variant, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-sm">
                        <div>
                          <span className="font-medium mr-2">{variant.name}</span>
                          <span className="text-gray-500 text-xs">{variant.url}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setColorVariants((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-red-400 hover:text-red-600 flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SEO */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">SEO Title</label>
                <input {...form.register('seo_title')} className="admin-input mt-1" maxLength={70} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">SEO Description</label>
                <textarea {...form.register('seo_description')} className="admin-input mt-1" rows={2} maxLength={160} />
                <p className="text-xs text-gray-400 mt-0.5">{(form.watch('seo_description') || '').length}/160</p>
              </div>

              <button type="submit" className="admin-btn admin-btn-primary w-full justify-center" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </button>
              {saveMutation.isError && <p className="text-red-500 text-sm">Failed to save: {(saveMutation.error as any)?.message || JSON.stringify(saveMutation.error)}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
