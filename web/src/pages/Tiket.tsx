import { useEffect, useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router'
import { Page, Card, ActionsRow, Timeline } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { Skeleton } from '../components/Feedback'
import { api } from '../lib/api'
import type { StoredTicket, Status } from '../lib/types'
import { formatTanggal, formatBytes } from '../lib/format'

interface StatusView {
  title: string
  lead: string
}

function statusView(status: Status): StatusView {
  switch (status) {
    case 'Diterima':
      return {
        title: 'Laporan Anda sudah diterima.',
        lead: 'Status: Diterima. Laporan menunggu pemeriksaan petugas.',
      }
    case 'Perlu Dilengkapi':
      return {
        title: 'Ada informasi yang perlu dilengkapi.',
        lead: 'Status: Perlu Dilengkapi. Admin meminta rincian agar laporan dapat diperiksa lebih lanjut.',
      }
    case 'Diverifikasi':
      return {
        title: 'Laporan layak ditindaklanjuti.',
        lead: 'Status: Diverifikasi. Verifikasi berarti laporan cukup layak diperiksa lebih lanjut; bukan penetapan bahwa dugaan terbukti.',
      }
    case 'Ditolak':
      return {
        title: 'Keputusan dan alasan tercatat.',
        lead: 'Status: Ditolak. Alasan penolakan dapat dibaca pada pesan dan linimasa.',
      }
    case 'Diteruskan':
      return {
        title: 'Laporan diteruskan ke unit.',
        lead: 'Status: Diteruskan. Unit penanggung jawab memeriksa laporan Anda.',
      }
    case 'Ditindaklanjuti':
      return {
        title: 'Laporan dalam tindak lanjut.',
        lead: 'Status: Ditindaklanjuti. Unit melaksanakan pemeriksaan dan tindak lanjut.',
      }
    case 'Selesai':
      return {
        title: 'Ringkasan penanganan tersedia.',
        lead: 'Status: Selesai. Ringkasan hasil dan dokumen penanganan dapat dibaca pada tiket.',
      }
  }
}

function isReplyable(status: Status): boolean {
  return status === 'Perlu Dilengkapi'
}

export function Tiket() {
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<StoredTicket | null>(null)
  const [missing, setMissing] = useState(false)
  const [shared, setShared] = useState<string | null>(null)

  useEffect(() => {
    void api.getActiveTicket().then((t) => {
      if (!t) {
        setMissing(true)
        return
      }
      setTicket(t)
    })
  }, [])

  if (missing) {
    return <Navigate to="/cek" replace />
  }
  if (!ticket) {
    return (
      <Page
        eyebrow="TIKET PRIBADI"
        title="Menyiapkan tiket Anda."
        lead="Data tiket sedang dimuat."
      >
        <Skeleton lines={5} />
      </Page>
    )
  }

  const view = statusView(ticket.status)
  const exitTicket = (to: string) => {
    api.clearActiveTicket()
    navigate(to)
  }

  return (
    <Page
      eyebrow={`TIKET ${ticket.number}`}
      title={view.title}
      badge={<StatusBadge status={ticket.status} />}
      lead={view.lead}
    >
      <div className="cards">
        <Card title="Laporan Anda">
          <p>
            {`${ticket.title}. ${ticket.category} · ${formatTanggal(ticket.incidentDate, ticket.incidentDateApprox)} · ${ticket.location}`}
            {ticket.evidence.length > 0
              ? `\nBukti: ${ticket.evidence.map((e) => `${e.name} (${formatBytes(e.size)})`).join(', ')}`
              : '\nBukti: tidak ada.'}
            {'\nIsi dan bukti hanya tersedia dalam akses tiket.'}
          </p>
        </Card>
        <Card title="Linimasa penanganan">
          <Timeline entries={ticket.timeline} />
        </Card>
        {ticket.messages.map((m) => (
          <Card key={m.id} title={`${m.author === 'admin' ? 'Pesan admin' : 'Pelapor'} · ${m.at}`}>
            <p>
              {m.body}
              {m.attachment ? `\nLampiran: ${m.attachment.name} (${formatBytes(m.attachment.size)})` : ''}
            </p>
          </Card>
        ))}
        {ticket.status === 'Selesai' && ticket.resultSummary ? (
          <Card title="Ringkasan hasil">
            <p>{ticket.resultSummary}</p>
          </Card>
        ) : null}
        {ticket.status === 'Selesai' && ticket.resultFile ? (
          <Card title="Dokumen hasil">
            <p>{`${ticket.resultFile.name} · ${formatBytes(ticket.resultFile.size)} · berkas contoh`}</p>
          </Card>
        ) : null}
      </div>

      <ActionsRow>
        {ticket.encrypted && !ticket.shared ? (
          <button type="button" onClick={() => { void api.shareWithAdmin(ticket.number).then((ok) => setShared(ok ? 'Izin dibagikan. Admin dapat membaca isi.' : 'Gagal membagikan. Coba lagi.')) }}>
            Izinkan admin membaca
          </button>
        ) : null}
        {shared ? <p>{shared}</p> : null}
        {isReplyable(ticket.status) ? (
          <Link to="/tiket/balas">Balas &amp; tambah bukti</Link>
        ) : ticket.status === 'Selesai' ? (
          <Link to="/transparansi">Lihat transparansi</Link>
        ) : (
          <button type="button" onClick={() => exitTicket('/cek')}>
            Kembali ke cek status
          </button>
        )}
        {ticket.status === 'Selesai' ? (
          <button type="button" onClick={() => exitTicket('/')}>
            Kembali ke beranda
          </button>
        ) : ticket.status === 'Perlu Dilengkapi' ? (
          <button type="button" onClick={() => exitTicket('/cek')}>
            Kembali ke cek status
          </button>
        ) : null}
      </ActionsRow>
    </Page>
  )
}
