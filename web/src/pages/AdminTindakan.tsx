import { useState } from 'react'
import type { FormEvent, FormEventHandler } from 'react'
import { Link, useNavigate } from 'react-router'
import { Page, ActionsRow } from '../components/Page'
import { Field } from '../components/Field'
import { RequireAdmin } from '../components/RequireAdmin'
import { adminApi } from '../lib/api'

export function AdminTindakan() {
  const navigate = useNavigate()
  const [note, setNote] = useState('')
  const [internal, setInternal] = useState('')
  const [busy, setBusy] = useState(false)

  const number = adminApi.getAdminTicketNumber()

  const onSubmit: FormEventHandler<HTMLFormElement> = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!note.trim() || busy || !number) return
    setBusy(true)
    void adminApi
      .transition(number, 'Ditindaklanjuti', note.trim(), internal.trim())
      .then(() => navigate('/petugas/selesai'))
      .finally(() => setBusy(false))
  }

  return (
    <RequireAdmin>
      <Page
        eyebrow="STATUS DITERUSKAN"
        title="Catat tindak lanjut unit."
        lead="Setiap perubahan mencatat waktu, pelaku, dan catatan yang dapat ditelusuri."
      >
        <form onSubmit={onSubmit} noValidate>
          <Field id="catatan" label="Catatan tindak lanjut" required>
            <textarea
              id="catatan"
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catat tindakan unit yang dilakukan..."
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
              {busy ? 'Menyimpan…' : 'Simpan · Ditindaklanjuti'}
            </button>
            <Link to="/petugas/detail">Batal</Link>
          </ActionsRow>
        </form>
      </Page>
    </RequireAdmin>
  )
}
