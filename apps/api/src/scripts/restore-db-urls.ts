import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

function stripPrefix(url: string) {
  if (!url) return url
  // Matches /api/uploads/ followed by 13 digits and a dash, then the UUID
  const regex = /\/api\/uploads\/\d{13}-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-\d{13}\.webp)/
  return url.replace(regex, '/api/uploads/$1')
}

async function fixUrls() {
  console.log('Fixing product image URLs...')
  const { data: products } = await supabaseAdmin.from('products').select('*')
  if (products) {
    for (const product of products) {
      if (product.images && Array.isArray(product.images)) {
        let updated = false
        const newImages = product.images.map((img: string) => {
          const stripped = stripPrefix(img)
          if (stripped !== img) updated = true
          return stripped
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
      const stripped = stripPrefix(category.image_url)
      if (stripped !== category.image_url) {
        await supabaseAdmin.from('categories').update({ image_url: stripped }).eq('id', category.id)
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
      
      const strippedMain = stripPrefix(banner.image_url)
      if (strippedMain !== banner.image_url) {
        updateData.image_url = strippedMain
        updated = true
      }
      
      const strippedSec = stripPrefix(banner.secondary_image_url)
      if (strippedSec !== banner.secondary_image_url) {
        updateData.secondary_image_url = strippedSec
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
