import type { Status } from '../lib/types'

const BADGE_CLASS: Record<Status, string> = {
  Diterima: 'badge-diterima',
  'Perlu Dilengkapi': 'badge-perlu-dilengkapi',
  Diverifikasi: 'badge-diverifikasi',
  Ditolak: 'badge-ditolak',
  Diteruskan: 'badge-diteruskan',
  Ditindaklanjuti: 'badge-ditindaklanjuti',
  Selesai: 'badge-selesai',
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge ${BADGE_CLASS[status]}`}>{status}</span>
}
