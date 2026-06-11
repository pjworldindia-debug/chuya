import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { paymentRouter } from './routes/payment.js'
import { couponRouter } from './routes/coupons.js'
import { emailRouter } from './routes/email.js'
import { storeRouter } from './routes/store.js'
import { uploadRouter } from './routes/upload.js'
import path from 'path'
import { fileURLToPath } from 'url'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

const app = express()
const PORT = process.env.PORT || 4000

// Trust proxy if running behind a reverse proxy (like Nginx on VPS)
app.set('trust proxy', 1)

// Security Headers
app.use(helmet())

// Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 150, // Limit each IP to 150 requests per `window`
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // Stricter limit for critical endpoints
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.STOREFRONT_URL || 'https://chuya.in',
    process.env.ADMIN_URL || 'https://admin.chuya.in',
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-VERIFY'],
}))

app.use(express.json({ limit: '10kb' })) // Limit payload size to prevent DoS

// Apply global rate limiting to all routes
app.use('/api', globalLimiter)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/payment', strictLimiter, paymentRouter)
app.use('/api/coupons', couponRouter)
app.use('/api/email', strictLimiter, emailRouter)
app.use('/api/store', storeRouter)
app.use('/api/upload', uploadRouter)

import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Bulletproof path resolution: whether in 'src' or 'dist', go up one level to find 'uploads'
const uploadsPath = path.join(__dirname, '../uploads')

// Serve uploads folder as static files
app.use('/api/uploads', express.static(uploadsPath))

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ success: false, error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`🚀 CHUYA API running on http://localhost:${PORT}`)
})
