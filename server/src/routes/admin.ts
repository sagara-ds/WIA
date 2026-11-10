import { Router } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { getDb } from '../db'
import { ticketView, allowedTransitions } from '../tickets'
import { requireAuth } from '../middleware/auth'

const statusSchema = z.enum([
  'Diterima',
  'Perlu Dilengkapi',
  'Diverifikasi',
  'Ditolak',
  'Diteruskan',
  'Ditindaklanjuti',
  'Selesai',
])

const transitionSchema = z.object({
  toStatus: statusSchema,
  note: z.string().trim().min(1, 'Catatan wajib diisi.').max(2000),
  internal: z.string().trim().max(2000).optional().default(''),
  extra: z
    .object({
      unit: z.string().trim().max(200).optional(),
      resultSummary: z.string().trim().max(5000).optional(),
      resultFile: z.object({ name: z.string().min(1).max(255), size: z.number().int().nonnegative() }).optional(),
      messageToReporter: z.string().trim().max(5000).optional(),
    })
    .optional(),
})

export const adminRouter = Router()

adminRouter.use(requireAuth)

adminRouter.get('/tickets', (req, res) => {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT number FROM tickets
       WHERE status NOT IN ('Selesai', 'Ditolak')
       ORDER BY created_at DESC`,
    )
    .all() as { number: string }[]
  let list = rows.map((r) => ticketView(r.number)!).filter(Boolean)

  const status = typeof req.query.status === 'string' ? req.query.status : ''
  const category = typeof req.query.category === 'string' ? req.query.category : ''
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : ''

  if (status) list = list.filter((t) => t.status === status)
  if (category) list = list.filter((t) => t.category === category)
  if (search) {
    list = list.filter((t) => t.title.toLowerCase().includes(search) || t.number.toLowerCase().includes(search))
  }
  res.json(list)
})

adminRouter.get('/tickets/:number', (req, res) => {
  const number = req.params.number.toUpperCase()
  const view = ticketView(number)
  if (!view) {
    res.status(404).json({ error: 'Tiket tidak ditemukan.' })
    return
  }
  const db = getDb()
  const admin = req.session.admin!
  db.prepare('INSERT INTO audit_log (at, actor, action, detail) VALUES (?, ?, ?, ?)').run(
    new Date().toISOString(),
    admin.name,
    'REPORT_VIEWED',
    `${number} · Akses detail tercatat.`,
  )
  const notes = db
    .prepare('SELECT id, at, admin, body FROM internal_notes WHERE ticket_number = ? ORDER BY rowid')
    .all(number) as { id: string; at: string; admin: string; body: string }[]
  res.json({ ticket: view, internalNotes: notes })
})

// T2.2 — pesan dua arah: admin mengirim pesan ke pelapor (tanpa identitas, tanpa lampiran)
const messageSchema = z.object({ body: z.string().trim().min(1, 'Pesan wajib diisi.').max(5000) })

adminRouter.post('/tickets/:number/messages', (req, res) => {
  const number = req.params.number.toUpperCase()
  const parsed = messageSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Pesan tidak valid.' })
    return
  }
  const db = getDb()
  const exists = db.prepare('SELECT 1 FROM tickets WHERE number = ?').get(number)
  if (!exists) {
    res.status(404).json({ error: 'Tiket tidak ditemukan.' })
    return
  }
  db.prepare(
    'INSERT INTO ticket_messages (id, ticket_number, at, author, body, attachment_name, attachment_size) VALUES (?, ?, ?, ?, ?, NULL, NULL)',
  ).run(`msg-${crypto.randomUUID()}`, number, new Date().toISOString(), 'admin', parsed.data.body)
  res.status(201).json(ticketView(number))
})

adminRouter.patch('/tickets/:number/status', (req, res) => {
  const number = req.params.number.toUpperCase()
  const parsed = transitionSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Isian transisi tidak valid.', detail: parsed.error.issues[0]?.message })
    return
  }
  const { toStatus, note, internal, extra } = parsed.data
  const db = getDb()
  const admin = req.session.admin!

  const row = db.prepare('SELECT status FROM tickets WHERE number = ?').get(number) as { status: string } | undefined
  if (!row) {
    res.status(404).json({ error: 'Tiket tidak ditemukan.' })
    return
  }

  const allowed = allowedTransitions(row.status)
  if (!allowed.includes(toStatus)) {
    res.status(409).json({ error: `Transisi dari ${row.status} ke ${toStatus} tidak diizinkan.` })
    return
  }
  if (toStatus === 'Selesai' && !extra?.resultSummary) {
    res.status(400).json({ error: 'Status Selesai wajib menyertakan ringkasan hasil.' })
    return
  }
  if (toStatus === 'Diteruskan' && !extra?.unit) {
    res.status(400).json({ error: 'Status Diteruskan wajib memilih unit tujuan.' })
    return
  }
  if (toStatus === 'Diteruskan' && extra?.unit) {
    const unitOk = db.prepare('SELECT 1 FROM master_units WHERE name = ? AND active = 1').get(extra.unit)
    if (!unitOk) {
      res.status(400).json({ error: 'Unit tujuan tidak aktif atau tidak dikenal.' })
      return
    }
  }

  const now = new Date().toISOString()
  const timelineNote = extra?.unit ? `${note} (Unit: ${extra.unit})` : note

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM ticket_timeline WHERE ticket_number = ? AND waiter = 1').run(number)
    db.prepare('INSERT INTO ticket_timeline (ticket_number, at, label, waiter, note) VALUES (?, ?, ?, 0, ?)').run(
      number,
      now,
      toStatus,
      timelineNote,
    )
    if (toStatus === 'Perlu Dilengkapi') {
      db.prepare('INSERT INTO ticket_timeline (ticket_number, at, label, waiter, note) VALUES (?, ?, ?, 1, NULL)').run(
        number,
        now,
        'Menunggu tanggapan pelapor',
      )
    }
    if (extra?.messageToReporter) {
      db.prepare('INSERT INTO ticket_messages (id, ticket_number, at, author, body, attachment_name, attachment_size) VALUES (?, ?, ?, ?, ?, NULL, NULL)').run(
        `msg-${crypto.randomUUID()}`,
        number,
        now,
        'admin',
        extra.messageToReporter,
      )
    }
    db.prepare(
      `UPDATE tickets SET
         status = ?,
         completed_at = CASE WHEN ? = 'Selesai' THEN ? ELSE completed_at END,
         result_summary = COALESCE(?, result_summary),
         result_file_name = COALESCE(?, result_file_name),
         result_file_size = COALESCE(?, result_file_size)
       WHERE number = ?`,
    ).run(
      toStatus,
      toStatus,
      now,
      extra?.resultSummary ?? null,
      extra?.resultFile?.name ?? null,
      extra?.resultFile?.size ?? null,
      number,
    )
    if (internal) {
      db.prepare('INSERT INTO internal_notes (id, ticket_number, at, admin, body) VALUES (?, ?, ?, ?, ?)').run(
        `note-${crypto.randomUUID()}`,
        number,
        now,
        admin.name,
        internal,
      )
    }
    db.prepare('INSERT INTO audit_log (at, actor, action, detail) VALUES (?, ?, ?, ?)').run(
      now,
      admin.name,
      'STATUS_CHANGED',
      `${toStatus} · ${number} · Catatan: ${note.slice(0, 50)}${note.length > 50 ? '...' : ''}`,
    )
  })
  tx()

  res.json(ticketView(number))
})

// Fase 3 (T3.4) — admin mengunggah public key (privat tetap di browser admin)
adminRouter.put('/public-key', (req, res) => {
  const schema = z.object({ publicJwk: z.string().min(1).max(20000) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Public key tidak valid.' })
    return
  }
  try {
    const jwk = JSON.parse(parsed.data.publicJwk) as { kty?: string }
    if (jwk.kty !== 'RSA') throw new Error('bukan RSA')
  } catch {
    res.status(400).json({ error: 'Public key tidak valid.' })
    return
  }
  const admin = req.session.admin!
  getDb().prepare('UPDATE admins SET public_key = ? WHERE email = ?').run(parsed.data.publicJwk, admin.email)
  res.json({ ok: true })
})

adminRouter.get('/audit', (req, res) => {
  const rows = getDb()
    .prepare('SELECT id, at, actor, action, detail FROM audit_log ORDER BY id DESC')
    .all() as { id: number; at: string; actor: string; action: string; detail: string }[]
  res.json(rows.map((r) => ({ ...r, id: `audit-${r.id}` })))
})

adminRouter.get('/master', (req, res) => {
  const db = getDb()
  const categories = db
    .prepare('SELECT id, name, active FROM master_categories ORDER BY name')
    .all() as { id: number; name: string; active: number }[]
  const units = db.prepare('SELECT id, name, active FROM master_units ORDER BY id').all() as { id: number; name: string; active: number }[]
  const admins = db.prepare('SELECT email, name, role FROM admins ORDER BY email').all() as { email: string; name: string; role: string }[]
  res.json({
    categories: categories.map((c) => ({ id: `c${c.id}`, name: c.name, active: c.active === 1 })),
    units: units.map((u) => ({ id: `u${u.id}`, name: u.name, active: u.active === 1 })),
    admins,
  })
})

// T2.3 — CRUD master data (tambah / edit nama / nonaktifkan)
const MASTER_TABLES = { categories: 'master_categories', units: 'master_units' } as const
type MasterKind = keyof typeof MASTER_TABLES

const masterNameSchema = z.object({ name: z.string().trim().min(1, 'Nama wajib diisi.').max(100) })
const masterPatchSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama wajib diisi.').max(100).optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => v.name !== undefined || v.active !== undefined, { message: 'Tidak ada perubahan.' })

function parseMasterKind(raw: string): MasterKind | null {
  return raw === 'categories' || raw === 'units' ? raw : null
}

function parseMasterId(param: string): number | null {
  const n = Number(param.replace(/^[cu]/, ''))
  return Number.isInteger(n) && n > 0 ? n : null
}

function logMasterChange(actor: string, detail: string): void {
  getDb()
    .prepare('INSERT INTO audit_log (at, actor, action, detail) VALUES (?, ?, ?, ?)')
    .run(new Date().toISOString(), actor, 'MASTER_CHANGED', detail)
}

adminRouter.post('/master/:kind', (req, res) => {
  const kind = parseMasterKind(req.params.kind)
  if (!kind) {
    res.status(404).json({ error: 'Master data tidak dikenal.' })
    return
  }
  const parsed = masterNameSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Nama wajib diisi.' })
    return
  }
  const table = MASTER_TABLES[kind]
  const db = getDb()
  const dup = db.prepare(`SELECT 1 FROM ${table} WHERE LOWER(name) = LOWER(?)`).get(parsed.data.name)
  if (dup) {
    res.status(409).json({ error: 'Nama sudah dipakai.' })
    return
  }
  const result = db.prepare(`INSERT INTO ${table} (name, active) VALUES (?, 1)`).run(parsed.data.name)
  const admin = req.session.admin!
  const label = kind === 'categories' ? 'Kategori' : 'Unit'
  logMasterChange(admin.name, `${label} ditambahkan: ${parsed.data.name}`)
  res.status(201).json({ id: `${kind === 'categories' ? 'c' : 'u'}${result.lastInsertRowid}`, name: parsed.data.name, active: true })
})

adminRouter.patch('/master/:kind/:id', (req, res) => {
  const kind = parseMasterKind(req.params.kind)
  if (!kind) {
    res.status(404).json({ error: 'Master data tidak dikenal.' })
    return
  }
  const id = parseMasterId(req.params.id)
  if (!id) {
    res.status(404).json({ error: 'Item tidak ditemukan.' })
    return
  }
  const parsed = masterPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Isian tidak valid.' })
    return
  }
  const table = MASTER_TABLES[kind]
  const db = getDb()
  const row = db.prepare(`SELECT id, name, active FROM ${table} WHERE id = ?`).get(id) as
    | { id: number; name: string; active: number }
    | undefined
  if (!row) {
    res.status(404).json({ error: 'Item tidak ditemukan.' })
    return
  }
  if (parsed.data.name && parsed.data.name.toLowerCase() !== row.name.toLowerCase()) {
    const dup = db.prepare(`SELECT 1 FROM ${table} WHERE LOWER(name) = LOWER(?) AND id != ?`).get(parsed.data.name, id)
    if (dup) {
      res.status(409).json({ error: 'Nama sudah dipakai.' })
      return
    }
  }
  db.prepare(`UPDATE ${table} SET name = COALESCE(?, name), active = COALESCE(?, active) WHERE id = ?`).run(
    parsed.data.name ?? null,
    parsed.data.active === undefined ? null : parsed.data.active ? 1 : 0,
    id,
  )
  const admin = req.session.admin!
  const label = kind === 'categories' ? 'Kategori' : 'Unit'
  const finalName = parsed.data.name ?? row.name
  if (parsed.data.name && parsed.data.name !== row.name) {
    logMasterChange(admin.name, `${label} diubah: ${row.name} → ${parsed.data.name}`)
  }
  if (parsed.data.active !== undefined) {
    logMasterChange(admin.name, `${label} ${parsed.data.active ? 'diaktifkan' : 'dinonaktifkan'}: ${finalName}`)
  }
  res.json({
    id: `${kind === 'categories' ? 'c' : 'u'}${id}`,
    name: parsed.data.name ?? row.name,
    active: parsed.data.active ?? row.active === 1,
  })
})
