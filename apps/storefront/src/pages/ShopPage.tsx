import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { supabase } from '@chuya/shared/supabase'
import type { Product, Category } from '@chuya/shared/types'
import { PRODUCTS_PER_PAGE } from '@chuya/shared/constants'
import ProductCard from '../components/ProductCard'
import Button from '../components/Button'

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterOpen, setFilterOpen] = useState(false)

  const category = searchParams.get('category') || ''
  const minPrice = searchParams.get('min_price') || ''
  const maxPrice = searchParams.get('max_price') || ''
  const sort = searchParams.get('sort') || 'newest'
  const search = searchParams.get('search') || ''

  const [localCategory, setLocalCategory] = useState(category)
  const [localMinPrice, setLocalMinPrice] = useState(minPrice)
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice)

  // Sync local state when URL changes externally (e.g., clearing filters)
  useEffect(() => {
    setLocalCategory(category)
    setLocalMinPrice(minPrice)
    setLocalMaxPrice(maxPrice)
  }, [category, minPrice, maxPrice])

  // Fetch categories for filter sidebar
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })
      if (error) throw error
      return data as Category[]
    },
  })

  // Infinite scroll products query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['products', 'shop', category, minPrice, maxPrice, sort, search],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('status', 'active')

      if (category) query = query.eq('category_id', category)
      if (minPrice) query = query.gte('price', parseFloat(minPrice))
      if (maxPrice) query = query.lte('price', parseFloat(maxPrice))
      if (search) query = query.ilike('name', `%${search}%`)

      switch (sort) {
        case 'price_asc':
          query = query.order('price', { ascending: true })
          break
        case 'price_desc':
          query = query.order('price', { ascending: false })
          break
        case 'name_asc':
          query = query.order('name', { ascending: true })
          break
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false })
          break
      }

      const from = pageParam * PRODUCTS_PER_PAGE
      const to = from + PRODUCTS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, error } = await query
      if (error) throw error
      return { products: data as Product[], page: pageParam }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.products.length < PRODUCTS_PER_PAGE) return undefined
      return lastPage.page + 1
    },
    initialPageParam: 0,
  })

  // Total products count for current filters
  const { data: totalProductsCount } = useQuery({
    queryKey: ['products', 'count', category, minPrice, maxPrice, search],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      if (category) query = query.eq('category_id', category)
      if (minPrice) query = query.gte('price', parseFloat(minPrice))
      if (maxPrice) query = query.lte('price', parseFloat(maxPrice))
      if (search) query = query.ilike('name', `%${search}%`)

      const { count, error } = await query
      if (error) throw error
      return count || 0
    },
  })

  const products = useMemo(
    () => data?.pages.flatMap((page) => page.products) || [],
    [data]
  )

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams)
    
    if (localCategory) params.set('category', localCategory)
    else params.delete('category')
    
    if (localMinPrice) params.set('min_price', localMinPrice)
    else params.delete('min_price')
    
    if (localMaxPrice) params.set('max_price', localMaxPrice)
    else params.delete('max_price')

    setSearchParams(params)
    setFilterOpen(false) // Close mobile sidebar on apply
  }

  const clearFilters = () => {
    setLocalCategory('')
    setLocalMinPrice('')
    setLocalMaxPrice('')
    setSearchParams({})
  }

  const hasActiveFilters = category || minPrice || maxPrice || search
  const selectedCategory = categories?.find((c) => c.id === category)

  return (
    <>
      <Helmet>
        <title>{selectedCategory ? `${selectedCategory.name} — CHUYA` : 'Shop — CHUYA'}</title>
        <meta
          name="description"
          content="Browse CHUYA's collection of luxury handcrafted Indian handbags. Filter by category, price, and more."
        />
      </Helmet>

      <div className="section min-h-screen" id="shop-page">
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl mb-2">
              {selectedCategory
                ? selectedCategory.name
                : search
                ? `Results for "${search}"`
                : 'The Collection'}
            </h1>
            <p className="text-muted text-sm">
              {totalProductsCount !== undefined ? (
                `${totalProductsCount} ${totalProductsCount === 1 ? 'product' : 'products'}`
              ) : (
                `${products.length} ${products.length === 1 ? 'product' : 'products'}`
              )}
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-chuya/10">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-2 text-sm tracking-wider uppercase hover:text-taupe transition-colors"
              id="filter-toggle"
            >
              <SlidersHorizontal size={16} />
              Filters
              {hasActiveFilters && <span className="w-2 h-2 bg-taupe rounded-full" />}
            </button>

            <div className="flex items-center gap-2">
              <label className="text-xs text-muted uppercase tracking-wider">Sort</label>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => {
                    const params = new URLSearchParams(searchParams)
                    params.set('sort', e.target.value)
                    setSearchParams(params)
                  }}
                  className="appearance-none bg-transparent text-sm pr-6 py-1 border-b border-chuya/20 focus:border-chuya/60 outline-none cursor-pointer"
                  id="sort-select"
                >
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="name_asc">Name: A to Z</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-8">
            {/* Filter sidebar */}
            <div
              className={`${
                filterOpen ? 'block' : 'hidden'
              } lg:block w-full lg:w-[240px] flex-shrink-0 fixed lg:relative inset-0 lg:inset-auto z-30 lg:z-auto bg-cream lg:bg-transparent p-6 lg:p-0 pt-20 lg:pt-0`}
            >
              {/* Mobile close button */}
              <button
                onClick={() => setFilterOpen(false)}
                className="lg:hidden absolute top-6 right-6"
                aria-label="Close filters"
              >
                <X size={20} />
              </button>

              <div className="space-y-8">
                {/* Category filter */}
                <div>
                  <h4 className="text-xs tracking-[0.2em] uppercase text-muted mb-4">
                    Category
                  </h4>
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="radio"
                        name="category"
                        checked={!localCategory}
                        onChange={() => setLocalCategory('')}
                        className="accent-chuya"
                      />
                      <span className="text-sm group-hover:text-taupe transition-colors">
                        All
                      </span>
                    </label>
                    {categories?.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2.5 cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name="category"
                          checked={localCategory === cat.id}
                          onChange={() => setLocalCategory(cat.id)}
                          className="accent-chuya"
                        />
                        <span className="text-sm group-hover:text-taupe transition-colors">
                          {cat.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price filter */}
                <div>
                  <h4 className="text-xs tracking-[0.2em] uppercase text-muted mb-4">
                    Price Range
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={localMinPrice}
                      onChange={(e) => setLocalMinPrice(e.target.value)}
                      className="input w-full text-xs py-2 px-3"
                      min="0"
                      id="filter-min-price"
                    />
                    <span className="text-muted text-sm">—</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={localMaxPrice}
                      onChange={(e) => setLocalMaxPrice(e.target.value)}
                      className="input w-full text-xs py-2 px-3"
                      min="0"
                      id="filter-max-price"
                    />
                  </div>
                </div>

                {/* Apply Button */}
                <div className="pt-4 border-t border-chuya/10">
                  <Button variant="primary" fullWidth onClick={applyFilters}>
                    Apply Filters
                  </Button>
                </div>

                {/* Clear */}
                {(hasActiveFilters || localCategory || localMinPrice || localMaxPrice) && (
                  <div className="text-center">
                    <button
                      onClick={clearFilters}
                      className="text-sm text-muted underline hover:text-chuya transition-colors"
                      id="clear-filters"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Product grid */}
            <div className="flex-1">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[3/4] bg-white skeleton" />
                      <div className="mt-4 h-5 bg-white skeleton w-3/4" />
                      <div className="mt-2 h-4 bg-white skeleton w-1/4" />
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="text-center py-20">
                  <p className="text-muted mb-4">Something went wrong. Please try again.</p>
                  <Button variant="ghost" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-20">
                  <p className="font-serif text-2xl mb-2">No products found</p>
                  <p className="text-muted text-sm mb-6">Try adjusting your filters</p>
                  {hasActiveFilters && (
                    <Button variant="ghost" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  {/* Load More */}
                  {hasNextPage && (
                    <div className="text-center mt-12">
                      <Button
                        variant="ghost"
                        onClick={() => fetchNextPage()}
                        loading={isFetchingNextPage}
                        id="load-more"
                      >
                        Load More
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
