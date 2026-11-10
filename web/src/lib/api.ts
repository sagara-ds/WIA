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

function toTicketView(t: StoredTicket): StoredTicket {
  return {
    ...t,
    timeline: t.timeline.map((e) => ({ ...e, at: formatStamp(e.at) })),
    messages: t.messages.map((m) => ({ ...m, at: formatStamp(m.at) })),
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
    const form = new FormData()
    form.append('fields', JSON.stringify(fields))
    for (const e of evidence) {
      const file = draftFileMap.get(e.id)
      if (file) form.append('files', file, e.name)
    }
    const issued = await json<IssuedTicket>('/api/reports', { method: 'POST', body: form })
    if (!issued || !issued.number || !issued.pin) return null
    draftFileMap.clear()
    this.clearDraft()
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
    if (found) sessionStorage.setItem(ACTIVE_KEY, found.number)
    return found ? toTicketView(found) : null
  },

  async getActiveTicket(): Promise<StoredTicket | null> {
    const number = sessionStorage.getItem(ACTIVE_KEY)
    if (!number) return null
    const t = await json<StoredTicket>(`/api/tickets/${encodeURIComponent(number)}`)
    return t ? toTicketView(t) : null
  },

  async getTicket(number: string): Promise<StoredTicket | null> {
    const t = await json<StoredTicket>(`/api/tickets/${encodeURIComponent(number)}`)
    return t ? toTicketView(t) : null
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
    form.append('body', body)
    const remaining = [...evidence]
    for (const e of remaining) {
      const file = replyFileMap.get(e.id)
      if (file) form.append('files', file, e.name)
    }
    replyFileMap.clear()
    const result = await json<{ ticket: StoredTicket }>(`/api/tickets/${encodeURIComponent(number)}/replies`, {
      method: 'POST',
      body: form,
    })
    return { ticket: result?.ticket ? toTicketView(result.ticket) : null }
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
    if (session) sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
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
    return (list ?? []).map(toTicketView)
  },

  async detail(number: string): Promise<{ ticket: StoredTicket; internalNotes: InternalNote[] } | null> {
    const data = await json<{ ticket: StoredTicket; internalNotes: InternalNote[] }>(
      `/api/admin/tickets/${encodeURIComponent(number)}`,
    )
    if (!data) return null
    return {
      ticket: toTicketView(data.ticket),
      internalNotes: data.internalNotes.map((n) => ({ ...n, at: formatStamp(n.at) })),
    }
  },

  async transition(
    number: string,
    toStatus: Status,
    note: string,
    internal: string,
    extra?: { unit?: string; resultSummary?: string; resultFile?: { name: string; size: number }; messageToReporter?: string },
  ): Promise<StoredTicket | null> {
    const updated = await json<StoredTicket>(`/api/admin/tickets/${encodeURIComponent(number)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toStatus, note, internal, extra }),
    })
    return updated ? toTicketView(updated) : null
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
    categories: string[]
    units: { id: string; name: string; active: boolean }[]
    admins: { email: string; name: string; role: string }[]
  } | null> {
    return json('/api/admin/master')
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
