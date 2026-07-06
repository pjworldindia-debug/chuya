import { useState } from 'react'
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
  const apiUrl = import.meta.env.VITE_API_URL || ''

  // Fetch aggregated home data via cached API proxy
  const { data: homeData, isLoading: loadingFeatured } = useQuery({
    queryKey: ['store', 'home'],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/api/store/home`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data as {
        banners: Banner[];
        featuredProducts: Product[];
        newArrivals: Product[];
        categories: any[];
        totalProducts: number;
      }
    },
  })

  const banners = homeData?.banners || []
  const featuredProducts = homeData?.featuredProducts || []
  const newArrivals = homeData?.newArrivals || []
  const categories = homeData?.categories || []
  const totalProducts = homeData?.totalProducts

  const heroBanners = banners.filter(b => !b.position || b.position === 'hero')
  const secondaryBanners = banners.filter(b => b.position === 'secondary')
  const storyBanners = banners.filter(b => b.position === 'story')

  return (
    <>
      <Helmet>
        <title>CHUYA — Luxury Indian Handbags</title>
        <meta
          name="description"
          content="Discover CHUYA's luxury handcrafted Indian handbags. Each piece celebrates the art of Indian craftsmanship with the finest materials."
        />
      </Helmet>

      {/* ── Loading Transition Overlay ── */}
      <div
        className={`fixed inset-0 z-[100] bg-chuya flex items-center justify-center transition-opacity duration-1000 ${
          loadingFeatured ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="text-cream font-serif text-5xl md:text-7xl lg:text-8xl opacity-30 animate-pulse tracking-widest">
          CHUYA
        </div>
      </div>

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
                  <h3 className="font-serif text-xl md:text-2xl text-cream">{cat.name?.replace(/\s*\(\d+\)\s*$/, '') || ''}</h3>
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
                  <video src={storyBanners[0].video_url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover hidden md:block" />
                ) : (
                  <img src={storyBanners[0].image_url} alt={storyBanners[0].title || 'CHUYA'} className="absolute inset-0 w-full h-full object-cover hidden md:block" />
                )}

                {/* Mobile Asset */}
                {storyBanners[0].mobile_video_url ? (
                  <video src={storyBanners[0].mobile_video_url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover block md:hidden" />
                ) : storyBanners[0].video_url ? (
                  <video src={storyBanners[0].video_url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover block md:hidden" />
                ) : storyBanners[0].secondary_image_url ? (
                  <img src={storyBanners[0].secondary_image_url} alt={storyBanners[0].title || 'CHUYA'} className="absolute inset-0 w-full h-full object-cover block md:hidden" />
                ) : (
                  <img src={storyBanners[0].image_url} alt={storyBanners[0].title || 'CHUYA'} className="absolute inset-0 w-full h-full object-cover block md:hidden" />
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
