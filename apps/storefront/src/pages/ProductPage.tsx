import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Thumbs, FreeMode } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import 'swiper/css'
import 'swiper/css/thumbs'
import 'swiper/css/free-mode'
import { supabase } from '@chuya/shared/supabase'
import type { Product, ColorVariant } from '@chuya/shared/types'
import { formatCurrency, BRAND } from '@chuya/shared/constants'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'
import { useWishlistStore } from '../stores/wishlistStore'
import Button from '../components/Button'
import ProductCard from '../components/ProductCard'
import { Heart, Minus, Plus, ChevronDown, Truck, RotateCcw, Shield } from 'lucide-react'

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeAccordion, setActiveAccordion] = useState<string | null>('details')
  const [addedToCart, setAddedToCart] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const location = useLocation()
  const toggleWishlist = useWishlistStore((s) => s.toggleItem)
  const isWishlisted = useWishlistStore((s) => product ? s.hasItem(product.id) : false)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug!)
        .single()
      if (error) throw error
      return data as Product
    },
    enabled: !!slug,
  })

  const { data: relatedProducts } = useQuery({
    queryKey: ['products', 'related', product?.category_id, product?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .eq('category_id', product!.category_id!)
        .neq('id', product!.id)
        .limit(4)
      if (error) throw error
      return data as Product[]
    },
    enabled: !!product?.category_id,
  })

  // Manually linked similar products
  const { data: similarProducts } = useQuery({
    queryKey: ['products', 'similar', product?.id, product?.related_product_slugs],
    queryFn: async () => {
      const slugs = product!.related_product_slugs!
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .in('slug', slugs)
      if (error) throw error
      return data as Product[]
    },
    enabled: Array.isArray(product?.related_product_slugs) && product.related_product_slugs.length > 0,
  })

  // Wishlist status is handled by wishlistStore

  const handleAddToCart = async () => {
    if (!product || product.stock === 0) return
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      compareAtPrice: product.compare_at_price,
      image: product.images?.[0] || '',
      quantity,
      stock: product.stock,
    })



    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleBuyNow = async () => {
    if (!product) return
    if (isOutOfStock) return

    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      compareAtPrice: product.compare_at_price,
      image: product.images?.[0] || '',
      quantity,
      stock: product.stock,
    })

    if (user) {
      navigate('/cart')
    } else {
      navigate('/auth', { state: { from: '/cart' } })
    }
  }

  const handleWishlistToggle = () => {
    if (!product) return
    toggleWishlist(product.id)
  }

  const toggleAccordion = (id: string) => {
    setActiveAccordion(activeAccordion === id ? null : id)
  }

  if (isLoading) {
    return (
      <div className="section">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-[3/4] skeleton" />
          <div className="space-y-4">
            <div className="h-8 skeleton w-3/4" />
            <div className="h-6 skeleton w-1/4" />
            <div className="h-20 skeleton w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="section text-center min-h-[60vh] flex flex-col items-center justify-center">
        <h1 className="font-serif text-3xl mb-4">Product Not Found</h1>
        <Link to="/shop"><Button variant="ghost">Back to Shop</Button></Link>
      </div>
    )
  }

  const images = Array.isArray(product.images) ? product.images : (typeof product.images === 'string' ? [product.images] : [])
  const isOutOfStock = product.stock === 0
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price

  return (
    <>
      <Helmet>
        <title>{product.seo_title || product.name} — CHUYA</title>
        <meta name="description" content={product.seo_description || product.description || ''} />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.seo_description || product.description || ''} />
        {images[0] && <meta property="og:image" content={images[0]} />}
      </Helmet>

      <div className="section" id="product-detail">
        <div className="max-w-[1400px] mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-muted mb-8">
            <Link to="/" className="hover:text-chuya">Home</Link>
            <span>/</span>
            <Link to="/shop" className="hover:text-chuya">Shop</Link>
            <span>/</span>
            <span className="text-chuya">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            {/* Image Gallery */}
            <div className="space-y-4">
              <Swiper
                modules={[Thumbs]}
                thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
                className="w-full aspect-[3/4]"
              >
                {images.map((img, i) => (
                  <SwiperSlide key={i}>
                    <img src={img} alt={`${product.name} - ${i + 1}`} className="w-full h-full object-cover" />
                  </SwiperSlide>
                ))}
                {images.length === 0 && (
                  <SwiperSlide>
                    <div className="w-full h-full bg-white flex items-center justify-center text-muted">
                      No image available
                    </div>
                  </SwiperSlide>
                )}
              </Swiper>

              {images.length > 1 && (
                <Swiper
                  onSwiper={setThumbsSwiper}
                  modules={[FreeMode, Thumbs]}
                  spaceBetween={8}
                  slidesPerView={4}
                  freeMode
                  watchSlidesProgress
                  className="w-full"
                >
                  {images.map((img, i) => (
                    <SwiperSlide key={i} className="cursor-pointer opacity-60 [&.swiper-slide-thumb-active]:opacity-100">
                      <img src={img} alt={`Thumb ${i + 1}`} className="aspect-square object-cover" />
                    </SwiperSlide>
                  ))}
                </Swiper>
              )}
            </div>

            {/* Product Info */}
            <div className="lg:sticky lg:top-32 lg:self-start space-y-6">
              {product.is_new_arrival && (
                <span className="badge bg-chuya text-cream">New Arrival</span>
              )}
              <h1 className="font-serif text-3xl md:text-4xl">{product.name}</h1>

              <div className="flex items-center gap-3">
                <span className="text-xl font-medium">{formatCurrency(product.price)}</span>
                {hasDiscount && (
                  <span className="text-lg text-muted line-through">
                    {formatCurrency(product.compare_at_price!)}
                  </span>
                )}
                {hasDiscount && (
                  <span className="badge bg-taupe/20 text-chuya">
                    Save {formatCurrency(product.compare_at_price! - product.price)}
                  </span>
                )}
              </div>

              <p className="text-muted leading-relaxed">{product.description}</p>

              {/* Color Variants */}
              {Array.isArray(product.color_variants) && product.color_variants.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-sm font-medium uppercase tracking-wider mb-3">Available Colors</h3>
                  <div className="flex flex-wrap gap-2">
                    {(product.color_variants as unknown as ColorVariant[]).map((variant, i) => {
                      if (!variant || typeof variant !== 'object' || !variant.name || !variant.url) return null;
                      const isExternal = variant.url.startsWith('http')
                      const btnClass = "px-4 py-2 border border-chuya/20 hover:border-chuya rounded-md text-sm transition-colors"
                      return isExternal ? (
                        <a key={i} href={variant.url} target="_blank" rel="noopener noreferrer" className={btnClass}>
                          {variant.name}
                        </a>
                      ) : (
                        <Link key={i} to={variant.url} className={btnClass}>
                          {variant.name}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="h-px bg-chuya/10" />

              {/* Quantity + Add to Cart */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs tracking-[0.15em] uppercase text-muted">Quantity</span>
                  <div className="flex items-center border border-chuya/20">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2.5 hover:bg-chuya/5 transition-colors"
                      disabled={isOutOfStock}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center text-sm">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="p-2.5 hover:bg-chuya/5 transition-colors"
                      disabled={isOutOfStock}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  {product.stock <= 5 && product.stock > 0 && (
                    <span className="text-xs text-amber-600">Only {product.stock} left</span>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      fullWidth
                      onClick={handleAddToCart}
                      disabled={isOutOfStock}
                      id="add-to-cart"
                      className="border-chuya"
                    >
                      {isOutOfStock ? 'Out of Stock' : addedToCart ? '✓ Added to Bag' : 'Add to Bag'}
                    </Button>
                    <button
                      onClick={handleWishlistToggle}
                      className="p-3 border border-chuya/20 hover:border-chuya/40 transition-colors flex-shrink-0"
                      aria-label="Add to wishlist"
                      id="wishlist-toggle"
                    >
                      <Heart size={20} className={isWishlisted ? 'fill-chuya text-chuya' : ''} />
                    </button>
                  </div>
                  
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleBuyNow}
                    disabled={isOutOfStock}
                    id="buy-now"
                  >
                    Buy Now
                  </Button>
                </div>
              </div>

              <div className="h-px bg-chuya/10" />

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <Truck size={18} className="text-taupe" />
                  <span className="text-xs text-muted">Free Shipping</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <RotateCcw size={18} className="text-taupe" />
                  <span className="text-xs text-muted">Easy Returns</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <Shield size={18} className="text-taupe" />
                  <span className="text-xs text-muted">Authentic</span>
                </div>
              </div>

              <div className="h-px bg-chuya/10" />

              {/* Accordions */}
              {[
                {
                  id: 'details',
                  title: 'Details',
                  content: product.description || 'No details available.',
                },
                {
                  id: 'materials',
                  title: 'Materials & Care',
                  content: `${product.material ? `Material: ${product.material}\n` : ''}${product.dimensions ? `Dimensions: ${product.dimensions}\n` : ''}${product.care_instructions || 'Handle with care. Store in dust bag when not in use.'}`,
                },
                {
                  id: 'shipping',
                  title: 'Shipping & Returns',
                  content: 'Delivery time ,\nStandard 5–10 business days.\nExpress 3-5 business days.',
                },
              ].map((item) => (
                <div key={item.id} className="border-b border-chuya/10">
                  <button
                    onClick={() => toggleAccordion(item.id)}
                    className="w-full flex items-center justify-between py-4 text-sm tracking-wider uppercase"
                    id={`accordion-${item.id}`}
                  >
                    {item.title}
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-300 ${
                        activeAccordion === item.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      activeAccordion === item.id ? 'max-h-[500px] pb-4' : 'max-h-0'
                    }`}
                  >
                    <p className="text-muted text-sm leading-relaxed whitespace-pre-line">
                      {item.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Similar Products (manually linked) */}
          {similarProducts && similarProducts.length > 0 && (
            <div className="mt-24" id="similar-products">
              <h2 className="section-title">Similar Products</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
                {similarProducts.map((p) => {
                  const img = p.images?.[0] || ''
                  const hoverImg = p.images?.[1]
                  const hasDiscountSP = p.compare_at_price && p.compare_at_price > p.price
                  return (
                    <Link
                      key={p.id}
                      to={`/product/${p.slug}`}
                      className="group block"
                      id={`similar-product-${p.slug}`}
                    >
                      <div className="relative overflow-hidden aspect-[4/5]">
                        <img
                          src={img}
                          alt={p.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                        {hoverImg && (
                          <img
                            src={hoverImg}
                            alt={`${p.name} - alternate`}
                            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            loading="lazy"
                          />
                        )}
                        {p.stock === 0 && (
                          <div className="absolute inset-0 bg-cream/60 flex items-center justify-center">
                            <span className="badge bg-chuya text-cream text-xs tracking-wider">Out of Stock</span>
                          </div>
                        )}
                        {p.is_new_arrival && (
                          <span className="absolute top-3 left-3 badge bg-chuya text-cream">New</span>
                        )}
                        {hasDiscountSP && (
                          <span className="absolute top-3 right-3 badge bg-taupe text-chuya">
                            {Math.round(((p.compare_at_price! - p.price) / p.compare_at_price!) * 100)}% Off
                          </span>
                        )}
                      </div>
                      <div className="mt-4 px-1">
                        <h3 className="font-serif text-xl leading-tight group-hover:text-taupe transition-colors">
                          {p.name}
                        </h3>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-base font-medium">{formatCurrency(p.price)}</span>
                          {hasDiscountSP && (
                            <span className="text-sm text-muted line-through">
                              {formatCurrency(p.compare_at_price!)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Related Products */}
          {relatedProducts && relatedProducts.length > 0 && (
            <div className="mt-24">
              <h2 className="section-title">You May Also Like</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
