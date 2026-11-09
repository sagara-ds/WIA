import type { EvidenceMeta, IssuedTicket, ReportFields, StoredTicket, AdminSession, AuditEntry, InternalNote, Status } from './types'
import { db, validateFiles } from './mock-db'
import type { UploadIssue } from './mock-db'
import { KATEGORI, TRANSPARANSI, SEED_TICKETS, SEED_ADMINS, MASTER_UNITS } from './mock-data'
import { formatStamp } from './format'

export interface UploadResult {
  issues: UploadIssue[]
  accepted: EvidenceMeta[]
}

function toTicketView(t: StoredTicket): StoredTicket {
  return {
    ...t,
    timeline: t.timeline.map((e) => ({ ...e, at: formatStamp(e.at) })),
    messages: t.messages.map((m) => ({ ...m, at: formatStamp(m.at) })),
  }
}

export const api = {
  kategori(): string[] {
    return KATEGORI
  },

  async loadDraft(): Promise<{ fields: ReportFields | null; evidence: EvidenceMeta[] }> {
    const draft = await db.loadDraft()
    return { fields: draft.fields, evidence: draft.evidence }
  },

  async addDraftFiles(files: File[]): Promise<UploadResult> {
    const draft = await db.loadDraft()
    const { issues, accepted } = validateFiles(files, draft.evidence.length, 'initial')
    if (accepted.length > 0) await db.addDraftEvidence(accepted)
    return { issues, accepted }
  },

  async removeDraftEvidence(id: string): Promise<void> {
    return db.removeDraftEvidence(id)
  },

  saveDraftFields(fields: ReportFields): void {
    db.saveDraftFields(fields)
  },

  clearDraft(): void {
    db.clearDraft()
  },

  async createReport(fields: ReportFields, evidence: EvidenceMeta[]): Promise<IssuedTicket> {
    const issued = await db.createReport(fields, evidence)
    this.clearDraft()
    return issued
  },

  consumeLastIssued(): IssuedTicket | null {
    return db.consumeLastIssued()
  },

  async checkTicket(number: string, pin: string): Promise<StoredTicket | null> {
    const found = await db.checkTicket(number, pin)
    if (found) db.setActiveTicketNumber(found.number)
    return found ? toTicketView(found) : null
  },

  async getActiveTicket(): Promise<StoredTicket | null> {
    const number = db.getActiveTicketNumber()
    if (!number) return null
    const t = await db.getTicket(number)
    return t ? toTicketView(t) : null
  },

  async getTicket(number: string): Promise<StoredTicket | null> {
    const t = await db.getTicket(number)
    return t ? toTicketView(t) : null
  },

  clearActiveTicket(): void {
    db.clearActiveTicket()
  },

  async sendReplyDryRun(files: File[]): Promise<UploadResult> {
    const t = await db.getActiveTicketNumber()
    const ticket = t ? await db.getTicket(t) : null
    const currentCount = ticket?.evidence.length ?? 0
    const { issues, accepted } = validateFiles(files, currentCount, 'reply')
    return { issues, accepted }
  },

  async sendReply(
    number: string,
    body: string,
    evidence: EvidenceMeta[],
  ): Promise<{ ticket: StoredTicket | null }> {
    const updated = await db.sendReply(number, body, evidence)
    return { ticket: updated ? toTicketView(updated) : null }
  },

  transparansi() {
    return TRANSPARANSI
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
    const session = await db.loginAdmin(email, password)
    if (session) {
      db.setAdminSession(session)
      await db.appendAudit(session.name, 'LOGIN', `${session.email} masuk sebagai ${session.role}`)
    }
    return session
  },

  getSession(): AdminSession | null {
    return db.getAdminSession()
  },

  logout(): void {
    db.clearAdminSession()
  },

  async queue(filter?: { status?: Status; category?: string; search?: string }): Promise<StoredTicket[]> {
    let list = await db.listTicketsForQueue()
    if (filter?.status) list = list.filter((t) => t.status === filter.status)
    if (filter?.category) list = list.filter((t) => t.category === filter.category)
    if (filter?.search) {
      const q = filter.search.toLowerCase()
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.number.toLowerCase().includes(q))
    }
    return list.map(toTicketView)
  },

  async detail(number: string): Promise<{ ticket: StoredTicket; internalNotes: InternalNote[] } | null> {
    const ticket = await db.getTicket(number)
    if (!ticket) return null
    const session = db.getAdminSession()
    if (session) {
      await db.appendAudit(session.name, 'REPORT_VIEWED', `${number} · Akses detail tercatat.`)
    }
    const internalNotes = await db.getInternalNotes(number)
    return { ticket: toTicketView(ticket), internalNotes: internalNotes.map((n) => ({ ...n, at: formatStamp(n.at) })) }
  },

  async transition(
    number: string,
    toStatus: Status,
    note: string,
    internal: string,
    extra?: { unit?: string; resultSummary?: string; resultFile?: { name: string; size: number }; messageToReporter?: string },
  ): Promise<StoredTicket | null> {
    const session = db.getAdminSession()
    const updated = await db.applyStatusTransition(number, toStatus, note, internal, extra)
    if (updated && session) {
      await db.appendAudit(
        session.name,
        'STATUS_CHANGED',
        `${updated.status} · ${number} · Catatan: ${note.slice(0, 50)}${note.length > 50 ? '...' : ''}`,
      )
    }
    return updated ? toTicketView(updated) : null
  },

  allowedTransitions(status: Status): Status[] {
    return db.allowedTransitions(status)
  },

  async audit(): Promise<AuditEntry[]> {
    const entries = await db.listAudit()
    return entries.map((e) => ({ ...e, at: formatStamp(e.at) }))
  },

  masterData() {
    return {
      categories: KATEGORI,
      units: MASTER_UNITS,
      admins: SEED_ADMINS.map((a) => ({ email: a.session.email, name: a.session.name, role: a.session.role })),
    }
  },

  demoAdminCredentials(): { email: string; password: string; role: string }[] {
    return SEED_ADMINS.map((a) => ({ email: a.email, password: a.password, role: a.session.role }))
  },

  getAdminTicketNumber(): string | null {
    return db.getAdminTicketNumber()
  },

  setAdminTicketNumber(number: string): void {
    db.setAdminTicketNumber(number)
  },

  clearAdminTicket(): void {
    db.clearAdminTicket()
  },
}
