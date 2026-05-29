import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { paymentRouter } from './routes/payment.js'
import { couponRouter } from './routes/coupons.js'
import { emailRouter } from './routes/email.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.STOREFRONT_URL || '',
    process.env.ADMIN_URL || '',
  ].filter(Boolean),
  credentials: true,
}))

app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/payment', paymentRouter)
app.use('/api/coupons', couponRouter)
app.use('/api/email', emailRouter)

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ success: false, error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`🚀 CHUYA API running on http://localhost:${PORT}`)
})
