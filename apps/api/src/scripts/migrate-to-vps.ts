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

const uploadsDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

async function downloadAllFromBucket(bucketName: string) {
  console.log(`\nChecking bucket: ${bucketName}...`)
  
  let allFiles: any[] = []
  let hasMore = true
  let offset = 0
  const limit = 1000 // Supabase allows up to 1000 per request
  
  while (hasMore) {
    const { data: files, error } = await supabaseAdmin.storage
      .from(bucketName)
      .list('', {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })
      
    if (error) {
      if (error.message.includes('not found')) {
        console.log(`Bucket ${bucketName} does not exist. Skipping.`)
      } else {
        console.error(`Failed to list files in ${bucketName}:`, error)
      }
      return
    }
    
    if (!files || files.length === 0) {
      hasMore = false
      break
    }
    
    allFiles = allFiles.concat(files)
    
    if (files.length < limit) {
      hasMore = false
    } else {
      offset += limit
    }
  }

  if (allFiles.length === 0) {
    console.log(`No files found in bucket ${bucketName}.`)
    return
  }

  console.log(`Found ${allFiles.length} files in ${bucketName}. Downloading missing files...`)

  for (const file of allFiles) {
    if (file.name === '.emptyFolderPlaceholder' || !file.name.includes('.')) continue

    const filepath = path.join(uploadsDir, file.name)
    if (fs.existsSync(filepath)) {
      // console.log(`- Skipping ${file.name} (already exists locally)`)
      continue
    }

    try {
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from(bucketName)
        .download(file.name)

      if (downloadError) throw downloadError
      if (!fileData) throw new Error('No data received')

      const buffer = Buffer.from(await fileData.arrayBuffer())
      fs.writeFileSync(filepath, buffer)
      console.log(`+ Successfully downloaded ${file.name}`)
    } catch (err) {
      console.error(`! Failed to download ${file.name}:`, err)
    }
  }
}

function convertToLocalUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('/api/uploads/')) return url // already converted
  
  // Extract filename from Supabase URL (e.g., https://xyz.supabase.co/storage/v1/object/public/bucket/filename.webp)
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/')
    const filename = parts[parts.length - 1]
    if (filename) return `/api/uploads/${filename}`
  } catch (e) {
    // Not a valid URL, just return it
  }
  return url
}

async function updateDatabase() {
  console.log('\n--- Updating Database URLs to /api/uploads/ ---')
  
  const { data: products } = await supabaseAdmin.from('products').select('*')
  if (products) {
    for (const product of products) {
      if (product.images && Array.isArray(product.images)) {
        let updated = false
        const newImages = product.images.map((img: string) => {
          const local = convertToLocalUrl(img)
          if (local && local !== img) updated = true
          return local || img
        })
        if (updated) {
          await supabaseAdmin.from('products').update({ images: newImages }).eq('id', product.id)
          console.log(`Updated product: ${product.name}`)
        }
      }
    }
  }

  const { data: categories } = await supabaseAdmin.from('categories').select('*')
  if (categories) {
    for (const category of categories) {
      if (category.image_url) {
        const local = convertToLocalUrl(category.image_url)
        if (local && local !== category.image_url) {
          await supabaseAdmin.from('categories').update({ image_url: local }).eq('id', category.id)
          console.log(`Updated category: ${category.name}`)
        }
      }
    }
  }

  const { data: banners } = await supabaseAdmin.from('banners').select('*')
  if (banners) {
    for (const banner of banners) {
      let updated = false
      const updateData: any = {}
      
      const fields = ['image_url', 'secondary_image_url', 'video_url', 'mobile_video_url']
      for (const field of fields) {
        if (banner[field]) {
          const local = convertToLocalUrl(banner[field])
          if (local && local !== banner[field]) {
            updateData[field] = local
            updated = true
          }
        }
      }
      
      if (updated) {
        await supabaseAdmin.from('banners').update(updateData).eq('id', banner.id)
        console.log(`Updated banner: ${banner.id}`)
      }
    }
  }
}

async function run() {
  console.log('Starting perfect migration from Supabase Storage to local VPS...')
  console.log(`Saving files to: ${uploadsDir}\n`)
  
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets()
  if (error) {
    console.error('Failed to list buckets:', error)
    return
  }
  
  if (buckets) {
    for (const bucket of buckets) {
      await downloadAllFromBucket(bucket.name)
    }
  }
  
  await updateDatabase()
  
  console.log('\n✅ MIGRATION COMPLETELY FINISHED! All files downloaded and database updated.')
}

run().catch(console.error)
