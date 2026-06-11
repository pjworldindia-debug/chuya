import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const router = Router()

// Ensure uploads directory exists
// Use process.cwd() to consistently save to apps/api/uploads in both dev and prod
const uploadsDir = path.join(process.cwd(), 'uploads')


if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    // Keep the frontend-generated filename if it has one, otherwise generate
    // The frontend sends files with a random uuid anyway
    cb(null, file.originalname)
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  // The file is now saved in apps/api/uploads/
  // We need to return the public URL to it
  // We will assume the API is hosted at the current domain. 
  // In production, the API might be api.domain.com.
  // The frontend just needs the relative or full path.
  // We'll return the relative path so the frontend can prepend the API URL.
  const publicUrl = `/api/uploads/${req.file.filename}`

  res.json({ publicUrl })
})

// Optional endpoint to delete an image
router.delete('/:filename', (req, res) => {
  const filename = req.params.filename
  if (!filename) return res.status(400).json({ error: 'Filename required' })

  const filepath = path.join(uploadsDir, filename)
  if (fs.existsSync(filepath)) {
    try {
      fs.unlinkSync(filepath)
      res.json({ success: true })
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete file' })
    }
  } else {
    res.status(404).json({ error: 'File not found' })
  }
})

export { router as uploadRouter }
