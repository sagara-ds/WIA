import { Router } from 'express'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { getDb, ticketRow, toTicketView, addAudit, TRANSITIONS, nowISO } from '../db'
import { requireAuth, requireRole, type AdminInfo } from '../middleware/auth'

export const adminRouter = Router()
adminRouter.use(requireAuth)

function admin(req: any): AdminInfo { return req.admin }

adminRouter.get('/tickets', (req, res) => {
  const { status, category, search } = req.query as any
  let sql = `SELECT * FROM tickets WHERE status NOT IN ('Selesai','Ditolak')`
  const args: any[] = []
  if (status) { sql += ` AND status = ?`; args.push(status) }
  if (category) { sql += ` AND category = ?`; args.push(category) }
  if (search) { sql += ` AND (LOWER(title) LIKE ? OR LOWER(number) LIKE ?)`; args.push(`%${String(search).toLowerCase()}%`, `%${String(search).toLowerCase()}%`) }
  sql += ` ORDER BY created_at DESC`
  const rows = getDb().prepare(sql).all(...args) as any[]
  res.json(rows.map((r) => toTicketView(r as any)))
})

adminRouter.get('/tickets/:number', (req, res) => {
  const row = ticketRow(String(req.params.number))
  if (!row) { res.status(404).json({ error: 'Tiket tidak ditemukan.' }); return }
  addAudit(admin(req).name, 'REPORT_VIEWED', `${row.number} · Akses detail tercatat.`)
  const notes = (getDb().prepare('SELECT * FROM internal_notes WHERE ticket_number = ? ORDER BY at ASC').all(row.number) as any[])
    .map((n) => ({ id: n.id, at: n.at, admin: n.admin, body: n.body }))
  res.json({ ticket: toTicketView(row), internalNotes: notes })
})

const transitionSchema = z.object({
  toStatus: z.enum(['Diverifikasi', 'Perlu Dilengkapi', 'Ditolak', 'Diteruskan', 'Ditindaklanjuti', 'Selesai']),
  note: z.string().min(1).max(5000),
  internal: z.string().max(5000).default(''),
  extra: z.object({
    unit: z.string().optional(), resultSummary: z.string().optional(),
    resultFile: z.object({ name: z.string(), size: z.number() }).optional(),
    messageToReporter: z.string().optional(),
  }).optional(),
})

adminRouter.patch('/tickets/:number/status', (req, res) => {
  const row = ticketRow(String(req.params.number))
  if (!row) { res.status(404).json({ error: 'Tiket tidak ditemukan.' }); return }
  const parsed = transitionSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Permintaan tidak valid.' }); return }
  const { toStatus, note, internal, extra } = parsed.data
  if (!TRANSITIONS[row.status]?.includes(toStatus)) { res.status(409).json({ error: `Transisi ${row.status} → ${toStatus} tidak diizinkan.` }); return }
  if (toStatus === 'Selesai' && !extra?.resultSummary) { res.status(400).json({ error: 'Selesai wajib punya ringkasan.' }); return }
  if (toStatus === 'Diteruskan' && !extra?.unit) { res.status(400).json({ error: 'Diteruskan wajib pilih unit.' }); return }
  const now = nowISO()
  const db = getDb()
  db.transaction(() => {
    db.prepare(`DELETE FROM ticket_timeline WHERE ticket_number = ? AND waiter = 1`).run(row.number)
    db.prepare(`INSERT INTO ticket_timeline (ticket_number, at, label, note) VALUES (?, ?, ?, ?)`).run(row.number, now, toStatus, note)
    if (toStatus === 'Perlu Dilengkapi') db.prepare(`INSERT INTO ticket_timeline (ticket_number, at, label, waiter) VALUES (?, ?, 'Menunggu tanggapan pelapor', 1)`).run(row.number, now)
    if (extra?.messageToReporter) db.prepare(`INSERT INTO ticket_messages (id, ticket_number, at, author, body) VALUES (?, ?, ?, 'admin', ?)`).run(randomUUID(), row.number, now, extra.messageToReporter)
    if (internal) db.prepare(`INSERT INTO internal_notes (id, ticket_number, at, admin, body) VALUES (?, ?, ?, ?, ?)`).run(randomUUID(), row.number, now, admin(req).name, internal)
    db.prepare(`UPDATE tickets SET status = ?, completed_at = ?, result_summary = ?, result_file_name = ?, result_file_size = ? WHERE number = ?`).run(
      toStatus, toStatus === 'Selesai' ? now : row.completed_at,
      extra?.resultSummary ?? row.result_summary, extra?.resultFile?.name ?? row.result_file_name, extra?.resultFile?.size ?? row.result_file_size, row.number,
    )
  })()
  addAudit(admin(req).name, 'STATUS_CHANGED', `${row.status} → ${toStatus} · ${row.number} · ${note.slice(0, 80)}`)
  res.json(toTicketView(ticketRow(row.number)!))
})

adminRouter.post('/tickets/:number/messages', (req, res) => {
  const row = ticketRow(String(req.params.number))
  if (!row) { res.status(404).json({ error: 'Tiket tidak ditemukan.' }); return }
  const parsed = z.object({ body: z.string().min(1).max(20000) }).safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Pesan tidak valid.' }); return }
  getDb().prepare(`INSERT INTO ticket_messages (id, ticket_number, at, author, body) VALUES (?, ?, ?, 'admin', ?)`).run(randomUUID(), row.number, nowISO(), parsed.data.body)
  addAudit(admin(req).name, 'MESSAGE_SENT', `${row.number}`)
  res.json(toTicketView(ticketRow(row.number)!))
})

adminRouter.get('/audit', requireRole('super_admin'), (_req, res) => {
  const rows = (getDb().prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200').all() as any[])
    .map((e) => ({ id: String(e.id), at: e.at, actor: e.actor, action: e.action, detail: e.detail }))
  res.json(rows)
})

adminRouter.get('/master', requireRole('super_admin'), (_req, res) => {
  const db = getDb()
  const categories = (db.prepare('SELECT * FROM master_categories ORDER BY name').all() as any[]).map((c) => ({ id: String(c.id), name: c.name, active: !!c.active }))
  const units = (db.prepare('SELECT * FROM master_units ORDER BY name').all() as any[]).map((u) => ({ id: String(u.id), name: u.name, active: !!u.active }))
  const admins = (db.prepare('SELECT email, name, role FROM admins').all() as any[]).map((a) => ({ email: a.email, name: a.name, role: a.role }))
  res.json({ categories, units, admins })
})

function masterHandler(kind: 'categories' | 'units') {
  const table = kind === 'categories' ? 'master_categories' : 'master_units'
  return {
    create: (req: any, res: any) => {
      const parsed = z.object({ name: z.string().min(1).max(120) }).safeParse(req.body)
      if (!parsed.success) { res.status(400).json({ error: 'Nama wajib diisi.' }); return }
      try { getDb().prepare(`INSERT INTO ${table} (name, active) VALUES (?, 1)`).run(parsed.data.name) } catch { res.status(409).json({ error: 'Nama sudah ada.' }); return }
      addAudit(admin(req).name, 'MASTER_CHANGED', `${kind}: tambah ${parsed.data.name}`); res.status(201).json({ ok: true })
    },
    update: (req: any, res: any) => {
      const parsed = z.object({ name: z.string().min(1).max(120).optional(), active: z.boolean().optional() }).safeParse(req.body)
      if (!parsed.success) { res.status(400).json({ error: 'Data tidak valid.' }); return }
      const d = parsed.data
      if (d.name) { try { getDb().prepare(`UPDATE ${table} SET name = ? WHERE id = ?`).run(d.name, req.params.id) } catch { res.status(409).json({ error: 'Nama sudah ada.' }); return } }
      if (d.active !== undefined) getDb().prepare(`UPDATE ${table} SET active = ? WHERE id = ?`).run(d.active ? 1 : 0, req.params.id)
      addAudit(admin(req).name, 'MASTER_CHANGED', `${kind}: ubah #${req.params.id}`); res.json({ ok: true })
    },
    remove: (req: any, res: any) => {
      getDb().prepare(`UPDATE ${table} SET active = 0 WHERE id = ?`).run(req.params.id)
      addAudit(admin(req).name, 'MASTER_CHANGED', `${kind}: nonaktif #${req.params.id}`); res.json({ ok: true })
    },
  }
}

const cat = masterHandler('categories'); const unit = masterHandler('units')
adminRouter.post('/master/categories', requireRole('super_admin'), cat.create)
adminRouter.patch('/master/categories/:id', requireRole('super_admin'), cat.update)
adminRouter.delete('/master/categories/:id', requireRole('super_admin'), cat.remove)
adminRouter.post('/master/units', requireRole('super_admin'), unit.create)
adminRouter.patch('/master/units/:id', requireRole('super_admin'), unit.update)
adminRouter.delete('/master/units/:id', requireRole('super_admin'), unit.remove)
