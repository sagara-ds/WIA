import { Router } from 'express'
import multer from 'multer'
import { randomUUID, randomBytes, pbkdf2Sync } from 'crypto'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'
import { getDb, ticketRow, toTicketView, addAudit, hashPinExport, nowISO } from '../db'
import { requireTicketSession, rateLimit } from '../middleware/auth'
import { ALLOWED_MIME, MAX_FILE_BYTES, MAX_FILES } from '../lib/constants'

export const publicRouter = Router()

mkdirSync(join(__dirname, '../../uploads'), { recursive: true })

const storage = multer.diskStorage({
  destination: join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}.enc`),
})
export const upload = multer({ storage, limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES } })

const ALPHABET = 'BCDFGHJKLMNPQRSTVWXYZ123456789'
function genNumber(): string {
  for (;;) {
    const buf = randomBytes(5)
    const code = [...buf].map((b) => ALPHABET[b % ALPHABET.length]).join('')
    const n = `SIAP-${code}`
    if (!ticketRow(n)) return n
  }
}
function genPin(): string { return [...randomBytes(6)].map((b) => String(b % 10)).join('') }

const fieldsSchema = z.object({
  category: z.string().min(1).max(80),
  title: z.string().min(1).max(300),
  chronology: z.string().min(1).max(20000),
  incidentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  incidentDateApprox: z.boolean(),
  location: z.string().min(1).max(500),
  involvedParty: z.string().min(1).max(500),
})

publicRouter.get('/categories', (_req, res) => {
  const rows = getDb().prepare('SELECT name FROM master_categories WHERE active = 1 ORDER BY name').all() as any[]
  res.json(rows.map((r) => r.name))
})

publicRouter.post('/reports', upload.array('files', MAX_FILES), (req, res) => {
  let body: any, evidenceMeta: any[] = []
  try { body = JSON.parse(String((req.body as any)?.body ?? '')); evidenceMeta = JSON.parse(String((req.body as any)?.evidence ?? '[]')) } catch { res.status(400).json({ error: 'Body tidak valid.' }); return }
  const parsed = fieldsSchema.safeParse(body.fields)
  if (!parsed.success) { res.status(400).json({ error: 'Isian tidak valid.' }); return }
  const f = parsed.data
  if ((req.files as any[] | undefined)?.length !== evidenceMeta.length) { res.status(400).json({ error: 'Jumlah berkas tidak cocok.' }); return }
  for (const m of evidenceMeta) {
    if (!ALLOWED_MIME.includes(m.mime) || m.size > MAX_FILE_BYTES) { res.status(400).json({ error: `Berkas ${m.name} belum didukung.` }); return }
  }
  const enc = body.enc as { encJson: string; wrappedKey: string; salt: string } | undefined
  const number = genNumber()
  const pin = genPin()
  const pinHash = hashPinExport(pin)
  const now = nowISO()
  const db = getDb()
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO tickets (number, pin_hash, title, category, chronology, incident_date, incident_date_approx, location, involved_party, status, created_at, enc_json, wrapped_key, salt, encrypted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Diterima', ?, ?, ?, ?, ?)`).run(
      number, pinHash, enc ? 'TERENKRIPSI' : f.title, f.category, enc ? '' : f.chronology, f.incidentDate, f.incidentDateApprox ? 1 : 0,
      enc ? '' : f.location, enc ? '' : f.involvedParty, now, enc?.encJson ?? null, enc?.wrappedKey ?? null, enc?.salt ?? null, enc ? 1 : 0,
    )
    db.prepare(`INSERT INTO ticket_timeline (ticket_number, at, label) VALUES (?, ?, 'Diterima')`).run(number, now)
    const files = (req.files as any[]) || []
    for (let i = 0; i < files.length; i++) {
      const m = evidenceMeta[i]
      db.prepare(`INSERT INTO ticket_evidence (id, ticket_number, name, size, mime, kind, at, stored_name, orig_mime, enc) VALUES (?, ?, ?, ?, ?, 'initial', ?, ?, ?, ?)`).run(randomUUID(), number, m.name, m.size, 'application/octet-stream', now, files[i].filename, m.mime, enc ? 1 : 0)
    }
  })
  tx()
  ;(req.session as any).ticketNumber = number
  res.status(201).json({ number, pin })
})

publicRouter.post('/tickets/check', rateLimit(10, 60_000), (req, res) => {
  const parsed = z.object({ number: z.string().min(1).max(20), pin: z.string().regex(/^\d{6}$/) }).safeParse(req.body)
  if (!parsed.success) { res.status(401).json({ error: 'Tiket atau PIN tidak ditemukan.' }); return }
  const row = getDb().prepare('SELECT * FROM tickets WHERE UPPER(number) = ?').get(parsed.data.number.trim().toUpperCase()) as any
  if (!row) { res.status(401).json({ error: 'Tiket atau PIN tidak ditemukan.' }); return }
  const [saltHex, hashHex] = row.pin_hash.split('$')
  const hash = pbkdf2Sync(parsed.data.pin.trim(), Buffer.from(saltHex, 'hex'), 150000, 32, 'sha256')
  if (!hash.equals(Buffer.from(hashHex, 'hex'))) { res.status(401).json({ error: 'Tiket atau PIN tidak ditemukan.' }); return }
  ;(req.session as any).ticketNumber = row.number
  res.json(toTicketView(row))
})

publicRouter.get('/tickets/:number', requireTicketSession, (req, res) => {
  const row = ticketRow(String(req.params.number))
  if (!row) { res.status(404).json({ error: 'Tiket tidak ditemukan.' }); return }
  res.json(toTicketView(row))
})

publicRouter.post('/tickets/:number/replies', requireTicketSession, upload.array('files', MAX_FILES), (req, res) => {
  const row = ticketRow(String(req.params.number))
  if (!row) { res.status(404).json({ error: 'Tiket tidak ditemukan.' }); return }
  const body = z.object({ body: z.string().min(1).max(20000), encBody: z.boolean().optional() }).safeParse(JSON.parse(String((req.body as any)?.body ?? '{}')))
  if (!body.success) { res.status(400).json({ error: 'Balasan tidak valid.' }); return }
  const count = (getDb().prepare('SELECT COUNT(*) as c FROM ticket_evidence WHERE ticket_number = ?').get(row.number) as any).c
  const files = (req.files as any[]) || []
  if (count + files.length > MAX_FILES) { res.status(400).json({ error: 'Jumlah berkas melewati batas.' }); return }
  let meta: any[] = []
  try { meta = JSON.parse(String((req.body as any)?.evidence ?? '[]')) } catch { meta = [] }
  const now = nowISO()
  const db = getDb()
  db.transaction(() => {
    db.prepare(`INSERT INTO ticket_messages (id, ticket_number, at, author, body, is_enc) VALUES (?, ?, ?, 'pelapor', ?, ?)`).run(randomUUID(), row.number, now, body.data.body, body.data.encBody ? 1 : 0)
    db.prepare(`DELETE FROM ticket_timeline WHERE ticket_number = ? AND waiter = 1`).run(row.number)
    db.prepare(`INSERT INTO ticket_timeline (ticket_number, at, label) VALUES (?, ?, 'Balasan diterima')`).run(row.number, now)
    db.prepare(`INSERT INTO ticket_timeline (ticket_number, at, label, waiter) VALUES (?, ?, 'Menunggu pemeriksaan admin', 1)`).run(row.number, now)
    for (let i = 0; i < files.length; i++) {
      const m = meta[i]
      if (m) db.prepare(`INSERT INTO ticket_evidence (id, ticket_number, name, size, mime, kind, at, stored_name, orig_mime, enc) VALUES (?, ?, ?, ?, ?, 'reply', ?, ?, ?, ?)`).run(randomUUID(), row.number, m.name, m.size, 'application/octet-stream', now, files[i].filename, m.mime, body.data.encBody ? 1 : 0)
    }
  })()
  res.json(toTicketView(ticketRow(row.number)!))
})

publicRouter.post('/tickets/:number/share', requireTicketSession, (req, res) => {
  const row = ticketRow(String(req.params.number))
  if (!row) { res.status(404).json({ error: 'Tiket tidak ditemukan.' }); return }
  const parsed = z.object({ adminWrappedKey: z.string().min(1).max(50000) }).safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Wrapped key tidak valid.' }); return }
  getDb().prepare(`UPDATE tickets SET admin_wrapped_key = ?, shared = 1 WHERE number = ?`).run(parsed.data.adminWrappedKey, row.number)
  addAudit('Pelapor', 'SHARE_GRANTED', `${row.number} · Pelapor mengizinkan admin membaca isi.`)
  res.json({ ok: true })
})

publicRouter.get('/transparency', (_req, res) => {
  const db = getDb()
  const total = (db.prepare('SELECT COUNT(*) as c FROM tickets').get() as any).c
  const inProcess = (db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status NOT IN ('Selesai','Ditolak')").get() as any).c
  const done = (db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status='Selesai'").get() as any).c
  const perCat = (db.prepare('SELECT category, COUNT(*) as c FROM tickets GROUP BY category').all() as any[])
  const perKategoriData = perCat.map((r) => ({ label: r.category, value: r.c })).sort((a, b) => b.value - a.value)
  res.json({
    period: 'Oktober 2026', updated: new Date().toISOString(),
    stats: [
      { value: String(total), label: 'Laporan masuk' },
      { value: String(inProcess), label: 'Dalam proses' },
      { value: String(done), label: 'Selesai' },
      { value: '8,2 hari', label: 'Rata-rata penanganan' },
    ],
    perKategori: perKategoriData.map((x) => `${x.label} ${x.value}`).join(' · '),
    tren: 'Juli 72 · Agustus 89 · September 104 · Oktober 128',
    perKategoriData, trenData: [{ label: 'Juli', value: 72 }, { label: 'Agustus', value: 89 }, { label: 'September', value: 104 }, { label: 'Oktober', value: 128 }],
  })
})

publicRouter.get('/admin/public-key', (_req, res) => {
  const row = getDb().prepare('SELECT public_key FROM admins WHERE public_key IS NOT NULL LIMIT 1').get() as any
  res.json({ publicJwk: row?.public_key ?? null })
})
