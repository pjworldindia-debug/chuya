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

// The target uploads directory for the API
const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const BUCKETS = ['product-images', 'banner-images', 'category-images', 'images'] // Common bucket names

async function downloadFilesFromBucket(bucketName: string) {
  console.log(`\nChecking bucket: ${bucketName}...`)
  
  // 1. List files in the bucket
  const { data: files, error } = await supabaseAdmin.storage.from(bucketName).list()
  
  if (error) {
    if (error.message.includes('not found')) {
      console.log(`Bucket ${bucketName} does not exist. Skipping.`)
    } else {
      console.error(`Failed to list files in ${bucketName}:`, error)
    }
    return
  }

  if (!files || files.length === 0) {
    console.log(`No files found in bucket ${bucketName}.`)
    return
  }

  console.log(`Found ${files.length} files in ${bucketName}. Downloading...`)

  // 2. Download each file
  for (const file of files) {
    // Skip placeholder/system files
    if (file.name === '.emptyFolderPlaceholder' || !file.name.includes('.')) continue

    const filepath = path.join(uploadsDir, file.name)
    
    // Skip if we already downloaded it
    if (fs.existsSync(filepath)) {
      console.log(`- Skipping ${file.name} (already exists locally)`)
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

async function run() {
  console.log('Starting full download from Supabase Storage to local VPS...')
  console.log(`Saving files to: ${uploadsDir}\n`)
  
  for (const bucket of BUCKETS) {
    await downloadFilesFromBucket(bucket)
  }
  
  console.log('\nFinished downloading all images!')
}

run().catch(console.error)
