import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Resolve the correct uploads directory (apps/api/uploads)
const correctUploadsDir = path.join(__dirname, '../../../../apps/api/uploads')

// Check if images were accidentally downloaded to the root directory
const rootUploadsDir = path.join(__dirname, '../../../../../uploads')

function fixPrefixes(dir: string) {
  if (!fs.existsSync(dir)) return

  const files = fs.readdirSync(dir)
  let renamedCount = 0

  for (const file of files) {
    // Check if the file has a 13-digit timestamp prefix followed by a UUID
    // e.g. 1781234567890-ddd3cc6c-bffc-42e0-82d5-d8ff3ebbebb5-1780998940356.webp
    const regex = /^\d{13}-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-\d{13}\.webp)$/
    const match = file.match(regex)
    
    if (match && match[1]) {
      const oldPath = path.join(dir, file)
      const newPath = path.join(dir, match[1])
      fs.renameSync(oldPath, newPath)
      renamedCount++
      console.log(`Renamed: ${file} -> ${match[1]}`)
    }
  }

  if (renamedCount > 0) {
    console.log(`Successfully fixed prefixes for ${renamedCount} files in ${dir}`)
  } else {
    console.log(`No files needed prefix fixing in ${dir}`)
  }
}

function run() {
  console.log('Checking for common VPS upload issues...\n')

  // 1. Ensure the correct uploads directory exists
  if (!fs.existsSync(correctUploadsDir)) {
    fs.mkdirSync(correctUploadsDir, { recursive: true })
    console.log(`Created correct uploads directory: ${correctUploadsDir}`)
  }

  // 2. Check if files are in the root directory and move them
  if (fs.existsSync(rootUploadsDir)) {
    const files = fs.readdirSync(rootUploadsDir)
    if (files.length > 0) {
      console.log(`Found ${files.length} files in the root uploads directory. Moving them to apps/api/uploads...`)
      for (const file of files) {
        const oldPath = path.join(rootUploadsDir, file)
        const newPath = path.join(correctUploadsDir, file)
        // Move file
        fs.renameSync(oldPath, newPath)
      }
      console.log('Successfully moved all files!')
    }
  }

  // 3. Fix prefixes in the correct uploads directory
  fixPrefixes(correctUploadsDir)

  console.log('\nAll done! Try checking your site now.')
}

run()
