import { Router, type Request, type Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@chuya/shared/database.types'
import { cache } from '../utils/cache.js'

const router = Router()

let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient<Database>(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
    )
  }
  return _supabaseAdmin
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * GET /api/store/home
 * Returns aggregated data for the homepage: banners, featured products, new arrivals, and categories.
 * Heavily cached to support thousands of concurrent users.
 */
router.get('/home', async (_req: Request, res: Response) => {
  const cacheKey = 'store_home_data'
  const cachedData = cache.get(cacheKey)

  if (cachedData) {
    res.json({ success: true, data: cachedData })
    return
  }

  try {
    const now = new Date().toISOString()
    const supabaseAdmin = getSupabaseAdmin()

    const [
      { data: banners },
      { data: featuredProducts },
      { data: newArrivals },
      { data: categories },
      { count: totalProducts }
    ] = await Promise.all([
      supabaseAdmin
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('display_order', { ascending: true }),
      supabaseAdmin
        .from('products')
        .select('*')
        .eq('status', 'active')
        .eq('is_featured', true)
        .limit(6),
      supabaseAdmin
        .from('products')
        .select('*')
        .eq('status', 'active')
        .eq('is_new_arrival', true)
        .order('created_at', { ascending: false })
        .limit(4),
      supabaseAdmin
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true }),
      supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
    ])

    const responseData = {
      banners: banners || [],
      featuredProducts: featuredProducts || [],
      newArrivals: newArrivals || [],
      categories: categories || [],
      totalProducts: totalProducts || 0
    }

    cache.set(cacheKey, responseData, CACHE_TTL)

    res.json({ success: true, data: responseData })
  } catch (error) {
    console.error('Error fetching home data:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch home data' })
  }
})

/**
 * GET /api/store/shop
 * Returns filtered/paginated products and categories.
 */
router.get('/shop', async (req: Request, res: Response) => {
  const { category, minPrice, maxPrice, sort, search, pageParam = '0', limit = '12' } = req.query
  
  // Create a unique cache key based on query params
  const cacheKey = `store_shop_${category}_${minPrice}_${maxPrice}_${sort}_${search}_${pageParam}_${limit}`
  const cachedData = cache.get(cacheKey)

  if (cachedData) {
    res.json({ success: true, data: cachedData })
    return
  }

  try {
    const pageNum = parseInt(pageParam as string, 10) || 0
    const limitNum = parseInt(limit as string, 10) || 12
    const supabaseAdmin = getSupabaseAdmin()

    let query = supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' })
      .eq('status', 'active')

    if (category) query = query.eq('category_id', category as string)
    if (minPrice) query = query.gte('price', parseFloat(minPrice as string))
    if (maxPrice) query = query.lte('price', parseFloat(maxPrice as string))
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

    const from = pageNum * limitNum
    const to = from + limitNum - 1
    query = query.range(from, to)

    const [productsResult, { data: categories }] = await Promise.all([
      query,
      supabaseAdmin.from('categories').select('*').order('display_order', { ascending: true })
    ])

    const responseData = {
      products: productsResult.data || [],
      totalCount: productsResult.count || 0,
      categories: categories || []
    }

    cache.set(cacheKey, responseData, CACHE_TTL)

    res.json({ success: true, data: responseData })
  } catch (error) {
    console.error('Error fetching shop data:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch shop data' })
  }
})

/**
 * GET /api/store/product/:slug
 * Returns individual product details.
 */
router.get('/product/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params
  
  const cacheKey = `store_product_${slug}`
  const cachedData = cache.get(cacheKey)

  if (cachedData) {
    res.json({ success: true, data: cachedData })
    return
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: rawProduct, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()

    if (error) throw error

    if (!rawProduct) {
      res.status(404).json({ success: false, error: 'Product not found' })
      return
    }

    const product = rawProduct as any

    // Fetch related and similar products in parallel
    const [
      { data: relatedProducts },
      { data: similarProducts }
    ] = await Promise.all([
      product.category_id 
        ? supabaseAdmin
            .from('products')
            .select('*')
            .eq('status', 'active')
            .eq('category_id', product.category_id)
            .neq('id', product.id)
            .limit(4)
        : Promise.resolve({ data: [] }),
      product.related_product_slugs && product.related_product_slugs.length > 0
        ? supabaseAdmin
            .from('products')
            .select('*')
            .eq('status', 'active')
            .in('slug', product.related_product_slugs)
        : Promise.resolve({ data: [] })
    ])

    const responseData = {
      product,
      relatedProducts: relatedProducts || [],
      similarProducts: similarProducts || []
    }

    cache.set(cacheKey, responseData, CACHE_TTL)

    res.json({ success: true, data: responseData })
  } catch (error) {
    console.error(`Error fetching product ${slug}:`, error)
    res.status(404).json({ success: false, error: 'Product not found' })
  }
})

export { router as storeRouter }
