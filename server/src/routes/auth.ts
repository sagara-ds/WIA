import { Router } from 'express'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { getDb, addAudit } from '../db'
import { rateLimit } from '../middleware/auth'

export const authRouter = Router()

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })

authRouter.post('/login', rateLimit(10, 60_000), async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Kredensial tidak valid.' }); return }
  const admin = getDb().prepare('SELECT * FROM admins WHERE email = ?').get(parsed.data.email) as any
  if (!admin || !(await bcrypt.compare(parsed.data.password, admin.password_hash))) {
    addAudit(parsed.data.email, 'LOGIN_FAILED', 'Percobaan masuk gagal.')
    res.status(401).json({ error: 'Kredensial tidak valid.' }); return
  }
  ;(req.session as any).adminEmail = admin.email
  addAudit(admin.name, 'LOGIN', `${admin.email} masuk sebagai ${admin.role}`)
  res.json({ email: admin.email, name: admin.name, role: admin.role, publicKey: admin.public_key || null })
})

authRouter.post('/logout', (req, res) => {
  const admin = getDb().prepare('SELECT name FROM admins WHERE email = ?').get((req.session as any)?.adminEmail || '') as any
  if (admin) addAudit(admin.name, 'LOGOUT', 'Keluar dari panel.')
  ;(req as any).admin = undefined
  req.session.destroy(() => res.status(204).send())
})

authRouter.put('/public-key', (req, res) => {
  const parsed = z.object({ publicJwk: z.string().min(1).max(20000) }).safeParse(req.body)
  const email = (req.session as any)?.adminEmail
  if (!email) { res.status(401).json({ error: 'Sesi admin diperlukan.' }); return }
  if (!parsed.success) { res.status(400).json({ error: 'Public key tidak valid.' }); return }
  getDb().prepare('UPDATE admins SET public_key = ? WHERE email = ?').run(parsed.data.publicJwk, email)
  res.json({ ok: true })
})
