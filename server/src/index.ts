import express from 'express'
import session from 'express-session'
import multer from 'multer'
import { join, dirname } from 'path'
import { initDb } from './db'
import { SqliteSessionStore } from './session-store'
import { authRouter } from './routes/auth'
import { publicRouter } from './routes/public'
import { adminRouter } from './routes/admin'
import { rateLimit, cleanupRateLimits } from './middleware/ratelimit'

const db = initDb()

const app = express()

const PORT = Number(process.env.PORT ?? 3001)

// Header keamanan (diklaim di docs/threat-model.md)
app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('X-Frame-Options', 'DENY')
  res.set('Referrer-Policy', 'no-referrer')
  next()
})

app.use(
  session({
    store: new SqliteSessionStore(db),
    name: 'siap.sid',
    secret: process.env.SESSION_SECRET || 'siap-prototipe-rahasia-sesi',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
    },
  }),
)

app.use(express.json({ limit: '1mb' }))

app.use('/api/admin', rateLimit({ windowMs: 60 * 1000, max: 10 }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/admin', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api', publicRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    const pesan =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Ukuran berkas melebihi 10 MB.'
        : err.code === 'LIMIT_FILE_COUNT'
          ? 'Jumlah berkas melebihi batas maksimal 5.'
          : 'Jenis berkas tidak didukung. Gunakan JPG, PNG, atau PDF.'
    res.status(400).json({ error: pesan })
    return
  }
  res.status(500).json({ error: 'Kesalahan tak terduga pada server.' })
})

setInterval(cleanupRateLimits, 5 * 60 * 1000).unref()

app.listen(PORT, () => {
  console.log(`SIAP server berjalan di http://localhost:${PORT}`)
})
