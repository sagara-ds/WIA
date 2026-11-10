import type { NextFunction, Request, Response } from 'express'

const TICKET_SESSION_MS = 30 * 60 * 1000

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.admin) {
    res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk kembali.' })
    return
  }
  next()
}

export function requireRole(role: 'verifikator' | 'super_admin') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.admin) {
      res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk kembali.' })
      return
    }
    if (req.session.admin.role !== role) {
      res.status(403).json({ error: 'Peran Anda tidak diizinkan untuk aksi ini.' })
      return
    }
    next()
  }
}

export function ticketSessionValid(req: Request, number?: string): boolean {
  const t = req.session.ticket
  if (!t) return false
  if (Date.now() - t.checkedAt > TICKET_SESSION_MS) return false
  if (number && t.number !== number) return false
  return true
}

export function refreshTicketSession(req: Request, number: string): void {
  req.session.ticket = { number, checkedAt: Date.now() }
}
