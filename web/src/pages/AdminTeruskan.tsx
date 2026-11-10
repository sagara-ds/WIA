import { useEffect, useState } from 'react'
import type { FormEvent, FormEventHandler } from 'react'
import { Link, useNavigate } from 'react-router'
import { Page, ActionsRow, Notice } from '../components/Page'
import { Field } from '../components/Field'
import { RequireAdmin } from '../components/RequireAdmin'
import { adminApi } from '../lib/api'

export function AdminTeruskan() {
  const navigate = useNavigate()
  const [unit, setUnit] = useState('')
  const [note, setNote] = useState('')
  const [internal, setInternal] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [units, setUnits] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    void adminApi.reference().then((d) => setUnits(d?.units ?? []))
  }, [])

  const number = adminApi.getAdminTicketNumber()

  const onSubmit: FormEventHandler<HTMLFormElement> = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!unit || !note.trim() || busy || !number) return
    setBusy(true)
    setError(null)
    void adminApi
      .transition(number, 'Diteruskan', note.trim(), internal.trim(), { unit })
      .then(() => navigate('/petugas/tindakan'))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Gagal menyimpan. Coba lagi.'))
      .finally(() => setBusy(false))
  }

  return (
    <RequireAdmin>
      <Page
        eyebrow="STATUS DIVERIFIKASI"
        title="Tentukan unit penanggung jawab."
        lead="Unit contoh bukan mitra instansi nyata. Penerusan hanya disimulasikan."
      >
        <form onSubmit={onSubmit} noValidate>
          {error ? (
            <Notice variant="error">
              <p role="alert">{error}</p>
            </Notice>
          ) : null}
          <Field id="unit" label="Unit tujuan" required>
            <select
              id="unit"
              className="input"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              aria-invalid={!unit ? 'true' : undefined}
            >
              <option value="" disabled>
                Pilih unit tujuan…
              </option>
              {units.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="catatan" label="Catatan penerusan" required>
            <textarea
              id="catatan"
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Jelaskan tindak lanjut yang diperlukan..."
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
              {busy ? 'Menyimpan…' : 'Simpan · Diteruskan'}
            </button>
            <Link to="/petugas/detail">Batal</Link>
          </ActionsRow>
        </form>
      </Page>
    </RequireAdmin>
  )
}
