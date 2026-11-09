import { Router } from 'express'
import { createReadStream } from 'fs'
import { join } from 'path'
import { getDb, ticketRow } from '../db.js'
import { requireTicketSession, currentAdmin } from '../middleware/auth.js'

export const uploadsRouter = Router()

uploadsRouter.get('/tickets/:number/evidence/:id', requireTicketSession, (req, res) => {
  const row = ticketRow(String(req.params.number))
  if (!row) { res.status(404).json({ error: 'Tiket tidak ditemukan.' }); return }
  const ev = getDb().prepare('SELECT * FROM ticket_evidence WHERE id = ? AND ticket_number = ?').get(req.params.id, row.number) as any
  if (!ev || !ev.stored_name) { res.status(404).json({ error: 'Bukti tidak ditemukan.' }); return }
  const filePath = join(__dirname, '../../uploads', ev.stored_name)
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${ev.stored_name}.enc"`)
  createReadStream(filePath).pipe(res)
})

export function isAdmin(req: any) { return !!currentAdmin(req) }
