import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { getDb } from '../db'
import { rateLimit } from '../middleware/ratelimit'

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
})

export const authRouter = Router()

// Fix D: login punya kuota ketat sendiri (10/menit/IP) — proteksi brute-force
// tetap kuat meski kuota umum panel admin diturunkan ke 60/menit.
authRouter.post(
  '/login',
  rateLimit({ windowMs: 60 * 1000, max: 10, keyName: 'admin-login' }),
  (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Isian tidak valid.' })
    return
  }
  const { email, password } = parsed.data
  const row = getDb()
    .prepare('SELECT email, password_hash, role, name FROM admins WHERE email = ?')
    .get(email) as { email: string; password_hash: string; role: string; name: string } | undefined

  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    res.status(401).json({ error: 'Email atau kata sandi tidak cocok.' })
    return
  }

  req.session.admin = {
    email: row.email,
    role: row.role === 'super_admin' ? 'super_admin' : 'verifikator',
    name: row.name,
  }
  getDb()
    .prepare('INSERT INTO audit_log (at, actor, action, detail) VALUES (?, ?, ?, ?)')
    .run(new Date().toISOString(), row.name, 'LOGIN', `${row.email} masuk sebagai ${row.role}`)
  res.json({ email: row.email, role: row.role, name: row.name })
})

authRouter.post('/logout', (req, res) => {
  const admin = req.session.admin
  req.session.destroy(() => {
    if (admin) {
      getDb().prepare('INSERT INTO audit_log (at, actor, action, detail) VALUES (?, ?, ?, ?)')
        .run(new Date().toISOString(), admin.name, 'LOGOUT', `${admin.email} keluar`)
    }
    res.status(204).end()
  })
})

authRouter.get('/me', (req, res) => {
  if (!req.session.admin) {
    res.status(401).json({ error: 'Tidak ada sesi.' })
    return
  }
  res.json(req.session.admin)
})
