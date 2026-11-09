import type { Draft, EvidenceMeta, IssuedTicket, MessageEntry, ReportFields, StoredTicket, AdminSession, AuditEntry, InternalNote, Status } from './types'
import { MAX_FILES_INITIAL, MAX_FILE_BYTES, ALLOWED_MIME } from './types'
import { formatStamp } from './format'
import { SEED_TICKETS, SEED_ADMINS, SEED_AUDIT } from './mock-data'

const TICKETS_KEY = 'siap.tickets.v1'
const LAST_ISSUED_KEY = 'siap.last-issued.v1'
const ACTIVE_KEY = 'siap.active-ticket.v1'
const DRAFT_KEY = 'siap.draft.v1'
const ADMIN_SESSION_KEY = 'siap.admin-session.v1'
const ADMIN_TICKET_KEY = 'siap.admin-ticket.v1'
const AUDIT_KEY = 'siap.audit.v1'
const INTERNAL_NOTES_KEY = 'siap.internal-notes.v1'

let cache: StoredTicket[] | null = null
let consumeCache: { value: IssuedTicket | null; at: number } | null = null
let auditCache: AuditEntry[] | null = null
let internalNotesCache: Map<string, InternalNote[]> | null = null

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hashPin(pin: string, saltHex?: string): Promise<string> {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: 150000 },
    key,
    256,
  )
  return `${bytesToHex(salt)}$${bytesToHex(new Uint8Array(bits))}`
}

async function readTickets(): Promise<StoredTicket[]> {
  if (cache) return cache
  const raw = sessionStorage.getItem(TICKETS_KEY)
  let list: StoredTicket[] = []
  if (raw) {
    try {
      list = JSON.parse(raw) as StoredTicket[]
    } catch {
      list = []
    }
  }
  for (const seed of SEED_TICKETS) {
    if (!list.some((t) => t.number === seed.number)) {
      list.push({ ...seed.ticket, pinHash: await hashPin(seed.pin) })
    }
  }
  cache = list
  writeTickets(list)
  return list
}

function writeTickets(list: StoredTicket[]): void {
  cache = list
  sessionStorage.setItem(TICKETS_KEY, JSON.stringify(list))
}

function uid(prefix: string): string {
  const rnd = crypto.getRandomValues(new Uint8Array(6))
  return `${prefix}-${bytesToHex(rnd)}`
}

const TICKET_ALPHABET = 'BCDFGHJKLMNPQRSTVWXYZ123456789'

function generateTicketNumber(existing: StoredTicket[]): string {
  for (;;) {
    const buf = crypto.getRandomValues(new Uint8Array(5))
    let code = ''
    for (const b of buf) code += TICKET_ALPHABET[b % TICKET_ALPHABET.length]
    const number = `SIAP-${code}`
    if (!existing.some((t) => t.number === number)) return number
  }
}

export interface UploadIssue {
  name: string
  tooBig: boolean
  wrongType: boolean
  overLimit: boolean
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

async function readDraftRaw(): Promise<Draft> {
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

export const db = {
  async createReport(
    fields: ReportFields,
    evidence: EvidenceMeta[],
  ): Promise<IssuedTicket> {
    const list = await readTickets()
    const number = generateTicketNumber(list)
    const pin = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => String(b % 10)).join('')
    const pinHash = await hashPin(pin)
    const now = new Date().toISOString()
    const ticket: StoredTicket = {
      number,
      pinHash,
      title: fields.title,
      category: fields.category,
      chronology: fields.chronology,
      incidentDate: fields.incidentDate,
      incidentDateApprox: fields.incidentDateApprox,
      location: fields.location,
      involvedParty: fields.involvedParty,
      status: 'Diterima',
      createdAt: now,
      timeline: [{ at: formatStamp(now), label: 'Diterima' }],
      messages: [],
      evidence: evidence.map((e) => ({ ...e, kind: 'initial' as const, at: now })),
    }
    list.push(ticket)
    writeTickets(list)
    const issued: IssuedTicket = { number, pin }
    sessionStorage.setItem(LAST_ISSUED_KEY, JSON.stringify(issued))
    sessionStorage.setItem(ACTIVE_KEY, number)
    return issued
  },

  async checkTicket(number: string, pin: string): Promise<StoredTicket | null> {
    const list = await readTickets()
    const found = list.find((t) => t.number.toUpperCase() === number.trim().toUpperCase())
    if (!found) return null
    const candidate = await hashPin(pin.trim(), found.pinHash.split('$')[0])
    if (candidate !== found.pinHash) return null
    return found
  },

  async getTicket(number: string): Promise<StoredTicket | null> {
    const list = await readTickets()
    return list.find((t) => t.number === number) ?? null
  },

  getActiveTicketNumber(): string | null {
    return sessionStorage.getItem(ACTIVE_KEY)
  },

  setActiveTicketNumber(number: string): void {
    sessionStorage.setItem(ACTIVE_KEY, number)
  },

  clearActiveTicket(): void {
    sessionStorage.removeItem(ACTIVE_KEY)
  },

  consumeLastIssued(): IssuedTicket | null {
    const now = Date.now()
    if (consumeCache && now - consumeCache.at < 2000) return consumeCache.value
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
    consumeCache = { value, at: now }
    return value
  },

  async loadDraft(): Promise<Draft> {
    return readDraftRaw()
  },

  saveDraftFields(fields: ReportFields): void {
    void readDraftRaw().then((d) => {
      writeDraft({ ...d, fields })
    })
  },

  async addDraftEvidence(accepted: EvidenceMeta[]): Promise<void> {
    const draft = await readDraftRaw()
    writeDraft({ ...draft, evidence: [...draft.evidence, ...accepted] })
  },

  async removeDraftEvidence(id: string): Promise<void> {
    const draft = await readDraftRaw()
    writeDraft({ ...draft, evidence: draft.evidence.filter((e) => e.id !== id) })
  },

  clearDraft(): void {
    sessionStorage.removeItem(DRAFT_KEY)
  },

  async sendReply(number: string, body: string, evidence: EvidenceMeta[]): Promise<StoredTicket | null> {
    const list = await readTickets()
    const ticketIndex = list.findIndex((t) => t.number === number)
    if (ticketIndex === -1) return null
    const now = new Date().toISOString()
    const reply: MessageEntry = {
      id: uid('msg'),
      at: now,
      author: 'pelapor',
      body,
      attachment: evidence[0] ? { name: evidence[0].name, size: evidence[0].size } : undefined,
    }
    const t = list[ticketIndex]
    const timeline = t.timeline.filter((e) => !e.waiter)
    timeline.push({ at: formatStamp(now), label: 'Balasan diterima' })
    timeline.push({ at: formatStamp(now), label: 'Menunggu pemeriksaan admin', waiter: true })
    list[ticketIndex] = {
      ...t,
      messages: [...t.messages, reply],
      evidence: [...t.evidence, ...evidence.map((e) => ({ ...e, kind: 'reply' as const, at: now }))],
      timeline,
    }
    writeTickets(list)
    return list[ticketIndex]
  },

  listTicketNumbers(): string[] {
    return (cache ?? []).map((t) => t.number)
  },

  async loginAdmin(email: string, password: string): Promise<AdminSession | null> {
    const found = SEED_ADMINS.find((a) => a.email === email)
    if (!found) return null
    const candidate = await hashPin(password.trim(), found.password.split('$')[0] ?? '')
    const expected = await hashPin(found.password, found.password.split('$')[0] ?? '')
    if (candidate !== expected) return null
    return found.session
  },

  getAdminSession(): AdminSession | null {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AdminSession
    } catch {
      return null
    }
  },

  setAdminSession(session: AdminSession): void {
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
  },

  clearAdminSession(): void {
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
    sessionStorage.removeItem(ADMIN_TICKET_KEY)
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

  async appendAudit(actor: string, action: string, detail: string): Promise<void> {
    if (!auditCache) {
      const raw = sessionStorage.getItem(AUDIT_KEY)
      if (raw) {
        try {
          auditCache = JSON.parse(raw) as AuditEntry[]
        } catch {
          auditCache = []
        }
      } else {
        auditCache = SEED_AUDIT.map((e, i) => ({ ...e, id: `audit-seed-${i}` }))
      }
    }
    auditCache.unshift({
      id: uid('audit'),
      at: new Date().toISOString(),
      actor,
      action,
      detail,
    })
    sessionStorage.setItem(AUDIT_KEY, JSON.stringify(auditCache))
  },

  async listAudit(): Promise<AuditEntry[]> {
    if (!auditCache) {
      const raw = sessionStorage.getItem(AUDIT_KEY)
      if (raw) {
        try {
          auditCache = JSON.parse(raw) as AuditEntry[]
        } catch {
          auditCache = SEED_AUDIT.map((e, i) => ({ ...e, id: `audit-seed-${i}` }))
        }
      } else {
        auditCache = SEED_AUDIT.map((e, i) => ({ ...e, id: `audit-seed-${i}` }))
      }
    }
    return auditCache
  },

  async getInternalNotes(number: string): Promise<InternalNote[]> {
    if (!internalNotesCache) {
      const raw = sessionStorage.getItem(INTERNAL_NOTES_KEY)
      if (raw) {
        try {
          const obj = JSON.parse(raw) as Record<string, InternalNote[]>
          internalNotesCache = new Map(Object.entries(obj))
        } catch {
          internalNotesCache = new Map()
        }
      } else {
        internalNotesCache = new Map()
      }
    }
    return internalNotesCache.get(number) ?? []
  },

  async addInternalNote(number: string, admin: string, body: string): Promise<void> {
    const notes = await db.getInternalNotes(number)
    notes.push({ id: uid('note'), at: new Date().toISOString(), admin, body })
    internalNotesCache!.set(number, notes)
    const obj = Object.fromEntries(internalNotesCache!.entries())
    sessionStorage.setItem(INTERNAL_NOTES_KEY, JSON.stringify(obj))
  },

  allowedTransitions(current: Status): Status[] {
    switch (current) {
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

  async applyStatusTransition(
    number: string,
    toStatus: Status,
    note: string,
    internal: string,
    extra?: {
      unit?: string
      resultSummary?: string
      resultFile?: { name: string; size: number }
      messageToReporter?: string
    },
  ): Promise<StoredTicket | null> {
    const list = await readTickets()
    const idx = list.findIndex((t) => t.number === number)
    if (idx === -1) return null
    const t = list[idx]
    const now = new Date().toISOString()
    const timeline = [...t.timeline.filter((e) => !e.waiter), { at: formatStamp(now), label: toStatus, note }]
    const messages = [...t.messages]
    if (extra?.messageToReporter) {
      messages.push({
        id: uid('msg'),
        at: now,
        author: 'admin',
        body: extra.messageToReporter,
      })
    }
    if (toStatus === 'Perlu Dilengkapi') {
      timeline.push({ at: formatStamp(now), label: 'Menunggu tanggapan pelapor', waiter: true })
    }
    list[idx] = {
      ...t,
      status: toStatus,
      timeline,
      messages,
      completedAt: toStatus === 'Selesai' ? now : t.completedAt,
      resultSummary: extra?.resultSummary ?? t.resultSummary,
      resultFile: extra?.resultFile ?? t.resultFile,
    }
    writeTickets(list)
    if (internal) {
      const session = db.getAdminSession()
      await db.addInternalNote(number, session?.name ?? 'Admin', internal)
    }
    return list[idx]
  },

  async listTicketsForQueue(): Promise<StoredTicket[]> {
    const list = await readTickets()
    return list.filter((t) => t.status !== 'Selesai' && t.status !== 'Ditolak')
  },
}
