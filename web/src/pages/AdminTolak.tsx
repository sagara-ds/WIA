import { useState } from 'react'
import type { FormEvent, FormEventHandler } from 'react'
import { Link, useNavigate } from 'react-router'
import { Page, ActionsRow } from '../components/Page'
import { Field } from '../components/Field'
import { RequireAdmin } from '../components/RequireAdmin'
import { adminApi } from '../lib/api'

export function AdminTolak() {
  const navigate = useNavigate()
  const [reason, setReason] = useState('')
  const [internal, setInternal] = useState('')
  const [busy, setBusy] = useState(false)

  const number = adminApi.getAdminTicketNumber()

  const onSubmit: FormEventHandler<HTMLFormElement> = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!reason.trim() || busy || !number) return
    setBusy(true)
    void adminApi
      .transition(number, 'Ditolak', reason.trim(), internal.trim(), {
        messageToReporter: `Laporan ditolak. Alasan: ${reason.trim()}`,
      })
      .then(() => navigate('/petugas/antrean'))
      .finally(() => setBusy(false))
  }

  return (
    <RequireAdmin>
      <Page
        eyebrow="PENOLAKAN LAPORAN"
        title="Jelaskan alasan keputusan."
        lead="Alasan wajib dicatat dan dapat dibaca pelapor. Isi contoh harus ditinjau sesuai kebijakan studi kasus."
      >
        <form onSubmit={onSubmit} noValidate>
          <Field id="alasan" label="Alasan penolakan" required>
            <textarea
              id="alasan"
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan alasan penolakan..."
              aria-invalid={!reason.trim() ? 'true' : undefined}
            />
          </Field>
          <Field id="internal" label="Catatan internal">
            <textarea
              id="internal"
              className="input"
              value={internal}
              onChange={(e) => setInternal(e.target.value)}
              placeholder="Catatan untuk petugas lain (tidak terlihat pelapor)"
            />
          </Field>
          <ActionsRow>
            <button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan · Ditolak'}
            </button>
            <Link to="/petugas/detail">Batal</Link>
          </ActionsRow>
        </form>
      </Page>
    </RequireAdmin>
  )
}
