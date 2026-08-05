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
import { repliesRouter } from './routes/replies.js'
import { adminRouter } from './routes/admin.js'

const app = express()
const PORT = process.env.PORT || 3001

// ── Proxy awareness ──────────────────────────────────────────────────────────
// Render, Railway, Fly and similar hosts sit behind a load balancer. Without
// this, req.ip resolves to the proxy for every request, which would make IP
// rate limiting and report deduplication useless (all users share one address).
app.set('trust proxy', 1)

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet())
/**
 * CORS_ORIGIN accepts a comma-separated list, because a deployed frontend
 * typically has more than one valid origin (production domain plus Vercel
 * preview URLs) and local development still needs to reach a hosted backend.
 */
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    // Requests with no Origin header (curl, server-to-server, health checks)
    if (!origin) return callback(null, true)

    const clean = origin.replace(/\/+$/, '')
    if (allowedOrigins.includes(clean)) return callback(null, true)

    // Allow Vercel preview deployments for this project without having to add
    // every generated URL by hand.
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(clean)) {
      return callback(null, true)
    }

    console.warn('[CORS] blocked origin:', origin)
    return callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST'],
  credentials: false,
}))
// Drawings are base64-encoded PNGs that can reach 200–400KB, so the body
// limit must accommodate them. 1MB covers a generous canvas without opening
// the door to arbitrarily large payloads.
app.use(express.json({ limit: '1mb' }))

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/moderate', moderationRouter)
app.use('/api/posts', postsRouter)
app.use('/api/reactions', reactionsRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/replies', repliesRouter)
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
