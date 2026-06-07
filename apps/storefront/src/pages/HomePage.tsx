import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, EffectFade } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-fade'
import { supabase } from '@chuya/shared/supabase'
import type { Banner, Product } from '@chuya/shared/types'
import { BRAND } from '@chuya/shared/constants'
import ProductCard from '../components/ProductCard'
import Button from '../components/Button'

export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>([])

  // Fetch banners with realtime subscription
  const { data: initialBanners } = useQuery({
    queryKey: ['banners', 'active'],
    queryFn: async () => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('display_order', { ascending: true })

      if (error) throw error
      return data as Banner[]
    },
  })

  useEffect(() => {
    if (initialBanners) setBanners(initialBanners)
  }, [initialBanners])

  // Realtime subscription for banners
  const handleBannerChange = useCallback(() => {
    const now = new Date().toISOString()
    supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data) setBanners(data as Banner[])
      })
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('banners-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banners' },
        handleBannerChange
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [handleBannerChange])

  // Featured products
  const { data: featuredProducts, isLoading: loadingFeatured } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .eq('is_featured', true)
        .limit(6)

      if (error) throw error
      return data as Product[]
    },
  })

  // New arrivals
  const { data: newArrivals } = useQuery({
    queryKey: ['products', 'new-arrivals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .eq('is_new_arrival', true)
        .order('created_at', { ascending: false })
        .limit(4)

      if (error) throw error
      return data as Product[]
    },
  })

  // Categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      return data
    },
  })

  // Total products count
  const { data: totalProducts } = useQuery({
    queryKey: ['products', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      if (error) throw error
      return count || 0
    },
  })

  const heroBanners = banners.filter(b => !b.position || b.position === 'hero')
  const secondaryBanners = banners.filter(b => b.position === 'secondary')
  const storyBanners = banners.filter(b => b.position === 'story')

  return (
    <>
      <Helmet>
        <title>CHUYA — Luxury Indian Handbags & Premium Leather Bags</title>
        <meta
          name="description"
          content="Discover CHUYA's luxury handcrafted Indian handbags. Each piece celebrates the art of Indian craftsmanship with the finest premium materials. Shop luxury bags online."
        />
        <meta name="keywords" content="luxury bags, luxury handbags, premium leather bags, indian craftsmanship, designer bags, chuya, chuya bags, handcrafted bags" />
        <meta property="og:title" content="CHUYA — Luxury Indian Handbags" />
        <meta property="og:description" content="Discover CHUYA's luxury handcrafted Indian handbags. Each piece celebrates the art of Indian craftsmanship with the finest premium materials." />
        <meta property="og:url" content="https://chuya.in" />
      </Helmet>

      {/* ── Hero Banner Carousel ── */}
      <section className="relative" id="hero-banner">
        {heroBanners.length > 0 ? (
          <Swiper
            modules={[Autoplay, Pagination, EffectFade]}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            effect="fade"
            loop={banners.length > 1}
            className="w-full h-[70vh] md:h-[85vh]"
          >
            {heroBanners.map((banner) => (
              <SwiperSlide key={banner.id}>
                <div className="relative w-full h-full">
                  {/* Desktop Asset */}
                  {banner.video_url ? (
                    <video src={banner.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover hidden md:block" />
                  ) : (
                    <img src={banner.image_url} alt={banner.title || 'CHUYA'} className="w-full h-full object-cover hidden md:block" />
                  )}

                  {/* Mobile Asset */}
                  {banner.mobile_video_url ? (
                    <video src={banner.mobile_video_url} autoPlay loop muted playsInline className="w-full h-full object-cover block md:hidden" />
                  ) : banner.video_url ? (
                    <video src={banner.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover block md:hidden" />
                  ) : banner.secondary_image_url ? (
                    <img src={banner.secondary_image_url} alt={banner.title || 'CHUYA'} className="w-full h-full object-cover block md:hidden" />
                  ) : (
                    <img src={banner.image_url} alt={banner.title || 'CHUYA'} className="w-full h-full object-cover block md:hidden" />
                  )}
                  {/* Overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundColor: `rgba(0, 0, 0, ${(banner.overlay_opacity || 30) / 100})`,
                    }}
                  />
                  {/* Content */}
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center text-center px-6 ${
                      banner.text_color === 'dark' ? 'text-chuya' : 'text-cream'
                    }`}
                  >
                    {banner.title && (
                      <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl mb-4 animate-fade-in">
                        {banner.title}
                      </h1>
                    )}
                    {banner.subtitle && (
                      <p className="text-sm md:text-base tracking-[0.15em] uppercase opacity-80 mb-8 animate-fade-in max-w-xl">
                        {banner.subtitle}
                      </p>
                    )}
                    {banner.cta_label && banner.cta_url && (
                      <Link to={banner.cta_url}>
                        <Button variant={banner.text_color === 'dark' ? 'ghost' : 'primary'}>
                          {banner.cta_label}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          /* Fallback hero when no banners */
          <div className="w-full h-[70vh] md:h-[85vh] bg-chuya flex flex-col items-center justify-center text-cream text-center px-6">
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl mb-4 animate-fade-in">
              CHUYA
            </h1>
            <p className="text-sm md:text-base tracking-[0.2em] uppercase opacity-70 mb-8 animate-fade-in">
              Luxury Handcrafted Indian Handbags
            </p>
            <Link to="/shop">
              <Button variant="ghost" className="border-cream text-cream hover:bg-cream hover:text-chuya">
                Explore Collection
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* ── Categories Grid ── */}
      {categories && categories.length > 0 && (
        <section className="section" id="categories">
          <h2 className="section-title">Shop by Category</h2>
          <p className="section-subtitle">
            Explore our curated collections, each designed for a different facet of your life.
          </p>
          {totalProducts !== undefined && (
            <p className="text-center text-sm tracking-widest uppercase text-muted mb-12">
              Over {totalProducts} Products Available
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 max-w-[1400px] mx-auto">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?category=${cat.id}`}
                className="group relative aspect-[3/4] overflow-hidden"
                id={`category-${cat.slug}`}
              >
                <img
                  src={cat.image_url || '/placeholder-category.jpg'}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="font-serif text-xl md:text-2xl text-cream">{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Secondary Banner ── */}
      {secondaryBanners.length > 0 && (
        <section className="relative w-full h-[50vh] md:h-[60vh] mt-16 md:mt-24">
          <div className="relative w-full h-full">
            {/* Desktop Asset */}
            {secondaryBanners[0].video_url ? (
              <video src={secondaryBanners[0].video_url} autoPlay loop muted playsInline className="w-full h-full object-cover hidden md:block" />
            ) : (
              <img src={secondaryBanners[0].image_url} alt={secondaryBanners[0].title || 'CHUYA'} className="w-full h-full object-cover hidden md:block" />
            )}

            {/* Mobile Asset */}
            {secondaryBanners[0].mobile_video_url ? (
              <video src={secondaryBanners[0].mobile_video_url} autoPlay loop muted playsInline className="w-full h-full object-cover block md:hidden" />
            ) : secondaryBanners[0].video_url ? (
              <video src={secondaryBanners[0].video_url} autoPlay loop muted playsInline className="w-full h-full object-cover block md:hidden" />
            ) : secondaryBanners[0].secondary_image_url ? (
              <img src={secondaryBanners[0].secondary_image_url} alt={secondaryBanners[0].title || 'CHUYA'} className="w-full h-full object-cover block md:hidden" />
            ) : (
              <img src={secondaryBanners[0].image_url} alt={secondaryBanners[0].title || 'CHUYA'} className="w-full h-full object-cover block md:hidden" />
            )}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: `rgba(0, 0, 0, ${(secondaryBanners[0].overlay_opacity || 30) / 100})`,
              }}
            />
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center text-center px-6 ${
                secondaryBanners[0].text_color === 'dark' ? 'text-chuya' : 'text-cream'
              }`}
            >
              {secondaryBanners[0].title && (
                <h2 className="font-serif text-3xl md:text-5xl lg:text-6xl mb-4">
                  {secondaryBanners[0].title}
                </h2>
              )}
              {secondaryBanners[0].subtitle && (
                <p className="text-sm md:text-base tracking-[0.15em] uppercase opacity-80 mb-8 max-w-xl">
                  {secondaryBanners[0].subtitle}
                </p>
              )}
              {secondaryBanners[0].cta_label && secondaryBanners[0].cta_url && (
                <Link to={secondaryBanners[0].cta_url}>
                  <Button variant={secondaryBanners[0].text_color === 'dark' ? 'ghost' : 'primary'}>
                    {secondaryBanners[0].cta_label}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Products ── */}
      <section className="section bg-white" id="featured-products">
        <h2 className="section-title">Featured</h2>
        <p className="section-subtitle">
          Our most coveted pieces, handpicked for their extraordinary craftsmanship.
        </p>
        {loadingFeatured ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1400px] mx-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-cream skeleton" />
                <div className="mt-4 h-5 bg-cream skeleton w-3/4" />
                <div className="mt-2 h-4 bg-cream skeleton w-1/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1400px] mx-auto">
            {featuredProducts?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        <div className="text-center mt-12">
          <Link to="/shop">
            <Button variant="ghost">View All Products</Button>
          </Link>
        </div>
      </section>

      {/* ── New Arrivals ── */}
      {newArrivals && newArrivals.length > 0 && (
        <section className="section" id="new-arrivals">
          <h2 className="section-title">New Arrivals</h2>
          <p className="section-subtitle">
            The latest additions to our collection — fresh from the atelier.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 max-w-[1400px] mx-auto">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ── Brand Story ── */}
      <section className="relative" id="brand-story">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
          {/* Image side */}
          <div className="relative h-[400px] lg:h-auto overflow-hidden">
            {storyBanners.length > 0 ? (
              <>
                {/* Desktop Asset */}
                {storyBanners[0].video_url ? (
                  <video src={storyBanners[0].video_url} autoPlay loop muted playsInline className="w-full h-[50vh] md:h-[70vh] object-cover hidden md:block" />
                ) : (
                  <img src={storyBanners[0].image_url} alt={storyBanners[0].title || 'CHUYA'} className="w-full h-[50vh] md:h-[70vh] object-cover hidden md:block" />
                )}

                {/* Mobile Asset */}
                {storyBanners[0].mobile_video_url ? (
                  <video src={storyBanners[0].mobile_video_url} autoPlay loop muted playsInline className="w-full h-[50vh] md:h-[70vh] object-cover block md:hidden" />
                ) : storyBanners[0].video_url ? (
                  <video src={storyBanners[0].video_url} autoPlay loop muted playsInline className="w-full h-[50vh] md:h-[70vh] object-cover block md:hidden" />
                ) : storyBanners[0].secondary_image_url ? (
                  <img src={storyBanners[0].secondary_image_url} alt={storyBanners[0].title || 'CHUYA'} className="w-full h-[50vh] md:h-[70vh] object-cover block md:hidden" />
                ) : (
                  <img src={storyBanners[0].image_url} alt={storyBanners[0].title || 'CHUYA'} className="w-full h-[50vh] md:h-[70vh] object-cover block md:hidden" />
                )}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: `rgba(0, 0, 0, ${(storyBanners[0].overlay_opacity || 0) / 100})`,
                  }}
                />
              </>
            ) : (
              <div className="absolute inset-0 bg-chuya flex items-center justify-center">
                <div className="text-cream text-center px-12">
                  <p className="font-serif text-6xl md:text-8xl opacity-10">C</p>
                </div>
              </div>
            )}
          </div>

          {/* Content side */}
          <div className="flex items-center px-8 md:px-16 lg:px-20 py-16 lg:py-24">
            <div className="max-w-lg">
              <span className="text-xs tracking-[0.3em] uppercase text-taupe mb-6 block">
                Our Story
              </span>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl mb-6 leading-tight">
                Where Heritage Meets
                <br />
                Modern Luxury
              </h2>
              <p className="text-muted leading-relaxed mb-6">
                {BRAND.description}
              </p>
              <p className="text-muted leading-relaxed mb-8">
                Every CHUYA handbag tells a story — of artisans who pour generations of skill into
                each stitch, of materials sourced from the finest tanneries, and of designs that
                transcend fleeting trends. This is not fast fashion. This is a legacy you carry.
              </p>
              <Link to="/shop">
                <Button variant="ghost">Discover the Collection</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Instagram / Social Proof ── */}
      <section className="section bg-white text-center" id="social-proof">
        <span className="text-xs tracking-[0.3em] uppercase text-taupe mb-3 block">
          Follow Us
        </span>
        <h2 className="font-serif text-3xl md:text-4xl mb-4">@chuya.in</h2>
        <p className="text-muted text-sm mb-8">
          Join our community of luxury enthusiasts
        </p>
        <a
          href={BRAND.instagram}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="ghost">Follow on Instagram</Button>
        </a>
      </section>
    </>
  )
}
