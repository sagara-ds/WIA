import { useState } from 'react'
import type { FormEvent, FormEventHandler } from 'react'
import { Link, useNavigate } from 'react-router'
import { Page, ActionsRow, Notice } from '../components/Page'
import { Field } from '../components/Field'
import { RequireAdmin } from '../components/RequireAdmin'
import { adminApi } from '../lib/api'

export function AdminSelesai() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState('')
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
    if (!summary.trim()) return
    setBusy(true)
    setError(null)
    void adminApi
      .transition(number, 'Selesai', 'Penanganan selesai', internal.trim(), {
        resultSummary: summary.trim(),
        resultFile: { name: 'ringkasan-penanganan.pdf', size: 145920 },
      })
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
        eyebrow="STATUS DITINDAKLANJUTI"
        title="Ringkas hasil penanganan."
        lead="Hasil yang dibagikan ke pelapor harus jelas dan tidak membuka data pribadi pihak lain."
      >
        <form onSubmit={onSubmit} noValidate>
          {error ? (
            <Notice variant="error">
              <p role="alert">{error}</p>
            </Notice>
          ) : null}
          <Field
            id="ringkasan"
            label="Ringkasan hasil"
            required
            error={
              submitted && !summary.trim()
                ? 'Ringkasan hasil wajib diisi.'
                : undefined
            }
          >
            <textarea
              id="ringkasan"
              className="input"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Ringkasan hasil penanganan yang akan dibagikan ke pelapor..."
              aria-invalid={submitted && !summary.trim() ? 'true' : undefined}
              aria-describedby={
                submitted && !summary.trim() ? 'ringkasan-error' : undefined
              }
            />
          </Field>
          <Field
            id="dokumen"
            label="Dokumen hasil"
            hint="Pada simulasi ini, dokumen hasil otomatis dibuat (ringkasan-penanganan.pdf)."
          >
            <input
              type="text"
              className="input"
              value="ringkasan-penanganan.pdf (otomatis)"
              disabled
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
              {busy ? 'Menyimpan…' : 'Simpan · Selesai'}
            </button>
            <Link to="/petugas/detail">Batal</Link>
          </ActionsRow>
        </form>
      </Page>
    </RequireAdmin>
  )
}
