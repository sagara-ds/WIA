import express from 'express'
import session from 'express-session'
import { initDb } from './db.js'
import { authRouter } from './routes/auth.js'
import { publicRouter } from './routes/public.js'
import { adminRouter } from './routes/admin.js'
import { uploadsRouter } from './routes/uploads.js'

initDb()

const app = express()
const PORT = Number(process.env.PORT ?? 3001)
const secret = process.env.SESSION_SECRET || 'dev-only-ganti-di-produksi-siAP-2026'

// hardening: jangan log body/IP; helmet sederhana tanpa dependency
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  next()
})
app.use(session({
  secret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 30 * 60 * 1000 },
}))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/admin', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api', publicRouter)
app.use('/api', uploadsRouter)

app.listen(PORT, () => console.log(`SIAP server berjalan di http://localhost:${PORT}`))
