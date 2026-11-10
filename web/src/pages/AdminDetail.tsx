import { useEffect, useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router'
import { Page, Card, ActionsRow, Timeline, Notice } from '../components/Page'
import { Field } from '../components/Field'
import { RequireAdmin } from '../components/RequireAdmin'
import { StatusBadge } from '../components/StatusBadge'
import { Skeleton } from '../components/Feedback'
import { adminApi } from '../lib/api'
import type { StoredTicket, InternalNote } from '../lib/types'
import { formatTanggal, formatBytes } from '../lib/format'

export function AdminDetail() {
  const navigate = useNavigate()
  const [number] = useState(() => adminApi.getAdminTicketNumber())
  const [ticket, setTicket] = useState<StoredTicket | null>(null)
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([])
  const [missing, setMissing] = useState(false)
  const [pesan, setPesan] = useState('')
  const [kirimBusy, setKirimBusy] = useState(false)
  const [kirimError, setKirimError] = useState<string | null>(null)

  const onKirim = () => {
    if (!number || !pesan.trim() || kirimBusy) return
    setKirimBusy(true)
    setKirimError(null)
    void adminApi
      .sendMessage(number, pesan.trim())
      .then((updated) => {
        setTicket(updated)
        setPesan('')
      })
      .catch((e: unknown) => setKirimError(e instanceof Error ? e.message : 'Gagal mengirim pesan. Coba lagi.'))
      .finally(() => setKirimBusy(false))
  }

  useEffect(() => {
    if (!number) return
    let active = true
    void adminApi.detail(number).then((data) => {
      if (!active) return
      if (!data) {
        setMissing(true)
        return
      }
      setTicket(data.ticket)
      setInternalNotes(data.internalNotes)
    })
    return () => {
      active = false
    }
  }, [number])

  if (!number || missing) return <Navigate to="/petugas/antrean" replace />

  if (!ticket) {
    return (
      <RequireAdmin>
        <Page
          eyebrow="DETAIL LAPORAN"
          title="Menyiapkan detail laporan."
          lead="Data tiket sedang dimuat."
        >
          <Skeleton lines={5} />
        </Page>
      </RequireAdmin>
    )
  }

  const allowed = adminApi.allowedTransitions(ticket.status)

  return (
    <RequireAdmin>
      <Page
        eyebrow={`DETAIL LAPORAN · ${ticket.status.toUpperCase()}`}
        title={ticket.title}
        badge={<StatusBadge status={ticket.status} />}
        lead={`${ticket.number} · Anonim · ${formatTanggal(ticket.incidentDate, ticket.incidentDateApprox)}. Tidak ada data identitas yang diminta dalam formulir anonim.`}
      >
        <div className="cards">
          <Card title="Kronologi & bukti">
            <p>
              {formatTanggal(ticket.incidentDate, ticket.incidentDateApprox)} · {ticket.location}
              {'\n'}
              {ticket.chronology}
              {'\n'}
              Pihak terkait: {ticket.involvedParty}
              {ticket.evidence.length > 0
                ? `\n\nLampiran: ${ticket.evidence.map((e) => `${e.name} (${formatBytes(e.size)})`).join(', ')}`
                : '\n\nBukti: tidak ada.'}
            </p>
          </Card>
          <Card title="Riwayat">
            <Timeline entries={ticket.timeline} />
          </Card>
          {ticket.messages.length > 0 ? (
            <Card title="Pesan">
              {ticket.messages.map((m) => (
                <p key={m.id}>
                  <strong>
                    {m.author === 'admin' ? 'Pesan admin' : 'Pelapor'} · {m.at}
                  </strong>
                  {'\n'}
                  {m.body}
                  {m.attachment ? `\nLampiran: ${m.attachment.name} (${formatBytes(m.attachment.size)})` : ''}
                  {'\n'}
                </p>
              ))}
            </Card>
          ) : null}
          {internalNotes.length > 0 ? (
            <Card title="Catatan internal">
              {internalNotes.map((n) => (
                <p key={n.id}>
                  <strong>
                    {n.admin} · {n.at}
                  </strong>
                  {'\n'}
                  {n.body}
                  {'\n'}
                </p>
              ))}
            </Card>
          ) : null}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onKirim()
          }}
          noValidate
        >
          {kirimError ? (
            <Notice variant="error">
              <p role="alert">{kirimError}</p>
            </Notice>
          ) : null}
          <Field id="pesan-admin" label="Pesan untuk pelapor" required>
            <textarea
              id="pesan-admin"
              className="input"
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              placeholder="Tulis pesan yang terlihat oleh pelapor pada halaman tiket…"
              aria-invalid={!pesan.trim() ? 'true' : undefined}
            />
          </Field>
          <ActionsRow>
            <button type="submit" disabled={kirimBusy}>
              {kirimBusy ? 'Mengirim…' : 'Kirim pesan'}
            </button>
          </ActionsRow>
        </form>

        {ticket.encrypted && !ticket.shared && !ticket.locked ? (
          <Notice>
            <p>
              Laporan ini terenkripsi end-to-end dan pelapor belum memberi izin membaca.
              Petugas hanya dapat melihat status dan metadata. Ajukan permintaan pelengkap
              agar pelapor mengizinkan akses bila isi diperlukan.
            </p>
          </Notice>
        ) : null}

        {ticket.encrypted && ticket.shared && ticket.locked ? (
          <Notice variant="error">
            <p>
              Pelapor sudah berbagi akses, tetapi isi gagal dibuka di perangkat ini (kunci
              admin tidak tersedia). Muat ulang halaman atau hubungi super admin.
            </p>
          </Notice>
        ) : null}

        <ActionsRow>
          {allowed.includes('Diverifikasi') ? (
            <Link to="/petugas/verifikasi">Verifikasi laporan</Link>
          ) : null}
          {allowed.includes('Perlu Dilengkapi') ? (
            <Link to="/petugas/lengkapi">Minta dilengkapi</Link>
          ) : null}
          {allowed.includes('Ditolak') ? <Link to="/petugas/tolak">Tolak dengan alasan</Link> : null}
          {allowed.includes('Diteruskan') ? <Link to="/petugas/teruskan">Lanjut teruskan</Link> : null}
          {allowed.includes('Ditindaklanjuti') ? (
            <Link to="/petugas/tindakan">Catat tindak lanjut</Link>
          ) : null}
          {allowed.includes('Selesai') ? <Link to="/petugas/selesai">Ringkas hasil & selesai</Link> : null}
          <button type="button" onClick={() => navigate('/petugas/antrean')}>
            Kembali ke antrean
          </button>
        </ActionsRow>
      </Page>
    </RequireAdmin>
  )
}
