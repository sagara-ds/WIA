import { Router } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { getDb, hashPin } from '../db'
import { ticketView } from '../tickets'
import { ticketSessionValid, refreshTicketSession } from '../middleware/auth'
import { rateLimit } from '../middleware/ratelimit'
import { evidenceUpload, uploadsDir, MAX_FILES, MAX_FILE_BYTES, ALLOWED_MIME } from './uploads'
import { renameSync, readdirSync } from 'fs'
import { join } from 'path'

const TICKET_ALPHABET = 'BCDFGHJKLMNPQRSTVWXYZ123456789'

interface UploadedFile extends Express.Multer.File {}

const reportSchema = z.object({
  category: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  chronology: z.string().trim().min(1).max(5000),
  incidentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid.'),
  incidentDateApprox: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => v === true || v === 'true'),
  location: z.string().trim().min(1).max(300),
  involvedParty: z.string().trim().min(1).max(300),
})

// Fase 3 — saat isi dikirim terenkripsi, field sensitif tidak pernah menyentuh server.
// Hanya metadata (kategori, tanggal) yang divalidasi plaintext.
const encFieldsSchema = z.object({
  category: z.string().trim().min(1).max(100),
  incidentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid.'),
  incidentDateApprox: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => v === true || v === 'true'),
})

const encEnvelopeSchema = z.object({
  encJson: z.string().min(1).max(200000),
  wrappedKey: z.string().min(1).max(20000),
  recoverySalt: z.string().min(1).max(200),
})

// Fase 3 (T3.3) — metadata bukti divalidasi server: MIME asli, ukuran, nama.
// Blob yang datang bisa berupa ciphertext (octet-stream), jadi MIME asli dibawa di sini.
const evidenceMetaSchema = z.array(
  z.object({
    name: z.string().min(1).max(255),
    size: z.number().int().positive().max(MAX_FILE_BYTES),
    mime: z.string().refine((m) => (ALLOWED_MIME as readonly string[]).includes(m), 'Jenis berkas tidak didukung.'),
    enc: z.boolean().optional(),
  }),
)

function readEvidenceMeta(raw: unknown): z.infer<typeof evidenceMetaSchema> | null | 'invalid' {
  if (typeof raw !== 'string' || raw.length === 0) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return 'invalid'
  }
  const result = evidenceMetaSchema.safeParse(parsed)
  if (!result.success) return 'invalid'
  return result.data
}

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

function evidenceCount(number: string): number {
  return (getDb().prepare('SELECT COUNT(*) AS c FROM ticket_evidence WHERE ticket_number = ?').get(number) as { c: number }).c
}

type EvidenceMetaRow = { name: string; size: number; mime: string; enc?: boolean }

function insertEvidence(
  number: string,
  file: UploadedFile,
  kind: 'initial' | 'reply',
  at: string,
  meta?: EvidenceMetaRow | null,
): void {
  const id = `ev-${crypto.randomBytes(6).toString('hex')}`
  const ext = file.filename.slice(file.filename.indexOf('.'))
  renameSync(join(uploadsDir, file.filename), join(uploadsDir, `${id}${ext}`))
  getDb()
    .prepare('INSERT INTO ticket_evidence (id, ticket_number, name, size, mime, kind, at, enc) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(
      id,
      number,
      meta ? meta.name : Buffer.from(file.originalname, 'latin1').toString('utf8'),
      meta ? meta.size : file.size,
      meta ? meta.mime : file.mimetype,
      kind,
      at,
      meta?.enc ? 1 : 0,
    )
}

export const publicRouter = Router()

publicRouter.get('/categories', (_req, res) => {
  const rows = getDb()
    .prepare('SELECT name FROM master_categories WHERE active = 1 ORDER BY name')
    .all() as { name: string }[]
  res.json(rows.map((r) => r.name))
})

publicRouter.post('/reports', evidenceUpload.array('files', MAX_FILES), (req, res) => {
  let fieldsRaw: unknown
  try {
    fieldsRaw = JSON.parse(String(req.body.fields ?? '{}'))
  } catch {
    res.status(400).json({ error: 'Isian laporan tidak valid.' })
    return
  }

  let enc: z.infer<typeof encEnvelopeSchema> | null = null
  let fields:
    | z.infer<typeof encFieldsSchema>
    | z.infer<typeof reportSchema>
  if (typeof req.body.enc === 'string' && req.body.enc.length > 0) {
    let encRaw: unknown
    try {
      encRaw = JSON.parse(req.body.enc)
    } catch {
      res.status(400).json({ error: 'Envelope enkripsi tidak valid.' })
      return
    }
    const encParsed = encEnvelopeSchema.safeParse(encRaw)
    const fieldsParsed = encFieldsSchema.safeParse(fieldsRaw)
    if (!encParsed.success || !fieldsParsed.success) {
      res.status(400).json({ error: 'Isian laporan tidak valid.' })
      return
    }
    enc = encParsed.data
    fields = fieldsParsed.data
  } else {
    const parsed = reportSchema.safeParse(fieldsRaw)
    if (!parsed.success) {
      res.status(400).json({ error: 'Isian laporan tidak valid.' })
      return
    }
    fields = parsed.data
  }

  const files = (req.files ?? []) as UploadedFile[]
  const meta = readEvidenceMeta(req.body.evidenceMeta)
  if (meta === 'invalid' || (meta && meta.length !== files.length)) {
    res.status(400).json({ error: 'Metadata bukti tidak valid.' })
    return
  }
  if (enc && files.length > 0 && !meta) {
    res.status(400).json({ error: 'Metadata bukti wajib untuk laporan terenkripsi.' })
    return
  }
  const db = getDb()

  const category = db.prepare('SELECT 1 FROM master_categories WHERE name = ? AND active = 1').get(fields.category)
  if (!category) {
    res.status(400).json({ error: 'Kategori tidak dikenal.' })
    return
  }

  const number = generateTicketNumber()
  const pin = Array.from(crypto.randomBytes(6), (b) => String(b % 10)).join('')
  const now = new Date().toISOString()

  const tx = db.transaction(() => {
    if (enc) {
      db.prepare(
        `INSERT INTO tickets (number, pin_hash, title, category, chronology, incident_date, incident_date_approx, location, involved_party, status, created_at, enc_json, wrapped_key, recovery_salt, encrypted)
         VALUES (?, ?, ?, ?, '', ?, ?, '', '', 'Diterima', ?, ?, ?, ?, 1)`,
      ).run(number, hashPin(pin), '[Terlampir terenkripsi]', fields.category, fields.incidentDate, fields.incidentDateApprox ? 1 : 0, now, enc.encJson, enc.wrappedKey, enc.recoverySalt)
    } else {
      const f = fields as z.infer<typeof reportSchema>
      db.prepare(
        `INSERT INTO tickets (number, pin_hash, title, category, chronology, incident_date, incident_date_approx, location, involved_party, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Diterima', ?)`,
      ).run(number, hashPin(pin), f.title, f.category, f.chronology, f.incidentDate, f.incidentDateApprox ? 1 : 0, f.location, f.involvedParty, now)
    }
    db.prepare('INSERT INTO ticket_timeline (ticket_number, at, label, waiter, note) VALUES (?, ?, ?, 0, NULL)').run(number, now, 'Diterima')
    for (let i = 0; i < files.length; i++) insertEvidence(number, files[i], 'initial', now, meta?.[i])
  })
  tx()

  res.status(201).json({ number, pin })
})

publicRouter.post(
  '/tickets/check',
  rateLimit({ windowMs: 60 * 1000, max: 10 }),
  (req, res) => {
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
  },
)

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

publicRouter.post('/tickets/:number/replies', evidenceUpload.array('files', MAX_FILES), (req, res) => {
  const number = String(req.params.number).toUpperCase()
  if (!ticketSessionValid(req, number)) {
    res.status(401).json({ error: 'Sesi tiket berakhir. Masukkan nomor tiket dan PIN kembali.' })
    return
  }
  const isEnc = String(req.body.encBody ?? '') === '1'
  const rawBody = String(req.body.body ?? '')
  const parsed = isEnc
    ? z.string().min(1).max(40000).safeParse(rawBody)
    : z.string().trim().min(1).max(5000).safeParse(rawBody)
  if (!parsed.success) {
    res.status(400).json({ error: 'Balasan tidak valid.' })
    return
  }
  const db = getDb()
  const exists = db.prepare('SELECT 1 FROM tickets WHERE number = ?').get(number)
  if (!exists) {
    res.status(404).json({ error: 'Tiket tidak ditemukan.' })
    return
  }
  const files = (req.files ?? []) as UploadedFile[]
  if (evidenceCount(number) + files.length > MAX_FILES) {
    res.status(400).json({ error: 'Jumlah berkas melebihi batas maksimal 5.' })
    return
  }
  const meta = readEvidenceMeta(req.body.evidenceMeta)
  if (meta === 'invalid' || (meta && meta.length !== files.length)) {
    res.status(400).json({ error: 'Metadata bukti tidak valid.' })
    return
  }
  if (isEnc && files.length > 0 && !meta) {
    res.status(400).json({ error: 'Metadata bukti wajib untuk balasan terenkripsi.' })
    return
  }

  const now = new Date().toISOString()
  const body = parsed.data
  const first = files[0]

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM ticket_timeline WHERE ticket_number = ? AND waiter = 1').run(number)
    db.prepare('INSERT INTO ticket_timeline (ticket_number, at, label, waiter, note) VALUES (?, ?, ?, 0, NULL)').run(number, now, 'Balasan diterima')
    db.prepare('INSERT INTO ticket_timeline (ticket_number, at, label, waiter, note) VALUES (?, ?, ?, 1, NULL)').run(number, now, 'Menunggu pemeriksaan admin')
    db.prepare('INSERT INTO ticket_messages (id, ticket_number, at, author, body, is_enc, attachment_name, attachment_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      `msg-${crypto.randomUUID()}`,
      number,
      now,
      'pelapor',
      body,
      isEnc ? 1 : 0,
      first ? (meta?.[0] ? meta[0].name : Buffer.from(first.originalname, 'latin1').toString('utf8')) : null,
      first ? (meta?.[0] ? meta[0].size : first.size) : null,
    )
    for (let i = 0; i < files.length; i++) insertEvidence(number, files[i], 'reply', now, meta?.[i])
  })
  tx()

  res.json({ ticket: ticketView(number) })
})

// Fase 3 (T3.4) — public key admin untuk membungkus data key (publik memang boleh terbuka)
publicRouter.get('/public-key', (_req, res) => {
  const row = getDb()
    .prepare("SELECT public_key FROM admins WHERE public_key IS NOT NULL LIMIT 1")
    .get() as { public_key: string } | undefined
  res.json({ publicJwk: row?.public_key ?? null })
})

// Fase 3 (T3.4) — pelapor secara eksplisit mengizinkan admin membaca isi
publicRouter.post('/tickets/:number/share', (req, res) => {
  const number = String(req.params.number).toUpperCase()
  if (!ticketSessionValid(req, number)) {
    res.status(401).json({ error: 'Sesi tiket berakhir. Masukkan nomor tiket dan PIN kembali.' })
    return
  }
  const schema = z.object({ adminWrappedKey: z.string().min(1).max(50000) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Wrapped key tidak valid.' })
    return
  }
  const db = getDb()
  const exists = db.prepare('SELECT 1 FROM tickets WHERE number = ?').get(number)
  if (!exists) {
    res.status(404).json({ error: 'Tiket tidak ditemukan.' })
    return
  }
  db.prepare('UPDATE tickets SET admin_wrapped_key = ?, shared = 1 WHERE number = ?').run(
    parsed.data.adminWrappedKey,
    number,
  )
  db.prepare('INSERT INTO audit_log (at, actor, action, detail) VALUES (?, ?, ?, ?)').run(
    new Date().toISOString(),
    'Pelapor',
    'SHARE_GRANTED',
    `${number} · Pelapor mengizinkan admin membaca isi.`,
  )
  res.json({ ok: true })
})

publicRouter.get('/tickets/:number/evidence/:id', (req, res) => {
  const number = req.params.number.toUpperCase()
  const id = req.params.id
  const isReporter = ticketSessionValid(req, number)
  const isAdmin = Boolean(req.session.admin)
  if (!isReporter && !isAdmin) {
    res.status(401).json({ error: 'Akses bukti memerlukan sesi tiket atau sesi petugas.' })
    return
  }
  const row = getDb()
    .prepare('SELECT name, mime FROM ticket_evidence WHERE id = ? AND ticket_number = ?')
    .get(id, number) as { name: string; mime: string } | undefined
  if (!row) {
    res.status(404).json({ error: 'Bukti tidak ditemukan.' })
    return
  }
  const prefix = `${id}.`
  const found = readdirSync(uploadsDir).find((f) => f.startsWith(prefix))
  if (!found) {
    res.status(404).json({ error: 'Berkas contoh tidak tersedia pada simulasi ini.' })
    return
  }
  res.download(join(uploadsDir, found), row.name)
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
