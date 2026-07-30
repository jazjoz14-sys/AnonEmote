import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Load .env from backend/ root — works regardless of cwd
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env') })

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { moderationRouter } from './routes/moderation.js'
import { postsRouter } from './routes/posts.js'
import { reactionsRouter } from './routes/reactions.js'
import { reportsRouter } from './routes/reports.js'
import { adminRouter } from './routes/admin.js'

const app = express()
const PORT = process.env.PORT || 3001

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: false,
}))
app.use(express.json({ limit: '16kb' }))

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/moderate', moderationRouter)
app.use('/api/posts', postsRouter)
app.use('/api/reactions', reactionsRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/admin', adminRouter)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'AnonEmote Backend', timestamp: new Date().toISOString() })
})

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[AnonEmote Backend Error]', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`✦ AnonEmote backend running on http://localhost:${PORT}`)
})
