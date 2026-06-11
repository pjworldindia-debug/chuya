import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

function restoreUrl(url: string, bucket: string) {
  if (!url || !url.startsWith('/api/uploads/')) return url
  const filename = url.replace('/api/uploads/', '')
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`
}

async function rollbackUrls() {
  console.log('Rolling back product image URLs to Supabase...')
  const { data: products } = await supabaseAdmin.from('products').select('*')
  if (products) {
    for (const product of products) {
      if (product.images && Array.isArray(product.images)) {
        let updated = false
        const newImages = product.images.map((img: string) => {
          const restored = restoreUrl(img, 'product-images')
          if (restored !== img) updated = true
          return restored
        })
        if (updated) {
          await supabaseAdmin.from('products').update({ images: newImages }).eq('id', product.id)
          console.log(`Rolled back product: ${product.name}`)
        }
      }
    }
  }

  console.log('Rolling back category image URLs to Supabase...')
  const { data: categories } = await supabaseAdmin.from('categories').select('*')
  if (categories) {
    for (const category of categories) {
      if (category.image_url) {
        const restored = restoreUrl(category.image_url, 'product-images')
        if (restored !== category.image_url) {
          await supabaseAdmin.from('categories').update({ image_url: restored }).eq('id', category.id)
          console.log(`Rolled back category: ${category.name}`)
        }
      }
    }
  }

  console.log('Rolling back banner image URLs to Supabase...')
  const { data: banners } = await supabaseAdmin.from('banners').select('*')
  if (banners) {
    for (const banner of banners) {
      let updated = false
      const updateData: any = {}
      
      if (banner.image_url) {
        const restored = restoreUrl(banner.image_url, 'banner-images')
        if (restored !== banner.image_url) {
          updateData.image_url = restored
          updated = true
        }
      }
      
      if (banner.secondary_image_url) {
        const restored = restoreUrl(banner.secondary_image_url, 'banner-images')
        if (restored !== banner.secondary_image_url) {
          updateData.secondary_image_url = restored
          updated = true
        }
      }
      
      if (updated) {
        await supabaseAdmin.from('banners').update(updateData).eq('id', banner.id)
        console.log(`Rolled back banner: ${banner.id}`)
      }
    }
  }
  
  console.log('Finished rolling back URLs to Supabase!')
}

rollbackUrls().catch(console.error)
