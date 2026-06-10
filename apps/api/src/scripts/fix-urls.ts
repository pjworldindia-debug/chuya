import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function fixUrls() {
  console.log('Fixing product image URLs...')
  const { data: products } = await supabaseAdmin.from('products').select('*')
  if (products) {
    for (const product of products) {
      if (product.images && Array.isArray(product.images)) {
        let updated = false
        const newImages = product.images.map((img: string) => {
          if (img.startsWith('/uploads/')) {
            updated = true
            return `/api${img}`
          }
          return img
        })
        if (updated) {
          await supabaseAdmin.from('products').update({ images: newImages }).eq('id', product.id)
          console.log(`Fixed product: ${product.name}`)
        }
      }
    }
  }

  console.log('Fixing category image URLs...')
  const { data: categories } = await supabaseAdmin.from('categories').select('*')
  if (categories) {
    for (const category of categories) {
      if (category.image_url && category.image_url.startsWith('/uploads/')) {
        await supabaseAdmin.from('categories').update({ image_url: `/api${category.image_url}` }).eq('id', category.id)
        console.log(`Fixed category: ${category.name}`)
      }
    }
  }

  console.log('Fixing banner image URLs...')
  const { data: banners } = await supabaseAdmin.from('banners').select('*')
  if (banners) {
    for (const banner of banners) {
      let updated = false
      const updateData: any = {}
      if (banner.image_url && banner.image_url.startsWith('/uploads/')) {
        updateData.image_url = `/api${banner.image_url}`
        updated = true
      }
      if (banner.secondary_image_url && banner.secondary_image_url.startsWith('/uploads/')) {
        updateData.secondary_image_url = `/api${banner.secondary_image_url}`
        updated = true
      }
      if (updated) {
        await supabaseAdmin.from('banners').update(updateData).eq('id', banner.id)
        console.log(`Fixed banner: ${banner.id}`)
      }
    }
  }
  
  console.log('Finished fixing URLs!')
}

fixUrls().catch(console.error)
