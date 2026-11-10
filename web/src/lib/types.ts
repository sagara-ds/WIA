export type Status =
  | 'Diterima'
  | 'Perlu Dilengkapi'
  | 'Diverifikasi'
  | 'Ditolak'
  | 'Diteruskan'
  | 'Ditindaklanjuti'
  | 'Selesai'

export type MessageAuthor = 'admin' | 'pelapor'

export interface EvidenceMeta {
  id: string
  name: string
  size: number
  mime: string
  kind: 'initial' | 'reply'
  at: string
}

export interface MessageEntry {
  id: string
  at: string
  author: MessageAuthor
  body: string
  attachment?: { name: string; size: number }
}

export interface TimelineEntry {
  at: string
  label: string
  waiter?: boolean
  note?: string
}

export interface ReportFields {
  category: string
  title: string
  chronology: string
  incidentDate: string
  incidentDateApprox: boolean
  location: string
  involvedParty: string
}

export interface StoredTicket {
  number: string
  pinHash: string
  title: string
  category: string
  chronology: string
  incidentDate: string
  incidentDateApprox: boolean
  location: string
  involvedParty: string
  status: Status
  createdAt: string
  completedAt?: string
  timeline: TimelineEntry[]
  messages: MessageEntry[]
  evidence: EvidenceMeta[]
  resultSummary?: string
  resultFile?: { name: string; size: number }
  seeded?: boolean
}

export interface IssuedTicket {
  number: string
  pin: string
}

export interface Transparansi {
  period: string
  updated: string
  stats: { value: string; label: string }[]
  perKategori: string
  tren: string
  perKategoriData: { label: string; value: number }[]
  trenData: { label: string; value: number }[]
}

export interface Draft {
  fields: ReportFields | null
  evidence: EvidenceMeta[]
}

export interface UploadIssue {
  name: string
  tooBig: boolean
  wrongType: boolean
  overLimit: boolean
}

export type AdminRole = 'verifikator' | 'super_admin'

export interface AdminSession {
  email: string
  role: AdminRole
  name: string
}

export interface AuditEntry {
  id: string
  at: string
  actor: string
  action: string
  detail: string
}

export interface InternalNote {
  id: string
  at: string
  admin: string
  body: string
}

export const MAX_FILES_INITIAL = 5
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'] as const
