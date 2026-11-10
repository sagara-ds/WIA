import { Router } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { getDb, hashPin } from '../db'
import { ticketView } from '../tickets'
import { ticketSessionValid, refreshTicketSession } from '../middleware/auth'
import { rateLimit } from '../middleware/ratelimit'

const TICKET_ALPHABET = 'BCDFGHJKLMNPQRSTVWXYZ123456789'
const MAX_FILES = 5
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_FILE_BYTES = 10 * 1024 * 1024

const evidenceSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
  mime: z.string().refine((m) => ALLOWED_MIME.includes(m), 'Jenis berkas tidak didukung.'),
  kind: z.enum(['initial', 'reply']),
  at: z.string().min(1).max(64),
})

const reportSchema = z.object({
  fields: z.object({
    category: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(200),
    chronology: z.string().trim().min(1).max(5000),
    incidentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid.'),
    incidentDateApprox: z.boolean(),
    location: z.string().trim().min(1).max(300),
    involvedParty: z.string().trim().min(1).max(300),
  }),
  evidence: z.array(evidenceSchema).max(MAX_FILES),
})

const replySchema = z.object({
  body: z.string().trim().min(1).max(5000),
  evidence: z.array(evidenceSchema).max(MAX_FILES),
})

function generateTicketNumber(): string {
  const db = getDb()
  const exists = db.prepare('SELECT 1 FROM tickets WHERE number = ?')
  for (;;) {
    let code = ''
    const buf = crypto.randomBytes(5)
    for (const b of buf) code += TICKET_ALPHABET[b % TICKET_ALPHABET.length]
    const number = `SIAP-${code}`
    if (!exists.get(number)) return number
  }
}

export const publicRouter = Router()

publicRouter.get('/categories', (_req, res) => {
  const rows = getDb()
    .prepare('SELECT name FROM master_categories WHERE active = 1 ORDER BY name')
    .all() as { name: string }[]
  res.json(rows.map((r) => r.name))
})

publicRouter.post('/reports', (req, res) => {
  const parsed = reportSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Isian laporan tidak valid.' })
    return
  }
  const { fields, evidence } = parsed.data
  const db = getDb()

  const category = db.prepare('SELECT 1 FROM master_categories WHERE name = ? AND active = 1').get(fields.category)
  if (!category) {
    res.status(400).json({ error: 'Kategori tidak dikenal.' })
    return
  }
  if (evidence.some((e) => e.size > MAX_FILE_BYTES)) {
    res.status(400).json({ error: 'Ukuran berkas melebihi 10 MB.' })
    return
  }

  const number = generateTicketNumber()
  const pin = Array.from(crypto.randomBytes(6), (b) => String(b % 10)).join('')
  const now = new Date().toISOString()

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO tickets (number, pin_hash, title, category, chronology, incident_date, incident_date_approx, location, involved_party, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Diterima', ?)`,
    ).run(number, hashPin(pin), fields.title, fields.category, fields.chronology, fields.incidentDate, fields.incidentDateApprox ? 1 : 0, fields.location, fields.involvedParty, now)
    db.prepare('INSERT INTO ticket_timeline (ticket_number, at, label, waiter, note) VALUES (?, ?, ?, 0, NULL)').run(number, now, 'Diterima')
    const insertEvidence = db.prepare('INSERT INTO ticket_evidence (id, ticket_number, name, size, mime, kind, at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    for (const e of evidence) {
      insertEvidence.run(e.id, number, e.name, e.size, e.mime, 'initial', now)
    }
  })
  tx()

  res.status(201).json({ number, pin })
})

publicRouter.post('/tickets/check', rateLimit({ windowMs: 60 * 1000, max: 10 }), (req, res) => {
  const schema = z.object({ number: z.string().trim().min(1).max(32), pin: z.string().trim().min(1).max(16) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Tiket atau PIN tidak ditemukan.' })
    return
  }
  const number = parsed.data.number.toUpperCase()
  const row = getDb().prepare('SELECT pin_hash FROM tickets WHERE number = ?').get(number) as { pin_hash: string } | undefined
  if (!row) {
    res.status(401).json({ error: 'Tiket atau PIN tidak ditemukan.' })
    return
  }
  const [saltHex, hashHex] = row.pin_hash.split('$')
  const candidate = hashPin(parsed.data.pin, saltHex)
  if (candidate !== `${saltHex}$${hashHex}`) {
    res.status(401).json({ error: 'Tiket atau PIN tidak ditemukan.' })
    return
  }
  refreshTicketSession(req, number)
  res.json(ticketView(number))
})

publicRouter.get('/tickets/:number', (req, res) => {
  const number = req.params.number.toUpperCase()
  if (!ticketSessionValid(req, number)) {
    res.status(401).json({ error: 'Sesi tiket berakhir. Masukkan nomor tiket dan PIN kembali.' })
    return
  }
  const view = ticketView(number)
  if (!view) {
    res.status(404).json({ error: 'Tiket tidak ditemukan.' })
    return
  }
  res.json(view)
})

publicRouter.post('/tickets/:number/replies', (req, res) => {
  const number = req.params.number.toUpperCase()
  if (!ticketSessionValid(req, number)) {
    res.status(401).json({ error: 'Sesi tiket berakhir. Masukkan nomor tiket dan PIN kembali.' })
    return
  }
  const parsed = replySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Balasan tidak valid.' })
    return
  }
  const { body, evidence } = parsed.data
  const db = getDb()
  const exists = db.prepare('SELECT 1 FROM tickets WHERE number = ?').get(number)
  if (!exists) {
    res.status(404).json({ error: 'Tiket tidak ditemukan.' })
    return
  }
  const count = (db.prepare('SELECT COUNT(*) AS c FROM ticket_evidence WHERE ticket_number = ?').get(number) as { c: number }).c
  if (count + evidence.length > MAX_FILES) {
    res.status(400).json({ error: 'Jumlah berkas melebihi batas maksimal 5.' })
    return
  }

  const now = new Date().toISOString()
  const msgId = `msg-${crypto.randomUUID()}`
  const first = evidence[0]

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM ticket_timeline WHERE ticket_number = ? AND waiter = 1').run(number)
    db.prepare('INSERT INTO ticket_timeline (ticket_number, at, label, waiter, note) VALUES (?, ?, ?, 0, NULL)').run(number, now, 'Balasan diterima')
    db.prepare('INSERT INTO ticket_timeline (ticket_number, at, label, waiter, note) VALUES (?, ?, ?, 1, NULL)').run(number, now, 'Menunggu pemeriksaan admin')
    db.prepare('INSERT INTO ticket_messages (id, ticket_number, at, author, body, attachment_name, attachment_size) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      msgId,
      number,
      now,
      'pelapor',
      body,
      first ? first.name : null,
      first ? first.size : null,
    )
    const insertEvidence = db.prepare('INSERT INTO ticket_evidence (id, ticket_number, name, size, mime, kind, at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    for (const e of evidence) {
      insertEvidence.run(e.id, number, e.name, e.size, e.mime, 'reply', now)
    }
  })
  tx()

  res.json({ ticket: ticketView(number) })
})

publicRouter.get('/transparency', (_req, res) => {
  res.json({
    period: 'Oktober 2026',
    updated: '30 Oktober 2026, 12.00 WIB',
    stats: [
      { value: '128', label: 'Laporan masuk' },
      { value: '46', label: 'Dalam proses' },
      { value: '64', label: 'Selesai' },
      { value: '8,2 hari', label: 'Rata-rata penanganan' },
    ],
    perKategori: 'Pungutan liar 48 · Penyalahgunaan anggaran 36 · Fasilitas 28 · Lainnya 16',
    tren: 'Juli 72 · Agustus 89 · September 104 · Oktober 128',
    perKategoriData: [
      { label: 'Pungutan liar', value: 48 },
      { label: 'Penyalahgunaan anggaran', value: 36 },
      { label: 'Penyalahgunaan fasilitas', value: 28 },
      { label: 'Lainnya', value: 16 },
    ],
    trenData: [
      { label: 'Juli', value: 72 },
      { label: 'Agustus', value: 89 },
      { label: 'September', value: 104 },
      { label: 'Oktober', value: 128 },
    ],
  })
})
