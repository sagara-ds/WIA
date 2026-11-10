import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import bcrypt from 'bcrypt'
import crypto from 'crypto'

const DB_PATH = process.env.DB_PATH || join(__dirname, '../data/siap.db')

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tickets (
  number TEXT PRIMARY KEY,
  pin_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  chronology TEXT NOT NULL,
  incident_date TEXT NOT NULL,
  incident_date_approx INTEGER NOT NULL DEFAULT 0,
  location TEXT NOT NULL,
  involved_party TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Diterima', 'Perlu Dilengkapi', 'Diverifikasi', 'Ditolak', 'Diteruskan', 'Ditindaklanjuti', 'Selesai')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  result_summary TEXT,
  result_file_name TEXT,
  result_file_size INTEGER,
  seeded INTEGER NOT NULL DEFAULT 0,
  enc_json TEXT,
  wrapped_key TEXT,
  recovery_salt TEXT,
  admin_wrapped_key TEXT,
  shared INTEGER NOT NULL DEFAULT 0,
  encrypted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ticket_evidence (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL REFERENCES tickets(number) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('initial', 'reply')),
  at TEXT NOT NULL,
  enc INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL REFERENCES tickets(number) ON DELETE CASCADE,
  at TEXT NOT NULL,
  author TEXT NOT NULL CHECK (author IN ('admin', 'pelapor')),
  body TEXT NOT NULL,
  attachment_name TEXT,
  attachment_size INTEGER,
  is_enc INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ticket_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL REFERENCES tickets(number) ON DELETE CASCADE,
  at TEXT NOT NULL,
  label TEXT NOT NULL,
  waiter INTEGER NOT NULL DEFAULT 0,
  note TEXT
);

CREATE TABLE IF NOT EXISTS internal_notes (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL REFERENCES tickets(number) ON DELETE CASCADE,
  at TEXT NOT NULL,
  admin TEXT NOT NULL,
  body TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('verifikator', 'super_admin')),
  name TEXT NOT NULL,
  public_key TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS master_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS master_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_evidence_ticket ON ticket_evidence(ticket_number);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_number);
CREATE INDEX IF NOT EXISTS idx_ticket_timeline_ticket ON ticket_timeline(ticket_number);
CREATE INDEX IF NOT EXISTS idx_internal_notes_ticket ON internal_notes(ticket_number);
CREATE INDEX IF NOT EXISTS idx_audit_log_at ON audit_log(at);
`

let db: Database.Database

export function initDb() {
  mkdirSync(dirname(DB_PATH), { recursive: true })
  
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  
  db.exec(SCHEMA)
  migrateDb()
  
  seedData()
  
  return db
}

// Fase 3: tambah kolom enkripsi pada DB yang sudah ada (idempoten)
function migrateDb() {
  const add = (table: string, col: string, def: string) => {
    const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name)
    if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`)
  }
  add('tickets', 'enc_json', 'TEXT')
  add('tickets', 'wrapped_key', 'TEXT')
  add('tickets', 'recovery_salt', 'TEXT')
  add('tickets', 'admin_wrapped_key', 'TEXT')
  add('tickets', 'shared', 'INTEGER NOT NULL DEFAULT 0')
  add('tickets', 'encrypted', 'INTEGER NOT NULL DEFAULT 0')
  add('ticket_messages', 'is_enc', 'INTEGER NOT NULL DEFAULT 0')
  add('ticket_evidence', 'enc', 'INTEGER NOT NULL DEFAULT 0')
  add('admins', 'public_key', 'TEXT')
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function hashPin(pin: string, saltHex?: string): string {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16)
  const hash = crypto.pbkdf2Sync(pin, salt, 150000, 32, 'sha256')
  return `${salt.toString('hex')}$${hash.toString('hex')}`
}

function seedData() {
  const adminCount = (db.prepare('SELECT COUNT(*) as c FROM admins').get() as { c: number }).c
  if (adminCount > 0) return
  
  const tx = db.transaction(() => {
    const bcryptRounds = 10
    
    db.prepare(`INSERT INTO admins (email, password_hash, role, name) VALUES (?, ?, ?, ?)`).run(
      'verifikator@contoh.invalid',
      bcrypt.hashSync('verif-admin', bcryptRounds),
      'verifikator',
      'Petugas Demo'
    )
    
    db.prepare(`INSERT INTO admins (email, password_hash, role, name) VALUES (?, ?, ?, ?)`).run(
      'pengelola@contoh.invalid',
      bcrypt.hashSync('super-admin', bcryptRounds),
      'super_admin',
      'Pengelola Demo'
    )
    
    const categories = ['Pungutan liar', 'Penyalahgunaan anggaran', 'Penyalahgunaan fasilitas', 'Lainnya']
    for (const cat of categories) {
      db.prepare('INSERT INTO master_categories (name, active) VALUES (?, 1)').run(cat)
    }
    
    db.prepare('INSERT INTO master_units (name, active) VALUES (?, 1)').run('Unit Pemeriksa Layanan — simulasi')
    db.prepare('INSERT INTO master_units (name, active) VALUES (?, 1)').run('Unit Pengawasan Fasilitas — simulasi')
    
    const tickets = [
      { number: 'SIAP-DEMO-7K4M9', pin: '482619', title: 'Dugaan biaya tambahan pada layanan administrasi', category: 'Pungutan liar', chronology: 'Pada 28 Oktober, saya diminta membayar biaya tambahan tanpa rincian resmi. Nominal tidak tercantum pada rincian layanan manapun dan saya tidak diberi kwitansi. Ini data contoh untuk simulasi.', incidentDate: '2026-10-28', incidentDateApprox: 0, location: 'Loket layanan A — wilayah simulasi', involvedParty: 'Petugas loket (nama tidak diketahui)', status: 'Perlu Dilengkapi', createdAt: '2026-10-30T09:12:00+07:00' },
      { number: 'SIAP-DEMO-2Q6R8', pin: '730215', title: 'Dugaan penggunaan fasilitas di luar peruntukan', category: 'Penyalahgunaan fasilitas', chronology: 'Fasilitas layanan digunakan untuk keperluan di luar peruntukan beberapa kali pada bulan Oktober. Ini data contoh untuk simulasi, bukan aduan nyata.', incidentDate: '2026-10-29', incidentDateApprox: 1, location: 'Area layanan B — wilayah simulasi', involvedParty: 'Perangkat layanan (nama tidak diketahui)', status: 'Selesai', createdAt: '2026-10-29T08:41:00+07:00', completedAt: '2026-10-30T12:00:00+07:00', resultSummary: 'Unit telah memeriksa prosedur penggunaan fasilitas dan memperjelas peruntukan penggunaannya. Ini hasil simulasi, bukan putusan atas kejadian nyata.', resultFileName: 'ringkasan-penanganan.pdf', resultFileSize: 145920 },
      { number: 'SIAP-FL-K8N3R', pin: '901234', title: 'Dugaan pembayaran ganda pada layanan perizinan', category: 'Pungutan liar', chronology: 'Ditagih dua kali untuk perizinan yang sama pada 25 Oktober. Data simulasi.', incidentDate: '2026-10-25', incidentDateApprox: 0, location: 'Loket perizinan C — simulasi', involvedParty: 'Petugas perizinan (nama tidak diketahui)', status: 'Diterima', createdAt: '2026-10-29T14:30:00+07:00' },
      { number: 'SIAP-FL-P4W7Q', pin: '567890', title: 'Permintaan biaya administrasi tidak resmi', category: 'Pungutan liar', chronology: 'Diminta biaya Rp 30.000 tanpa kwitansi pada 26 Oktober. Data simulasi.', incidentDate: '2026-10-26', incidentDateApprox: 0, location: 'Kantor layanan D — simulasi', involvedParty: 'Petugas administrasi (nama tidak diketahui)', status: 'Diterima', createdAt: '2026-10-28T09:00:00+07:00' },
      { number: 'SIAP-FL-M9V2T', pin: '345678', title: 'Penyalahgunaan anggaran pelatihan', category: 'Penyalahgunaan anggaran', chronology: 'Anggaran pelatihan digunakan untuk keperluan di luar program pada Oktober. Data simulasi.', incidentDate: '2026-10-20', incidentDateApprox: 1, location: 'Unit pelatihan — simulasi', involvedParty: 'Koordinator pelatihan (nama tidak diketahui)', status: 'Perlu Dilengkapi', createdAt: '2026-10-27T10:15:00+07:00' },
      { number: 'SIAP-FL-B6D8L', pin: '234567', title: 'Laporan penggunaan kendaraan dinas di luar jam kerja', category: 'Penyalahgunaan fasilitas', chronology: 'Kendaraan dinas digunakan untuk keperluan pribadi pada 22 Oktober. Data simulasi.', incidentDate: '2026-10-22', incidentDateApprox: 0, location: 'Area parkir kantor — simulasi', involvedParty: 'Pengguna kendaraan (nama tidak diketahui)', status: 'Ditolak', createdAt: '2026-10-26T08:20:00+07:00', completedAt: '2026-10-26T14:30:00+07:00' },
      { number: 'SIAP-FL-R3H5Y', pin: '123456', title: 'Dugaan penggunaan fasilitas kantor untuk acara pribadi', category: 'Penyalahgunaan fasilitas', chronology: 'Ruang rapat digunakan untuk acara ulang tahun pada 21 Oktober. Data simulasi.', incidentDate: '2026-10-21', incidentDateApprox: 0, location: 'Ruang rapat lantai 3 — simulasi', involvedParty: 'Pengguna ruang rapat (nama tidak diketahui)', status: 'Diteruskan', createdAt: '2026-10-25T13:40:00+07:00' },
      { number: 'SIAP-FL-T7J2N', pin: '890123', title: 'Pengadaan barang tanpa tender resmi', category: 'Penyalahgunaan anggaran', chronology: 'Pengadaan alat kantor senilai Rp 15 juta tanpa proses tender pada Oktober. Data simulasi.', incidentDate: '2026-10-18', incidentDateApprox: 1, location: 'Unit pengadaan — simulasi', involvedParty: 'Petugas pengadaan (nama tidak diketahui)', status: 'Ditindaklanjuti', createdAt: '2026-10-24T11:00:00+07:00' },
    ]
    
    const insertTicket = db.prepare(`INSERT INTO tickets (number, pin_hash, title, category, chronology, incident_date, incident_date_approx, location, involved_party, status, created_at, completed_at, result_summary, result_file_name, result_file_size, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
    
    for (const t of tickets) {
      insertTicket.run(t.number, hashPin(t.pin), t.title, t.category, t.chronology, t.incidentDate, t.incidentDateApprox, t.location, t.involvedParty, t.status, t.createdAt, (t as any).completedAt || null, (t as any).resultSummary || null, (t as any).resultFileName || null, (t as any).resultFileSize || null)
    }
    
    const timeline = [
      { ticket: 'SIAP-DEMO-7K4M9', at: '2026-10-30T09:12:00+07:00', label: 'Diterima', waiter: 0, note: null },
      { ticket: 'SIAP-DEMO-7K4M9', at: '2026-10-30T10:20:00+07:00', label: 'Perlu Dilengkapi', waiter: 0, note: null },
      { ticket: 'SIAP-DEMO-7K4M9', at: '2026-10-30T10:20:00+07:00', label: 'Menunggu tanggapan pelapor', waiter: 1, note: null },
      { ticket: 'SIAP-DEMO-2Q6R8', at: '2026-10-29T08:41:00+07:00', label: 'Diterima', waiter: 0, note: null },
      { ticket: 'SIAP-DEMO-2Q6R8', at: '2026-10-29T10:05:00+07:00', label: 'Diverifikasi', waiter: 0, note: null },
      { ticket: 'SIAP-DEMO-2Q6R8', at: '2026-10-29T10:06:00+07:00', label: 'Diteruskan', waiter: 0, note: null },
      { ticket: 'SIAP-DEMO-2Q6R8', at: '2026-10-30T09:40:00+07:00', label: 'Ditindaklanjuti', waiter: 0, note: null },
      { ticket: 'SIAP-DEMO-2Q6R8', at: '2026-10-30T12:00:00+07:00', label: 'Selesai', waiter: 0, note: 'Ringkasan hasil tersedia untuk pelapor.' },
      { ticket: 'SIAP-FL-K8N3R', at: '2026-10-29T14:30:00+07:00', label: 'Diterima', waiter: 0, note: null },
      { ticket: 'SIAP-FL-P4W7Q', at: '2026-10-28T09:00:00+07:00', label: 'Diterima', waiter: 0, note: null },
      { ticket: 'SIAP-FL-M9V2T', at: '2026-10-27T10:15:00+07:00', label: 'Diterima', waiter: 0, note: null },
      { ticket: 'SIAP-FL-M9V2T', at: '2026-10-27T11:00:00+07:00', label: 'Perlu Dilengkapi', waiter: 0, note: null },
      { ticket: 'SIAP-FL-M9V2T', at: '2026-10-27T11:00:00+07:00', label: 'Menunggu tanggapan pelapor', waiter: 1, note: null },
      { ticket: 'SIAP-FL-B6D8L', at: '2026-10-26T08:20:00+07:00', label: 'Diterima', waiter: 0, note: null },
      { ticket: 'SIAP-FL-B6D8L', at: '2026-10-26T14:30:00+07:00', label: 'Ditolak', waiter: 0, note: 'Bukti tidak cukup untuk memverifikasi dugaan.' },
      { ticket: 'SIAP-FL-R3H5Y', at: '2026-10-25T13:40:00+07:00', label: 'Diterima', waiter: 0, note: null },
      { ticket: 'SIAP-FL-R3H5Y', at: '2026-10-25T15:00:00+07:00', label: 'Diverifikasi', waiter: 0, note: null },
      { ticket: 'SIAP-FL-R3H5Y', at: '2026-10-25T15:05:00+07:00', label: 'Diteruskan', waiter: 0, note: null },
      { ticket: 'SIAP-FL-T7J2N', at: '2026-10-24T11:00:00+07:00', label: 'Diterima', waiter: 0, note: null },
      { ticket: 'SIAP-FL-T7J2N', at: '2026-10-24T14:20:00+07:00', label: 'Diverifikasi', waiter: 0, note: null },
      { ticket: 'SIAP-FL-T7J2N', at: '2026-10-24T14:25:00+07:00', label: 'Diteruskan', waiter: 0, note: null },
      { ticket: 'SIAP-FL-T7J2N', at: '2026-10-25T09:00:00+07:00', label: 'Ditindaklanjuti', waiter: 0, note: null },
    ]
    
    const insertTimeline = db.prepare('INSERT INTO ticket_timeline (ticket_number, at, label, waiter, note) VALUES (?, ?, ?, ?, ?)')
    for (const e of timeline) {
      insertTimeline.run(e.ticket, e.at, e.label, e.waiter, e.note)
    }
    
    const messages = [
      { id: 'm-7k4m9-1', ticket: 'SIAP-DEMO-7K4M9', at: '2026-10-30T10:20:00+07:00', author: 'admin', body: 'Mohon jelaskan jumlah biaya yang diminta dan tambahkan bukti jika tersedia. Hindari mencantumkan identitas pribadi.' },
      { id: 'm-2q6r8-1', ticket: 'SIAP-DEMO-2Q6R8', at: '2026-10-30T12:00:00+07:00', author: 'admin', body: 'Penanganan telah selesai. Ringkasan hasil dapat dibaca pada tiket Anda. Dokumen hasil bersifat contoh pada simulasi ini.' },
      { id: 'm-fl-m9v2t-1', ticket: 'SIAP-FL-M9V2T', at: '2026-10-27T11:00:00+07:00', author: 'admin', body: 'Mohon jelaskan rincian anggaran dan bukti penggunaan bila tersedia.' },
      { id: 'm-fl-b6d8l-1', ticket: 'SIAP-FL-B6D8L', at: '2026-10-26T14:30:00+07:00', author: 'admin', body: 'Laporan ditolak karena bukti tidak cukup. Silakan laporkan kembali dengan dokumentasi yang lebih lengkap bila diperlukan.' },
    ]
    
    const insertMessage = db.prepare('INSERT INTO ticket_messages (id, ticket_number, at, author, body, attachment_name, attachment_size) VALUES (?, ?, ?, ?, ?, ?, ?)')
    for (const m of messages) {
      insertMessage.run(m.id, m.ticket, m.at, m.author, m.body, null, null)
    }
    
    db.prepare('INSERT INTO ticket_evidence (id, ticket_number, name, size, mime, kind, at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      'e-demo-1', 'SIAP-DEMO-7K4M9', 'bukti-contoh.pdf', 245760, 'application/pdf', 'initial', '2026-10-30T09:12:00+07:00'
    )
    
    const audit = [
      { at: '2026-10-30T12:00:00+07:00', actor: 'Petugas Demo', action: 'STATUS_CHANGED', detail: 'Ditindaklanjuti → Selesai · SIAP-DEMO-7K4M9 · Catatan: ringkasan tersedia.' },
      { at: '2026-10-30T11:30:00+07:00', actor: 'Petugas Demo', action: 'REPORT_VIEWED', detail: 'SIAP-DEMO-7K4M9 · Akses detail tercatat.' },
      { at: '2026-10-30T10:20:00+07:00', actor: 'Petugas Demo', action: 'STATUS_CHANGED', detail: 'Diterima → Diverifikasi · Catatan: informasi awal cukup.' },
    ]
    
    const insertAudit = db.prepare('INSERT INTO audit_log (at, actor, action, detail) VALUES (?, ?, ?, ?)')
    for (const a of audit) {
      insertAudit.run(a.at, a.actor, a.action, a.detail)
    }
  })
  
  tx()
}
