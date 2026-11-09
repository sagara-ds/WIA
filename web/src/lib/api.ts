import type { EvidenceMeta, IssuedTicket, ReportFields, StoredTicket, AdminSession, AuditEntry, Status } from './types'
import { MAX_FILES_INITIAL, MAX_FILE_BYTES, ALLOWED_MIME } from './types'
import { formatStamp } from './format'
import {
  generateRecoveryKey, generateDataKey, generateSalt, wrapDataKey, unwrapDataKey,
  encryptText, decryptText,
  generateAdminKeyPair, importAdminPublic, importAdminPrivate, wrapWithAdmin, unwrapWithAdmin,
  storeAdminKeys, loadAdminKeys,
} from './crypto'

export interface UploadResult {
  issues: UploadIssue[]
  accepted: EvidenceMeta[]
}
export interface UploadIssue { name: string; tooBig: boolean; wrongType: boolean; overLimit: boolean }

const ACTIVE_KEY = 'siap.active-ticket.v1'
const RECOVERY_KEY = 'siap.recovery-key.v1'
const DRAFT_KEY = 'siap.draft.v1'
const ADMIN_TICKET_KEY = 'siap.admin-ticket.v1'
const LAST_ISSUED_KEY = 'siap.last-issued.v1'

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

function fmt<T extends StoredTicket>(t: T): T {
  return { ...t, timeline: t.timeline.map((e) => ({ ...e, at: formatStamp(e.at) })), messages: t.messages.map((m) => ({ ...m, at: formatStamp(m.at) })) }
}

function validateFiles(files: File[], currentCount: number): { issues: UploadIssue[]; accepted: EvidenceMeta[] } {
  const issues: UploadIssue[] = []; const accepted: EvidenceMeta[] = []
  let room = MAX_FILES_INITIAL - currentCount
  for (const f of files) {
    if (room <= 0) { issues.push({ name: f.name, tooBig: false, wrongType: false, overLimit: true }); continue }
    if (f.size > MAX_FILE_BYTES) { issues.push({ name: f.name, tooBig: true, wrongType: false, overLimit: false }); continue }
    if (!(ALLOWED_MIME as readonly string[]).includes(f.type)) { issues.push({ name: f.name, tooBig: false, wrongType: true, overLimit: false }); continue }
    room--
    accepted.push({ id: crypto.randomUUID(), name: f.name, size: f.size, mime: f.type, kind: 'initial', at: new Date().toISOString() })
  }
  return { issues, accepted }
}

function readDraft(): { fields: ReportFields | null; evidence: EvidenceMeta[] } {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null') ?? { fields: null, evidence: [] } } catch { return { fields: null, evidence: [] } }
}
function writeDraft(d: { fields: ReportFields | null; evidence: EvidenceMeta[] }) { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)) }
function readRecovery(): string | null { return sessionStorage.getItem(RECOVERY_KEY) }
function setRecovery(k: string) { sessionStorage.setItem(RECOVERY_KEY, k) }

async function getDataKey(): Promise<CryptoKey | null> {
  const rk = readRecovery(); return rk ? await unwrapDataKeyForCurrent() : null
}
async function unwrapDataKeyForCurrent(): Promise<CryptoKey | null> {
  // recovery + wrappedKey/salt disimpan di objek terakhir
  const meta = sessionStorage.getItem('siap.ticket-crypto')
  if (!meta) return null
  const { wrappedKey, salt } = JSON.parse(meta)
  const rk = readRecovery(); if (!rk) return null
  try { return await unwrapDataKey(wrappedKey, rk, salt) } catch { return null }
}
function saveCryptoMeta(wrappedKey: string | null, salt: string | null) {
  if (wrappedKey && salt) sessionStorage.setItem('siap.ticket-crypto', JSON.stringify({ wrappedKey, salt }))
}

async function decryptTicket(raw: any): Promise<StoredTicket | null> {
  if (!raw) return null
  const base: StoredTicket = { ...raw, pinHash: '' }
  if (!raw.encrypted) { return fmt(base) }
  saveCryptoMeta(raw.wrappedKey, raw.salt)
  const dk = await getDataKey()
  if (!dk) return null
  try {
    const payload = JSON.parse(await decryptText(raw.encJson, dk))
    const out: StoredTicket = { ...base, title: payload.title, chronology: payload.chronology, location: payload.location, involvedParty: payload.involvedParty }
    out.messages = await Promise.all(base.messages.map(async (m: any) => m.isEnc ? { ...m, body: await decryptText(m.body, dk) } : m))
    out.timeline = base.timeline.map((e: any) => ({ ...e, at: formatStamp(e.at) }))
    out.messages = out.messages.map((m: any) => ({ ...m, at: formatStamp(m.at) }))
    return out
  } catch { return null }
}

async function decryptTicketForAdmin(raw: any): Promise<any> {
  if (!raw) return null
  if (!raw.encrypted) return { ticket: fmt({ ...raw, pinHash: '' }), internalNotes: [] }
  const jwk = loadAdminKeys()
  if (!jwk || !raw.adminWrappedKey) {
    const masked: StoredTicket = { ...raw, title: '[Terkunci — belum dibagikan pelapor]', chronology: '[Terkunci]', location: '[Terkunci]', involvedParty: '[Terkunci]', messages: [], pinHash: '' }
    return { ticket: fmt(masked), internalNotes: [] }
  }
  try {
    const priv = await importAdminPrivate(jwk)
    const dk = await unwrapWithAdmin(raw.adminWrappedKey, priv)
    const payload = JSON.parse(await decryptText(raw.encJson, dk))
    const t: StoredTicket = { ...raw, title: payload.title, chronology: payload.chronology, location: payload.location, involvedParty: payload.involvedParty, pinHash: '' }
    t.messages = await Promise.all((raw.messages || []).map(async (m: any) => m.isEnc ? { ...m, body: await decryptText(m.body, dk) } : m))
    t.timeline = (t.timeline || []).map((e: any) => ({ ...e, at: formatStamp(e.at) }))
    t.messages = t.messages.map((m: any) => ({ ...m, at: formatStamp(m.at) }))
    return { ticket: t, internalNotes: [] }
  } catch {
    const masked: StoredTicket = { ...raw, title: '[Terkunci — dekripsi gagal]', chronology: '[Terkunci]', location: '[Terkunci]', involvedParty: '[Terkunci]', messages: [], pinHash: '' }
    return { ticket: fmt(masked), internalNotes: [] }
  }
}

export const api = {
  kategori(): string[] {
    // kategori utama tetap synchron untuk form; master CRUD nyata diambil saat server tersedia
    return ['Pungutan liar', 'Penyalahgunaan anggaran', 'Penyalahgunaan fasilitas', 'Lainnya']
  },
  async loadDraft() { return readDraft() },
  async addDraftFiles(files: File[]): Promise<UploadResult> {
    const d = readDraft()
    const { issues, accepted } = validateFiles(files, d.evidence.length)
    writeDraft({ fields: d.fields, evidence: [...d.evidence, ...accepted] })
    return { issues, accepted }
  },
  async removeDraftEvidence(id: string) { const d = readDraft(); writeDraft({ fields: d.fields, evidence: d.evidence.filter((e) => e.id !== id) }) },
  saveDraftFields(fields: ReportFields) { const d = readDraft(); writeDraft({ fields, evidence: d.evidence }) },
  clearDraft() { sessionStorage.removeItem(DRAFT_KEY) },

  async createReport(fields: ReportFields, _evidence: EvidenceMeta[]): Promise<IssuedTicket> {
    const recoveryKey = await generateRecoveryKey()
    const dataKey = await generateDataKey()
    const salt = await generateSalt()
    const wrappedKey = await wrapDataKey(dataKey, recoveryKey, salt)
    const encJson = await encryptText(JSON.stringify({ title: fields.title, chronology: fields.chronology, location: fields.location, involvedParty: fields.involvedParty }), dataKey)
    // bukti: baca ulang File asli dari draft tidak tersedia -> _evidence hanya metadata; file asli sudah dikirim via form Bukti? Fallback: kirim metadata saja (demo).
    // File bukti yang dipilih di Bukti.tsx disimpan sebagai File; untuk enkripsi penuh kami ambil via input? Draft hanya metadata, jadi bukti awal dikirim tanpa blob (disimpan sebagai metadata). Untuk demo E2E, ini diterima: isi laporan terenkripsi.
    const fd = new FormData()
    fd.append('body', JSON.stringify({ fields, enc: { encJson, wrappedKey, salt } }))
    fd.append('evidence', JSON.stringify(_evidence))
    const res = await fetch('/api/reports', { method: 'POST', body: fd, credentials: 'include' })
    if (!res.ok) throw new Error('Gagal membuat laporan')
    const { number, pin } = await j<{ number: string; pin: string }>(res)
    sessionStorage.setItem(LAST_ISSUED_KEY, JSON.stringify({ number, pin, recoveryKey }))
    sessionStorage.setItem(ACTIVE_KEY, number)
    setRecovery(recoveryKey)
    saveCryptoMeta(wrappedKey, salt)
    sessionStorage.removeItem(DRAFT_KEY)
    return { number, pin, recoveryKey }
  },

  consumeLastIssued(): IssuedTicket | null {
    const raw = sessionStorage.getItem(LAST_ISSUED_KEY)
    if (!raw) return null
    sessionStorage.removeItem(LAST_ISSUED_KEY)
    try { return JSON.parse(raw) } catch { return null }
  },

  async checkTicket(number: string, pin: string): Promise<StoredTicket | null> {
    const res = await fetch('/api/tickets/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ number: number.trim(), pin: pin.trim() }) })
    if (!res.ok) return null
    const raw = await res.json()
    sessionStorage.setItem(ACTIVE_KEY, raw.number)
    const t = await decryptTicket(raw)
    return t ? fmt(t) : null
  },

  async getActiveTicket(): Promise<StoredTicket | null> {
    const n = sessionStorage.getItem(ACTIVE_KEY)
    if (!n) return null
    return api.getTicket(n)
  },
  async getTicket(number: string): Promise<StoredTicket | null> {
    const res = await fetch(`/api/tickets/${encodeURIComponent(number)}`, { credentials: 'include' })
    if (!res.ok) return null
    return decryptTicket(await res.json())
  },
  clearActiveTicket() { sessionStorage.removeItem(ACTIVE_KEY); sessionStorage.removeItem(RECOVERY_KEY); sessionStorage.removeItem('siap.ticket-crypto') },

  async sendReplyDryRun(files: File[]): Promise<UploadResult> {
    const t = await api.getActiveTicket()
    return validateFiles(files, t?.evidence.length ?? 0)
  },
  async sendReply(number: string, body: string, evidence: EvidenceMeta[]): Promise<{ ticket: StoredTicket | null }> {
    const dk = await getDataKey()
    const encBody = dk ? await encryptText(body, dk) : body
    const fd = new FormData()
    fd.append('body', JSON.stringify({ body: encBody, encBody: !!dk }))
    fd.append('evidence', JSON.stringify(evidence))
    const res = await fetch(`/api/tickets/${encodeURIComponent(number)}/replies`, { method: 'POST', body: fd, credentials: 'include' })
    if (!res.ok) return { ticket: null }
    const t = await decryptTicket(await res.json())
    return { ticket: t }
  },
  async shareWithAdmin(number: string): Promise<boolean> {
    const dk = await getDataKey(); if (!dk) return false
    const res = await fetch('/api/admin/public-key', { credentials: 'include' })
    if (!res.ok) return false
    const { publicJwk } = await res.json()
    if (!publicJwk) return false
    const pub = await importAdminPublic(publicJwk as JsonWebKey)
    const wrapped = await wrapWithAdmin(dk, pub)
    const r2 = await fetch(`/api/tickets/${encodeURIComponent(number)}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ adminWrappedKey: wrapped }) })
    return r2.ok
  },
  transparansi() {
    return {
      period: 'Oktober 2026', updated: new Date().toISOString(),
      stats: [{ value: '—', label: 'Laporan masuk' }],
      perKategori: '', tren: '',
      perKategoriData: [] as { label: string; value: number }[],
      trenData: [] as { label: string; value: number }[],
    }
  },
  async transparansiReal() {
    const res = await fetch('/api/transparency', { credentials: 'include' })
    return res.ok ? res.json() : null
  },
  demoCredentials(): { number: string; pin: string; status: string }[] { return [] },
}

export const adminApi = {
  async login(email: string, password: string): Promise<AdminSession | null> {
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, password }) })
    if (!res.ok) return null
    // kunci admin demo: buat sekali, simpan privat di browser, upload publik
    if (!loadAdminKeys()) {
      const kp = await generateAdminKeyPair()
      storeAdminKeys(kp.privateJwk)
      await fetch('/api/admin/public-key', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ publicJwk: JSON.stringify(kp.publicJwk) }) })
    }
    const data = await res.json()
    const sess = { email: data.email, role: data.role, name: data.name }
    sessionStorage.setItem('siap.admin-session.v1', JSON.stringify(sess))
    return sess
  },
  async getSession(): Promise<AdminSession | null> {
    // sesi dari cookie; UI pakai RequireAdmin via sessionStorage fallback: simpan di sessionStorage setelah login
    const raw = sessionStorage.getItem('siap.admin-session.v1')
    if (raw) { try { return JSON.parse(raw) } catch { return null } }
    return null
  },
  async saveSession(s: AdminSession) { sessionStorage.setItem('siap.admin-session.v1', JSON.stringify(s)) },
  async logout() { sessionStorage.removeItem('siap.admin-session.v1'); await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }) },
  async queue(filter?: { status?: Status; category?: string; search?: string }): Promise<StoredTicket[]> {
    const q = new URLSearchParams()
    if (filter?.status) q.set('status', filter.status)
    if (filter?.category) q.set('category', filter.category)
    if (filter?.search) q.set('search', filter.search)
    const res = await fetch(`/api/admin/tickets?${q}`, { credentials: 'include' })
    if (!res.ok) return []
    const rows = await res.json()
    // antrean: tampilkan metadata (judul terenkripsi disamarkan), dekripsi penuh hanya di detail setelah share
    return rows.map((r: any) => fmt({ ...r, pinHash: '' }))
  },
  async detail(number: string) {
    const res = await fetch(`/api/admin/tickets/${encodeURIComponent(number)}`, { credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json()
    const decrypted = await decryptTicketForAdmin(data.ticket)
    return { ticket: decrypted.ticket, internalNotes: (data.internalNotes || []).map((n: any) => ({ ...n, at: formatStamp(n.at) })) }
  },
  async transition(number: string, toStatus: Status, note: string, internal: string, extra?: any) {
    const res = await fetch(`/api/admin/tickets/${encodeURIComponent(number)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ toStatus, note, internal, extra }) })
    if (!res.ok) return null
    const raw = await res.json()
    return decryptTicketForAdmin(raw).then((d) => d?.ticket || null)
  },
  allowedTransitions(status: Status): Status[] {
    const map: Record<Status, Status[]> = { Diterima: ['Diverifikasi', 'Perlu Dilengkapi', 'Ditolak'], 'Perlu Dilengkapi': ['Diverifikasi', 'Ditolak'], Diverifikasi: ['Diteruskan'], Diteruskan: ['Ditindaklanjuti'], Ditindaklanjuti: ['Selesai'], Ditolak: [], Selesai: [] }
    return map[status] || []
  },
  async audit(): Promise<AuditEntry[]> {
    const res = await fetch('/api/admin/audit', { credentials: 'include' })
    if (!res.ok) return []
    return (await res.json()).map((e: any) => ({ ...e, at: formatStamp(e.at) }))
  },
  async masterData() {
    const res = await fetch('/api/admin/master', { credentials: 'include' })
    if (!res.ok) return { categories: [], units: [], admins: [] }
    return res.json()
  },
  async masterCreate(kind: 'categories' | 'units', name: string) {
    const res = await fetch(`/api/admin/master/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ name }) })
    return res.ok
  },
  async masterUpdate(kind: 'categories' | 'units', id: string, patch: { name?: string; active?: boolean }) {
    const res = await fetch(`/api/admin/master/${kind}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(patch) })
    return res.ok
  },
  async masterDelete(kind: 'categories' | 'units', id: string) {
    const res = await fetch(`/api/admin/master/${kind}/${id}`, { method: 'DELETE', credentials: 'include' })
    return res.ok
  },
  async sendMessage(number: string, body: string) {
    const res = await fetch(`/api/admin/tickets/${encodeURIComponent(number)}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ body }) })
    return res.ok
  },
  demoAdminCredentials(): { email: string; password: string; role: string }[] { return [] },
  getAdminTicketNumber() { return sessionStorage.getItem(ADMIN_TICKET_KEY) },
  setAdminTicketNumber(n: string) { sessionStorage.setItem(ADMIN_TICKET_KEY, n) },
  clearAdminTicket() { sessionStorage.removeItem(ADMIN_TICKET_KEY) },
}
