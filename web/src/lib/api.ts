import type {
  EvidenceMeta,
  IssuedTicket,
  ReportFields,
  StoredTicket,
  AdminSession,
  AuditEntry,
  InternalNote,
  Status,
  Transparansi,
} from './types'
import { SEED_TICKETS, SEED_ADMINS, KATEGORI } from './mock-data'
import { MAX_FILES_INITIAL, MAX_FILE_BYTES, ALLOWED_MIME } from './types'
import { formatStamp } from './format'
import {
  generateRecoveryKey,
  generateDataKey,
  generateSalt,
  wrapDataKey,
  unwrapDataKey,
  encryptText,
  decryptText,
  encryptBytes,
  generateAdminKeyPair,
  importAdminPublic,
  importAdminPrivate,
  wrapWithAdmin,
  unwrapWithAdmin,
  storeAdminKeys,
  loadAdminKeys,
} from './crypto'

export interface UploadIssue {
  name: string
  tooBig: boolean
  wrongType: boolean
  overLimit: boolean
}

export interface UploadResult {
  issues: UploadIssue[]
  accepted: EvidenceMeta[]
}

const DRAFT_KEY = 'siap.draft.v1'
const LAST_ISSUED_KEY = 'siap.last-issued.v1'
const ACTIVE_KEY = 'siap.active-ticket.v1'
const ADMIN_SESSION_KEY = 'siap.admin-session.v1'
const ADMIN_TICKET_KEY = 'siap.admin-ticket.v1'
// Fase 3 — kunci enkripsi end-to-end (hanya di browser pelapor)
const RECOVERY_KEY = 'siap.recovery-key.v1'
const TICKET_CRYPTO_KEY = 'siap.ticket-crypto.v1'

interface Draft {
  fields: ReportFields | null
  evidence: EvidenceMeta[]
}

const draftFileMap = new Map<string, File>()
const replyFileMap = new Map<string, File>()
let lastIssuedCache: { value: IssuedTicket | null; at: number } | null = null

async function json<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { credentials: 'same-origin', ...init })
    if (!res.ok) return null
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  } catch {
    return null
  }
}

/**
 * Seperti json(), tetapi melempar Error berisi pesan spesifik dari server
 * (409 transisi ilegal, 400 validasi, 429 rate-limit, 401 sesi) agar halaman
 * bisa menampilkan penyebab kegagalan — bukan navigasi seolah sukses.
 */
async function jsonOrFail<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin', ...init })
  if (res.ok) {
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }
  let message = 'Terjadi kesalahan pada server. Coba lagi.'
  try {
    const body = (await res.json()) as { error?: string }
    if (body.error) message = body.error
  } catch {
    /* body bukan JSON — pakai pesan generik */
  }
  throw new Error(message)
}

function toTicketView(t: StoredTicket): StoredTicket {
  return {
    ...t,
    timeline: t.timeline.map((e) => ({ ...e, at: formatStamp(e.at) })),
    messages: t.messages.map((m) => ({ ...m, at: formatStamp(m.at) })),
  }
}

// ---------- Fase 3: enkripsi end-to-end (hanya sisi klien) ----------

function saveRecoveryKey(key: string): void {
  sessionStorage.setItem(RECOVERY_KEY, key)
}

function loadRecoveryKey(): string | null {
  return sessionStorage.getItem(RECOVERY_KEY)
}

function saveTicketCrypto(number: string, wrappedKey: string, recoverySalt: string): void {
  sessionStorage.setItem(
    TICKET_CRYPTO_KEY,
    JSON.stringify({ number: number.toUpperCase(), wrappedKey, recoverySalt }),
  )
}

function loadTicketCrypto(number: string): { wrappedKey: string; recoverySalt: string } | null {
  const raw = sessionStorage.getItem(TICKET_CRYPTO_KEY)
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as { number: string; wrappedKey: string; recoverySalt: string }
    return o.number === number.toUpperCase() ? o : null
  } catch {
    return null
  }
}

async function dataKeyFor(number: string): Promise<CryptoKey | null> {
  const meta = loadTicketCrypto(number)
  const recovery = loadRecoveryKey()
  if (!meta || !recovery) return null
  try {
    return await unwrapDataKey(meta.wrappedKey, recovery, meta.recoverySalt)
  } catch {
    return null
  }
}

function maskLocked(raw: StoredTicket): StoredTicket {
  return {
    ...raw,
    title: '[Terlampir terenkripsi]',
    chronology: '',
    location: '',
    involvedParty: '',
    messages: raw.messages.map((m) => (m.isEnc ? { ...m, body: '[Pesan terenkripsi]' } : m)),
    locked: true,
  }
}

async function decryptTicket(raw: StoredTicket): Promise<StoredTicket> {
  if (!raw.encrypted) return toTicketView(raw)
  const dk = await dataKeyFor(raw.number)
  if (!dk) return toTicketView(maskLocked(raw))
  try {
    const payload = JSON.parse(await decryptText(raw.encJson ?? '', dk)) as {
      title: string
      chronology: string
      location: string
      involvedParty: string
    }
    const messages = await Promise.all(
      raw.messages.map(async (m) =>
        m.isEnc ? { ...m, body: await decryptText(m.body, dk), isEnc: false } : m,
      ),
    )
    return toTicketView({ ...raw, ...payload, messages, locked: false })
  } catch {
    return toTicketView(maskLocked(raw))
  }
}

// ---------- Fase 3 (T3.4): sisi admin — dekripsi hanya setelah pelapor berbagi ----------

function maskAdmin(raw: StoredTicket): StoredTicket {
  return {
    ...raw,
    chronology: '',
    location: '',
    involvedParty: '',
    messages: raw.messages.map((m) =>
      m.isEnc ? { ...m, body: '[Pesan terenkripsi — belum dibagikan]' } : m,
    ),
    locked: true,
  }
}

async function adminView(raw: StoredTicket): Promise<StoredTicket> {
  if (!raw.encrypted) return toTicketView(raw)
  if (!raw.adminWrappedKey) return toTicketView(maskAdmin(raw))
  const jwk = loadAdminKeys()
  if (!jwk) return toTicketView(maskAdmin(raw))
  try {
    const priv = await importAdminPrivate(jwk)
    const dk = await unwrapWithAdmin(raw.adminWrappedKey, priv)
    const payload = JSON.parse(await decryptText(raw.encJson ?? '', dk)) as {
      title: string
      chronology: string
      location: string
      involvedParty: string
    }
    const messages = await Promise.all(
      raw.messages.map(async (m) =>
        m.isEnc ? { ...m, body: await decryptText(m.body, dk), isEnc: false } : m,
      ),
    )
    return toTicketView({ ...raw, ...payload, messages, locked: false })
  } catch {
    return toTicketView(maskAdmin(raw))
  }
}

/** Bikin pasangan RSA-OAEP sekali per browser admin, unggah public key ke server. */
async function ensureAdminKeys(): Promise<void> {
  if (loadAdminKeys()) return
  try {
    const kp = await generateAdminKeyPair()
    storeAdminKeys(kp.privateJwk)
    await fetch('/api/admin/public-key', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicJwk: JSON.stringify(kp.publicJwk) }),
    })
  } catch {
    /* demo: lanjut tanpa kunci — detail akan tampil terkunci */
  }
}

function uid(prefix: string): string {
  const rnd = crypto.getRandomValues(new Uint8Array(6))
  return `${prefix}-${Array.from(rnd)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`
}

export function validateFiles(
  files: File[],
  currentCount: number,
  kind: 'initial' | 'reply',
): { issues: UploadIssue[]; accepted: EvidenceMeta[] } {
  const issues: UploadIssue[] = []
  const accepted: EvidenceMeta[] = []
  let room = MAX_FILES_INITIAL - currentCount
  for (const f of files) {
    if (room <= 0) {
      issues.push({ name: f.name, tooBig: false, wrongType: false, overLimit: true })
      continue
    }
    if (f.size > MAX_FILE_BYTES) {
      issues.push({ name: f.name, tooBig: true, wrongType: false, overLimit: false })
      continue
    }
    if (!(ALLOWED_MIME as readonly string[]).includes(f.type)) {
      issues.push({ name: f.name, tooBig: false, wrongType: true, overLimit: false })
      continue
    }
    room--
    accepted.push({
      id: uid('ev'),
      name: f.name,
      size: f.size,
      mime: f.type,
      kind,
      at: new Date().toISOString(),
    })
  }
  return { issues, accepted }
}

function readDraft(): Draft {
  const raw = sessionStorage.getItem(DRAFT_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as Draft
    } catch {
      /* fallthrough */
    }
  }
  return { fields: null, evidence: [] }
}

function writeDraft(draft: Draft): void {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

export const api = {
  async kategori(): Promise<string[]> {
    const list = await json<string[]>('/api/categories')
    return list ?? KATEGORI
  },

  async loadDraft(): Promise<{ fields: ReportFields | null; evidence: EvidenceMeta[] }> {
    const draft = readDraft()
    return { fields: draft.fields, evidence: draft.evidence }
  },

  async addDraftFiles(files: File[]): Promise<UploadResult> {
    const draft = readDraft()
    const { issues, accepted } = validateFiles(files, draft.evidence.length, 'initial')
    const remaining = [...files]
    for (const a of accepted) {
      const idx = remaining.findIndex((f) => f.name === a.name && f.size === a.size)
      if (idx >= 0) {
        draftFileMap.set(a.id, remaining[idx])
        remaining.splice(idx, 1)
      }
    }
    if (accepted.length > 0) {
      writeDraft({ ...draft, evidence: [...draft.evidence, ...accepted] })
    }
    return { issues, accepted }
  },

  async removeDraftEvidence(id: string): Promise<void> {
    const draft = readDraft()
    draftFileMap.delete(id)
    writeDraft({ ...draft, evidence: draft.evidence.filter((e) => e.id !== id) })
  },

  saveDraftFields(fields: ReportFields): void {
    writeDraft({ ...readDraft(), fields })
  },

  clearDraft(): void {
    draftFileMap.clear()
    sessionStorage.removeItem(DRAFT_KEY)
  },

  async createReport(fields: ReportFields, evidence: EvidenceMeta[]): Promise<IssuedTicket | null> {
    // Fase 3: kunci pemulihan 128-bit + data key AES-256 per tiket.
    // Server hanya menerima ciphertext; kunci pemulihan tampil sekali di /terkirim.
    const recoveryKey = await generateRecoveryKey()
    const dataKey = await generateDataKey()
    const recoverySalt = await generateSalt()
    const wrappedKey = await wrapDataKey(dataKey, recoveryKey, recoverySalt)
    const encJson = await encryptText(
      JSON.stringify({
        title: fields.title,
        chronology: fields.chronology,
        location: fields.location,
        involvedParty: fields.involvedParty,
      }),
      dataKey,
    )
    const form = new FormData()
    form.append(
      'fields',
      JSON.stringify({
        category: fields.category,
        incidentDate: fields.incidentDate,
        incidentDateApprox: fields.incidentDateApprox,
      }),
    )
    form.append('enc', JSON.stringify({ encJson, wrappedKey, recoverySalt }))
    // Fase 3 (T3.3): blob bukti dienkripsi sebelum keluar dari browser.
    // evidenceMeta didahulukan agar server bisa memvalidasi MIME/ukuran asli.
    const metaFor = (list: EvidenceMeta[], encrypted: boolean) =>
      JSON.stringify(list.map((e) => ({ name: e.name, size: e.size, mime: e.mime, enc: encrypted })))
    form.append('evidenceMeta', metaFor(evidence, true))
    for (const e of evidence) {
      const file = draftFileMap.get(e.id)
      if (!file) continue
      const encBuf = await encryptBytes(await file.arrayBuffer(), dataKey)
      form.append('files', new Blob([encBuf], { type: 'application/octet-stream' }), e.name)
    }
    const issued = await json<IssuedTicket>('/api/reports', { method: 'POST', body: form })
    if (!issued || !issued.number || !issued.pin) return null
    issued.recoveryKey = recoveryKey
    draftFileMap.clear()
    this.clearDraft()
    saveRecoveryKey(recoveryKey)
    saveTicketCrypto(issued.number, wrappedKey, recoverySalt)
    sessionStorage.setItem(LAST_ISSUED_KEY, JSON.stringify(issued))
    sessionStorage.setItem(ACTIVE_KEY, issued.number)
    lastIssuedCache = { value: issued, at: Date.now() }
    return issued
  },

  consumeLastIssued(): IssuedTicket | null {
    const now = Date.now()
    if (lastIssuedCache && now - lastIssuedCache.at < 2000) return lastIssuedCache.value
    const raw = sessionStorage.getItem(LAST_ISSUED_KEY)
    let value: IssuedTicket | null = null
    if (raw) {
      sessionStorage.removeItem(LAST_ISSUED_KEY)
      try {
        value = JSON.parse(raw) as IssuedTicket
      } catch {
        value = null
      }
    }
    lastIssuedCache = { value, at: now }
    return value
  },

  async checkTicket(number: string, pin: string): Promise<StoredTicket | null> {
    const found = await json<StoredTicket>('/api/tickets/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: number.trim().toUpperCase(), pin: pin.trim() }),
    })
    if (!found) return null
    sessionStorage.setItem(ACTIVE_KEY, found.number)
    return decryptTicket(found)
  },

  /** Fase 3: simpan kunci pemulihan yang diketik pengguna di halaman /cek. */
  setRecoveryKey(key: string): void {
    if (key.trim()) saveRecoveryKey(key.trim())
  },

  async getActiveTicket(): Promise<StoredTicket | null> {
    const number = sessionStorage.getItem(ACTIVE_KEY)
    if (!number) return null
    return api.getTicket(number)
  },

  async getTicket(number: string): Promise<StoredTicket | null> {
    const t = await json<StoredTicket>(`/api/tickets/${encodeURIComponent(number)}`)
    return t ? decryptTicket(t) : null
  },

  clearActiveTicket(): void {
    sessionStorage.removeItem(ACTIVE_KEY)
  },

  async sendReplyDryRun(files: File[]): Promise<UploadResult> {
    const number = sessionStorage.getItem(ACTIVE_KEY)
    const current = number ? await json<StoredTicket>(`/api/tickets/${encodeURIComponent(number)}`) : null
    const currentCount = current?.evidence.length ?? 0
    return validateFiles(files, currentCount, 'reply')
  },

  async sendReply(
    number: string,
    body: string,
    evidence: EvidenceMeta[],
  ): Promise<{ ticket: StoredTicket | null }> {
    const form = new FormData()
    // Fase 3: balasan dienkripsi dengan data key tiket bila tersedia
    const dk = await dataKeyFor(number)
    form.append('body', dk ? await encryptText(body, dk) : body)
    if (dk) form.append('encBody', '1')
    form.append(
      'evidenceMeta',
      JSON.stringify(evidence.map((e) => ({ name: e.name, size: e.size, mime: e.mime, enc: !!dk }))),
    )
    const remaining = [...evidence]
    for (const e of remaining) {
      const file = replyFileMap.get(e.id)
      if (!file) continue
      if (dk) {
        const encBuf = await encryptBytes(await file.arrayBuffer(), dk)
        form.append('files', new Blob([encBuf], { type: 'application/octet-stream' }), e.name)
      } else {
        form.append('files', file, e.name)
      }
    }
    replyFileMap.clear()
    const result = await json<{ ticket: StoredTicket }>(`/api/tickets/${encodeURIComponent(number)}/replies`, {
      method: 'POST',
      body: form,
    })
    return { ticket: result?.ticket ? await decryptTicket(result.ticket) : null }
  },

  /**
   * Fase 3 (T3.4): pelapor mengizinkan admin membaca isi.
   * Data key dibungkus dengan public key admin (RSA-OAEP) lalu dikirim ke server.
   * Tanpa izin ini, admin hanya melihat metadata status.
   */
  async shareWithAdmin(number: string): Promise<boolean> {
    const keyData = await json<{ publicJwk: string | null }>('/api/public-key')
    if (!keyData?.publicJwk) return false
    const dk = await dataKeyFor(number)
    if (!dk) return false
    let adminWrappedKey: string
    try {
      const pub = await importAdminPublic(JSON.parse(keyData.publicJwk) as JsonWebKey)
      adminWrappedKey = await wrapWithAdmin(dk, pub)
    } catch {
      return false
    }
    const res = await json<{ ok: boolean }>(`/api/tickets/${encodeURIComponent(number)}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminWrappedKey }),
    })
    return !!res?.ok
  },

  transparansi(): Promise<Transparansi | null> {
    return json<Transparansi>('/api/transparency')
  },

  demoCredentials(): { number: string; pin: string; status: string }[] {
    return SEED_TICKETS.map((s) => ({
      number: s.number,
      pin: s.pin,
      status: s.ticket.status,
    }))
  },
}

export const adminApi = {
  async login(email: string, password: string): Promise<AdminSession | null> {
    const session = await json<AdminSession>('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (session) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
      await ensureAdminKeys()
    }
    return session
  },

  getSession(): AdminSession | null {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AdminSession
    } catch {
      return null
    }
  },

  logout(): void {
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
    sessionStorage.removeItem(ADMIN_TICKET_KEY)
    void fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' })
  },

  async queue(filter?: { status?: Status; category?: string; search?: string }): Promise<StoredTicket[]> {
    const params = new URLSearchParams()
    if (filter?.status) params.set('status', filter.status)
    if (filter?.category) params.set('category', filter.category)
    if (filter?.search) params.set('search', filter.search)
    const qs = params.toString()
    const list = await json<StoredTicket[]>(`/api/admin/tickets${qs ? `?${qs}` : ''}`)
    return Promise.all((list ?? []).map((r) => adminView(r)))
  },

  async detail(number: string): Promise<{ ticket: StoredTicket; internalNotes: InternalNote[] } | null> {
    const data = await json<{ ticket: StoredTicket; internalNotes: InternalNote[] }>(
      `/api/admin/tickets/${encodeURIComponent(number)}`,
    )
    if (!data) return null
    return {
      ticket: await adminView(data.ticket),
      internalNotes: data.internalNotes.map((n) => ({ ...n, at: formatStamp(n.at) })),
    }
  },

  /** T2.2 — kirim pesan admin ke pelapor; lempar Error berisi pesan server bila gagal. */
  async sendMessage(number: string, body: string): Promise<StoredTicket> {
    const updated = await jsonOrFail<StoredTicket>(
      `/api/admin/tickets/${encodeURIComponent(number)}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      },
    )
    return adminView(updated)
  },

  async transition(
    number: string,
    toStatus: Status,
    note: string,
    internal: string,
    extra?: { unit?: string; resultSummary?: string; resultFile?: { name: string; size: number }; messageToReporter?: string },
  ): Promise<StoredTicket | null> {
    const updated = await jsonOrFail<StoredTicket>(`/api/admin/tickets/${encodeURIComponent(number)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toStatus, note, internal, extra }),
    })
    return adminView(updated)
  },

  allowedTransitions(status: Status): Status[] {
    switch (status) {
      case 'Diterima':
        return ['Diverifikasi', 'Perlu Dilengkapi', 'Ditolak']
      case 'Perlu Dilengkapi':
        return ['Diverifikasi', 'Ditolak']
      case 'Diverifikasi':
        return ['Diteruskan']
      case 'Diteruskan':
        return ['Ditindaklanjuti']
      case 'Ditindaklanjuti':
        return ['Selesai']
      case 'Ditolak':
      case 'Selesai':
        return []
    }
  },

  async audit(): Promise<AuditEntry[]> {
    const entries = await json<AuditEntry[]>('/api/admin/audit')
    return (entries ?? []).map((e) => ({ ...e, at: formatStamp(e.at) }))
  },

  async masterData(): Promise<{
    categories: { id: string; name: string; active: boolean }[]
    units: { id: string; name: string; active: boolean }[]
    admins: { email: string; name: string; role: string }[]
  } | null> {
    return json('/api/admin/master')
  },

  /** T2.4 — referensi baca-saja (kedua peran): kategori & unit aktif. */
  async reference(): Promise<{ categories: string[]; units: { id: string; name: string }[] } | null> {
    return json('/api/admin/reference')
  },

  /** T2.3 — tambah kategori/unit baru. */
  async addMaster(kind: 'categories' | 'units', name: string): Promise<void> {
    await jsonOrFail(`/api/admin/master/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
  },

  /** T2.3 — ubah nama dan/atau aktif-nonaktifkan kategori/unit. */
  async patchMaster(
    kind: 'categories' | 'units',
    id: string,
    patch: { name?: string; active?: boolean },
  ): Promise<void> {
    await jsonOrFail(`/api/admin/master/${kind}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  },

  demoAdminCredentials(): { email: string; password: string; role: string }[] {
    return SEED_ADMINS.map((a) => ({ email: a.email, password: a.password, role: a.session.role }))
  },

  getAdminTicketNumber(): string | null {
    return sessionStorage.getItem(ADMIN_TICKET_KEY)
  },

  setAdminTicketNumber(number: string): void {
    sessionStorage.setItem(ADMIN_TICKET_KEY, number)
  },

  clearAdminTicket(): void {
    sessionStorage.removeItem(ADMIN_TICKET_KEY)
  },
}
