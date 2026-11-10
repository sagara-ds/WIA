import { getDb } from './db'

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Diterima: ['Diverifikasi', 'Perlu Dilengkapi', 'Ditolak'],
  'Perlu Dilengkapi': ['Diverifikasi', 'Ditolak'],
  Diverifikasi: ['Diteruskan'],
  Diteruskan: ['Ditindaklanjuti'],
  Ditindaklanjuti: ['Selesai'],
  Ditolak: [],
  Selesai: [],
}

export function allowedTransitions(current: string): string[] {
  return ALLOWED_TRANSITIONS[current] ?? []
}

export interface TicketView {
  number: string
  pinHash: string
  title: string
  category: string
  chronology: string
  incidentDate: string
  incidentDateApprox: boolean
  location: string
  involvedParty: string
  status: string
  createdAt: string
  completedAt?: string
  resultSummary?: string
  resultFile?: { name: string; size: number }
  timeline: { at: string; label: string; waiter?: boolean; note?: string }[]
  messages: {
    id: string
    at: string
    author: 'admin' | 'pelapor'
    body: string
    isEnc?: boolean
    attachment?: { name: string; size: number }
  }[]
  evidence: { id: string; name: string; size: number; mime: string; kind: 'initial' | 'reply'; at: string; enc?: boolean }[]
  // Fase 3 — hanya ciphertext & wrapped key yang keluar dari server
  encrypted?: boolean
  shared?: boolean
  encJson?: string
  wrappedKey?: string
  recoverySalt?: string
  adminWrappedKey?: string
}

export function ticketView(number: string): TicketView | null {
  const db = getDb()
  const t = db.prepare('SELECT * FROM tickets WHERE number = ?').get(number) as
    | {
        number: string
        title: string
        category: string
        chronology: string
        incident_date: string
        incident_date_approx: number
        location: string
        involved_party: string
        status: string
        created_at: string
        completed_at: string | null
        result_summary: string | null
        result_file_name: string | null
        result_file_size: number | null
        enc_json: string | null
        wrapped_key: string | null
        recovery_salt: string | null
        admin_wrapped_key: string | null
        shared: number
        encrypted: number
      }
    | undefined
  if (!t) return null

  const timeline = db
    .prepare('SELECT at, label, waiter, note FROM ticket_timeline WHERE ticket_number = ? ORDER BY id')
    .all(number) as { at: string; label: string; waiter: number; note: string | null }[]

  const messages = db
    .prepare(
      'SELECT id, at, author, body, is_enc, attachment_name, attachment_size FROM ticket_messages WHERE ticket_number = ? ORDER BY rowid',
    )
    .all(number) as { id: string; at: string; author: string; body: string; is_enc: number; attachment_name: string | null; attachment_size: number | null }[]

  const evidence = db
    .prepare('SELECT id, name, size, mime, kind, at, enc FROM ticket_evidence WHERE ticket_number = ? ORDER BY rowid')
    .all(number) as { id: string; name: string; size: number; mime: string; kind: string; at: string; enc: number }[]

  return {
    number: t.number,
    pinHash: '',
    title: t.title,
    category: t.category,
    chronology: t.chronology,
    incidentDate: t.incident_date,
    incidentDateApprox: t.incident_date_approx === 1,
    location: t.location,
    involvedParty: t.involved_party,
    status: t.status,
    createdAt: t.created_at,
    ...(t.completed_at ? { completedAt: t.completed_at } : {}),
    ...(t.result_summary ? { resultSummary: t.result_summary } : {}),
    ...(t.result_file_name && t.result_file_size !== null
      ? { resultFile: { name: t.result_file_name, size: t.result_file_size } }
      : {}),
    ...(t.encrypted === 1 ? { encrypted: true } : {}),
    ...(t.shared === 1 ? { shared: true } : {}),
    ...(t.enc_json ? { encJson: t.enc_json } : {}),
    ...(t.wrapped_key ? { wrappedKey: t.wrapped_key } : {}),
    ...(t.recovery_salt ? { recoverySalt: t.recovery_salt } : {}),
    ...(t.admin_wrapped_key ? { adminWrappedKey: t.admin_wrapped_key } : {}),
    timeline: timeline.map((e) => ({
      at: e.at,
      label: e.label,
      ...(e.waiter === 1 ? { waiter: true } : {}),
      ...(e.note ? { note: e.note } : {}),
    })),
    messages: messages.map((m) => ({
      id: m.id,
      at: m.at,
      author: m.author === 'admin' ? ('admin' as const) : ('pelapor' as const),
      body: m.body,
      ...(m.is_enc === 1 ? { isEnc: true } : {}),
      ...(m.attachment_name && m.attachment_size !== null
        ? { attachment: { name: m.attachment_name, size: m.attachment_size } }
        : {}),
    })),
    evidence: evidence.map((e) => ({
      id: e.id,
      name: e.name,
      size: e.size,
      mime: e.mime,
      kind: e.kind === 'reply' ? ('reply' as const) : ('initial' as const),
      at: e.at,
      ...(e.enc === 1 ? { enc: true } : {}),
    })),
  }
}
