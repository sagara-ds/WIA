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
    attachment?: { name: string; size: number }
  }[]
  evidence: { id: string; name: string; size: number; mime: string; kind: 'initial' | 'reply'; at: string }[]
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
      }
    | undefined
  if (!t) return null

  const timeline = db
    .prepare('SELECT at, label, waiter, note FROM ticket_timeline WHERE ticket_number = ? ORDER BY id')
    .all(number) as { at: string; label: string; waiter: number; note: string | null }[]

  const messages = db
    .prepare(
      'SELECT id, at, author, body, attachment_name, attachment_size FROM ticket_messages WHERE ticket_number = ? ORDER BY rowid',
    )
    .all(number) as { id: string; at: string; author: string; body: string; attachment_name: string | null; attachment_size: number | null }[]

  const evidence = db
    .prepare('SELECT id, name, size, mime, kind, at FROM ticket_evidence WHERE ticket_number = ? ORDER BY rowid')
    .all(number) as { id: string; name: string; size: number; mime: string; kind: string; at: string }[]

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
    })),
  }
}
