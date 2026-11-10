import { useState } from 'react'
import type { FormEvent, FormEventHandler } from 'react'
import { Link, useNavigate } from 'react-router'
import { Page, ActionsRow, Notice } from '../components/Page'
import { Field } from '../components/Field'
import { RequireAdmin } from '../components/RequireAdmin'
import { adminApi } from '../lib/api'

export function AdminVerifikasi() {
  const navigate = useNavigate()
  const [note, setNote] = useState('')
  const [internal, setInternal] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const number = adminApi.getAdminTicketNumber()

  const onSubmit: FormEventHandler<HTMLFormElement> = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!note.trim() || busy || !number) return
    setBusy(true)
    setError(null)
    void adminApi
      .transition(number, 'Diverifikasi', note.trim(), internal.trim())
      .then(() => navigate('/petugas/teruskan'))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Gagal menyimpan. Coba lagi.'))
      .finally(() => setBusy(false))
  }

  return (
    <RequireAdmin>
      <Page
        eyebrow="KEPUTUSAN VERIFIKASI"
        title="Tandai layak ditindaklanjuti."
        lead="Verifikasi berarti laporan cukup layak diperiksa lebih lanjut; bukan penetapan bahwa dugaan terbukti."
      >
        <form onSubmit={onSubmit} noValidate>
          {error ? (
            <Notice variant="error">
              <p role="alert">{error}</p>
            </Notice>
          ) : null}
          <Field id="catatan" label="Catatan keputusan" required>
            <textarea
              id="catatan"
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Jelaskan alasan verifikasi..."
              aria-invalid={!note.trim() ? 'true' : undefined}
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
              {busy ? 'Menyimpan…' : 'Simpan · Diverifikasi'}
            </button>
            <Link to="/petugas/detail">Batal</Link>
          </ActionsRow>
        </form>
      </Page>
    </RequireAdmin>
  )
}
