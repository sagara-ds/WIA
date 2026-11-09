import type { Request, Response, NextFunction } from 'express'
import { getDb } from '../db'

export type AdminInfo = { email: string; name: string; role: 'verifikator' | 'super_admin'; publicKey: string | null }

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Session {
      adminEmail?: string
      ticketNumber?: string
    }
  }
}

export function currentAdmin(req: Request): AdminInfo | null {
  const email = (req.session as any)?.adminEmail as string | undefined
  if (!email) return null
  const row = getDb().prepare('SELECT email, name, role, public_key FROM admins WHERE email = ?').get(email) as any
  if (!row) return null
  return { email: row.email, name: row.name, role: row.role, publicKey: row.public_key || null }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const admin = currentAdmin(req)
  if (!admin) { res.status(401).json({ error: 'Sesi admin diperlukan.' }); return }
  ;(req as any).admin = admin
  next()
}

export function requireRole(...roles: Array<'verifikator' | 'super_admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const admin = (req as any).admin as AdminInfo | undefined
    if (!admin) { res.status(401).json({ error: 'Sesi admin diperlukan.' }); return }
    if (!roles.includes(admin.role)) { res.status(403).json({ error: 'Peran tidak cukup.' }); return }
    next()
  }
}

export function requireTicketSession(req: Request, res: Response, next: NextFunction) {
  const expected = req.params.number
  const got = (req.session as any)?.ticketNumber as string | undefined
  const admin = currentAdmin(req)
  if (admin) { next(); return }
  if (got && got.toUpperCase() === String(expected).toUpperCase()) { next(); return }
  res.status(403).json({ error: 'Akses tiket tidak sah.' })
}

// rate limit in-memory (per IP), tidak log IP/isi body
const hits = new Map<string, number[]>()
export function rateLimit(max: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown'
    const now = Date.now()
    const list = (hits.get(key) || []).filter((t) => now - t < windowMs)
    list.push(now)
    hits.set(key, list)
    if (list.length > max) { res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' }); return }
    next()
  }
}
