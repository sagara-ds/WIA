import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, Navigate } from 'react-router'
import { Page, Card, ActionsRow, Notice } from '../components/Page'
import { Field } from '../components/Field'
import { FileChip } from '../components/FileChip'
import { Skeleton } from '../components/Feedback'
import { ACCEPT_ATTR } from '../lib/upload'
import { api } from '../lib/api'
import type { StoredTicket, EvidenceMeta, UploadIssue } from '../lib/types'

function issueText(issues: UploadIssue[]): string {
  return issues
    .map((i) => {
      if (i.overLimit) return `${i.name} tidak ditambahkan — jumlah berkas melewati batas maksimal 5.`
      if (i.tooBig && i.wrongType) return `Ukuran ${i.name} terlalu besar dan jenis berkas belum didukung.`
      if (i.tooBig) return `Ukuran ${i.name} terlalu besar.`
      return `Jenis berkas ${i.name} belum didukung.`
    })
    .join(' ')
}

export function Balas() {
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<StoredTicket | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'invalid'>('loading')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<EvidenceMeta[]>([])
  const [issues, setIssues] = useState<UploadIssue[]>([])
  const [busy, setBusy] = useState(false)
  const [emptyReply, setEmptyReply] = useState(false)

  useEffect(() => {
    let active = true
    void api.getActiveTicket().then((t) => {
      if (!active) return
      if (!t || t.status !== 'Perlu Dilengkapi') {
        setLoadState('invalid')
        return
      }
      setTicket(t)
      setLoadState('ok')
    })
    return () => {
      active = false
    }
  }, [])

  if (loadState === 'invalid') {
    return <Navigate to="/tiket" replace />
  }
  if (loadState === 'loading' || !ticket) {
    return (
      <Page
        eyebrow="TANGGAPI PERMINTAAN ADMIN"
        title="Menyiapkan formulir balasan."
        lead="Data tiket sedang dimuat."
      >
        <Skeleton lines={4} />
      </Page>
    )
  }

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (picked.length === 0) return
    const draft = await pickReplyFiles(picked)
    setFiles((prev) => [...prev, ...draft])
  }

  async function pickReplyFiles(picked: File[]): Promise<EvidenceMeta[]> {
    const result = await api.sendReplyDryRun(picked)
    if (result.issues.length > 0) setIssues((prev) => [...prev, ...result.issues])
    return result.accepted
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!body.trim() || busy) {
      setEmptyReply(true)
      return
    }
    setBusy(true)
    void api
      .sendReply(ticket.number, body.trim(), files)
      .then(() => navigate('/tiket/balas-terkirim'))
      .finally(() => setBusy(false))
  }

  return (
    <Page
      eyebrow="TANGGAPI PERMINTAAN ADMIN"
      title="Lengkapi informasi laporan."
      lead="Balasan dan bukti tambahan hanya dilihat oleh petugas berwenang pada simulasi produk akhir."
    >
      <div className="cards">
        <Card title="Permintaan admin">
          <p>
            {(() => {
              const terakhir = [...ticket.messages].reverse().find((m) => m.author === 'admin')
              return terakhir
                ? `${terakhir.body}`
                : 'Admin meminta rincian tambahan agar laporan dapat diperiksa lebih lanjut.'
            })()}
          </p>
        </Card>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <Field id="balasan" label="Balasan" required>
          <textarea
            id="balasan"
            className="input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Jelaskan rincian yang diminta admin. Hindari identitas pribadi."
            aria-invalid={emptyReply ? 'true' : undefined}
          />
        </Field>

        <Field
          id="bukti-tambahan"
          label="Bukti tambahan"
          hint="JPG, PNG, atau PDF · melengkapi rekam bukti tiket, maksimal 10 MB per berkas."
        >
          <label className="file-input-btn" htmlFor="bukti-tambahan">
            Pilih berkas bukti tambahan
          </label>
          <input
            id="bukti-tambahan"
            type="file"
            className="file-hidden"
            multiple
            accept={ACCEPT_ATTR}
            onChange={(e) => void onPick(e)}
          />
          {files.length > 0 ? (
            <div className="cards" style={{ marginTop: 10, gap: 8 }}>
              {files.map((f) => (
                <FileChip
                  key={f.id}
                  item={f}
                  onRemove={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                />
              ))}
            </div>
          ) : null}
        </Field>

        {issues.length > 0 ? (
          <Notice variant="error">
            <p>
              <strong>Berkas belum bisa ditambahkan.</strong> {issueText(issues)}
            </p>
          </Notice>
        ) : null}
        {emptyReply ? (
          <Notice variant="error">
            <p>Balasan wajib diisi.</p>
          </Notice>
        ) : null}

        <ActionsRow>
          <button type="submit" disabled={busy}>
            {busy ? 'Mengirim…' : 'Kirim balasan'}
          </button>
          <Link to="/tiket">Kembali ke tiket</Link>
        </ActionsRow>
      </form>
    </Page>
  )
}
