import { useState } from 'react'
import type { FormEvent, FormEventHandler } from 'react'
import { Link, useNavigate } from 'react-router'
import { Page, ActionsRow, Notice } from '../components/Page'
import { Field } from '../components/Field'
import { RequireAdmin } from '../components/RequireAdmin'
import { adminApi } from '../lib/api'

export function AdminLengkapi() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [internal, setInternal] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const number = adminApi.getAdminTicketNumber()

  const onSubmit: FormEventHandler<HTMLFormElement> = (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault()
    if (busy || !number) return
    setSubmitted(true)
    if (!message.trim()) return
    setBusy(true)
    setError(null)
    void adminApi
      .transition(
        number,
        'Perlu Dilengkapi',
        'Permintaan informasi tambahan',
        internal.trim(),
        {
          messageToReporter: message.trim(),
        },
      )
      .then(() => navigate('/petugas/antrean'))
      .catch((e: unknown) =>
        setError(
          e instanceof Error ? e.message : 'Gagal menyimpan. Coba lagi.',
        ),
      )
      .finally(() => setBusy(false))
  }

  return (
    <RequireAdmin>
      <Page
        eyebrow="MINTA INFORMASI TAMBAHAN"
        title="Apa yang perlu dilengkapi?"
        lead="Pesan ini terlihat oleh pelapor pada tiket. Catatan internal tetap terpisah."
      >
        <form onSubmit={onSubmit} noValidate>
          {error ? (
            <Notice variant="error">
              <p role="alert">{error}</p>
            </Notice>
          ) : null}
          <Field
            id="pesan"
            label="Pesan untuk pelapor"
            required
            error={
              submitted && !message.trim()
                ? 'Pesan untuk pelapor wajib diisi.'
                : undefined
            }
          >
            <textarea
              id="pesan"
              className="input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mohon jelaskan rincian yang dibutuhkan..."
              aria-invalid={submitted && !message.trim() ? 'true' : undefined}
              aria-describedby={
                submitted && !message.trim() ? 'pesan-error' : undefined
              }
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
              {busy ? 'Menyimpan…' : 'Simpan · Perlu Dilengkapi'}
            </button>
            <Link to="/petugas/detail">Batal</Link>
          </ActionsRow>
        </form>
      </Page>
    </RequireAdmin>
  )
}
