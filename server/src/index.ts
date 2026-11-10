import express from 'express'
import session from 'express-session'
import { join, dirname } from 'path'
import { initDb } from './db'
import { SqliteSessionStore } from './session-store'
import { authRouter } from './routes/auth'
import { publicRouter } from './routes/public'
import { rateLimit, cleanupRateLimits } from './middleware/ratelimit'

const db = initDb()

const app = express()

const PORT = Number(process.env.PORT ?? 3001)

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
app.use('/api', publicRouter)

setInterval(cleanupRateLimits, 5 * 60 * 1000).unref()

app.listen(PORT, () => {
  console.log(`SIAP server berjalan di http://localhost:${PORT}`)
})
