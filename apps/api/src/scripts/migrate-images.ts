import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

async function downloadImage(url: string): Promise<string | null> {
  if (!url || !url.includes('supabase.co')) return url

  try {
    console.log(`Downloading: ${url}`)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const buffer = await res.arrayBuffer()
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    let filename = pathParts[pathParts.length - 1]
    
    // Ensure unique filename just in case
    filename = `${Date.now()}-${filename}`
    const filepath = path.join(uploadsDir, filename)
    
    fs.writeFileSync(filepath, Buffer.from(buffer))
    
    // In production, VITE_API_URL or the proxy handles the domain
    // we save the relative path to the db
    // but the frontend storage.ts code might expect a full URL.
    // Wait, the API returns `/uploads/filename` and storage.ts prepends the API URL.
    // So the database stores `/uploads/filename`.
    return `/uploads/${filename}`
  } catch (err) {
    console.error(`Failed to download ${url}:`, err)
    return url // Keep original if failed
  }
}

async function migrateProducts() {
  console.log('Migrating products...')
  const { data: products, error } = await supabaseAdmin.from('products').select('*')
  if (error || !products) {
    console.error('Failed to fetch products', error)
    return
  }

  for (const product of products) {
    let updated = false
    const newImages = []

    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        const newImg = await downloadImage(img)
        newImages.push(newImg)
        if (newImg !== img) updated = true
      }
    }

    if (updated) {
      await supabaseAdmin.from('products').update({ images: newImages }).eq('id', product.id)
      console.log(`Updated product: ${product.name}`)
    }
  }
}

async function migrateCategories() {
  console.log('Migrating categories...')
  const { data: categories, error } = await supabaseAdmin.from('categories').select('*')
  if (error || !categories) return

  for (const category of categories) {
    if (category.image_url) {
      const newImg = await downloadImage(category.image_url)
      if (newImg !== category.image_url) {
        await supabaseAdmin.from('categories').update({ image_url: newImg }).eq('id', category.id)
        console.log(`Updated category: ${category.name}`)
      }
    }
  }
}

async function migrateBanners() {
  console.log('Migrating banners...')
  const { data: banners, error } = await supabaseAdmin.from('banners').select('*')
  if (error || !banners) return

  for (const banner of banners) {
    let updated = false
    const updateData: any = {}

    if (banner.image_url) {
      const newImg = await downloadImage(banner.image_url)
      if (newImg !== banner.image_url) {
        updateData.image_url = newImg
        updated = true
      }
    }

    if (banner.secondary_image_url) {
      const newImg = await downloadImage(banner.secondary_image_url)
      if (newImg !== banner.secondary_image_url) {
        updateData.secondary_image_url = newImg
        updated = true
      }
    }

    if (updated) {
      await supabaseAdmin.from('banners').update(updateData).eq('id', banner.id)
      console.log(`Updated banner ID: ${banner.id}`)
    }
  }
}

async function run() {
  console.log('Starting Image Migration...')
  await migrateProducts()
  await migrateCategories()
  await migrateBanners()
  console.log('Migration Complete!')
}

run().catch(console.error)
