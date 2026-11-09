import { useState } from 'react'
import type { FormEvent, FormEventHandler } from 'react'
import { Link, useNavigate } from 'react-router'
import { Page, ActionsRow } from '../components/Page'
import { Field } from '../components/Field'
import { RequireAdmin } from '../components/RequireAdmin'
import { adminApi } from '../lib/api'

export function AdminLengkapi() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [internal, setInternal] = useState('')
  const [busy, setBusy] = useState(false)

  const number = adminApi.getAdminTicketNumber()

  const onSubmit: FormEventHandler<HTMLFormElement> = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!message.trim() || busy || !number) return
    setBusy(true)
    void adminApi
      .transition(number, 'Perlu Dilengkapi', 'Permintaan informasi tambahan', internal.trim(), {
        messageToReporter: message.trim(),
      })
      .then(() => navigate('/petugas/antrean'))
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
          <Field id="pesan" label="Pesan untuk pelapor" required>
            <textarea
              id="pesan"
              className="input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mohon jelaskan rincian yang dibutuhkan..."
              aria-invalid={!message.trim() ? 'true' : undefined}
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
