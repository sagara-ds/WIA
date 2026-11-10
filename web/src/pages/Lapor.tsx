import { useEffect, useState } from 'react'
import type { FormEventHandler, FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Page, ActionsRow, Notice } from '../components/Page'
import { Field } from '../components/Field'
import { Skeleton } from '../components/Feedback'
import type { ReportFields } from '../lib/types'
import { api } from '../lib/api'

const EMPTY: ReportFields = {
  category: '',
  title: '',
  chronology: '',
  incidentDate: '',
  incidentDateApprox: false,
  location: '',
  involvedParty: '',
}

const ERROR_MESSAGE: Record<string, string> = {
  category: 'Pilih kategori laporan.',
  title: 'Judul laporan wajib diisi.',
  chronology: 'Kronologi wajib diisi.',
  incidentDate: 'Tanggal kejadian wajib diisi.',
  location: 'Lokasi kejadian wajib diisi.',
  involvedParty: 'Pihak terkait wajib diisi.',
}

export function Lapor() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('kategori') ?? ''
  const [fields, setFields] = useState<ReportFields>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [invalid, setInvalid] = useState<string[]>([])
  const [kategori, setKategori] = useState<string[]>([])

  useEffect(() => {
    void api.kategori().then((list) => setKategori(list))
    void api.loadDraft().then((d) => {
      setFields({
        ...EMPTY,
        ...d.fields,
        ...(initialCategory ? { category: initialCategory } : {}),
      })
      setLoaded(true)
    })
  }, [initialCategory])

  const set = <K extends keyof ReportFields>(
    key: K,
    value: ReportFields[K],
  ) => {
    setFields((f) => ({ ...f, [key]: value }))
    setInvalid((list) => list.filter((k) => k !== key))
  }

  const errorFor = (key: string) =>
    invalid.includes(key) ? ERROR_MESSAGE[key] : undefined

  const onSubmit: FormEventHandler<HTMLFormElement> = (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault()
    const missing = (
      Object.keys(EMPTY) as Exclude<keyof ReportFields, 'incidentDateApprox'>[]
    ).filter((k) => !String(fields[k]).trim())
    if (missing.length > 0) {
      setInvalid(missing)
      return
    }
    api.saveDraftFields(fields)
    navigate('/bukti')
  }

  if (!loaded) {
    return (
      <Page
        eyebrow="BUAT LAPORAN · LANGKAH 1 DARI 3"
        title="Menyiapkan formulir laporan."
        lead="Memuat draf yang tersimpan."
      >
        <Skeleton lines={6} />
      </Page>
    )
  }

  return (
    <Page
      reportStep={1}
      eyebrow="BUAT LAPORAN · LANGKAH 1 DARI 3"
      title="Ceritakan kejadiannya."
      lead="Mode anonim aktif. Gunakan fakta yang Anda ketahui dan hindari menuliskan identitas diri."
    >
      <form onSubmit={onSubmit} noValidate>
        <Field
          id="kategori"
          label="Kategori"
          required
          error={errorFor('category')}
        >
          <select
            id="kategori"
            className="input"
            value={fields.category}
            onChange={(e) => set('category', e.target.value)}
            aria-invalid={invalid.includes('category') ? 'true' : undefined}
            aria-describedby={
              invalid.includes('category') ? 'kategori-error' : undefined
            }
          >
            <option value="" disabled>
              Pilih kategori…
            </option>
            {kategori.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="judul"
          label="Judul laporan"
          required
          error={errorFor('title')}
        >
          <input
            id="judul"
            className="input"
            value={fields.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Ringkas dugaan yang terjadi"
            aria-invalid={invalid.includes('title') ? 'true' : undefined}
            aria-describedby={
              invalid.includes('title') ? 'judul-error' : undefined
            }
          />
        </Field>

        <Field
          id="kronologi"
          label="Kronologi"
          required
          error={errorFor('chronology')}
        >
          <textarea
            id="kronologi"
            className="input"
            value={fields.chronology}
            onChange={(e) => set('chronology', e.target.value)}
            placeholder="Tuliskan urutan kejadian sejelas mungkin. Hindari nama, kontak, atau identitas pribadi."
            aria-invalid={invalid.includes('chronology') ? 'true' : undefined}
            aria-describedby={
              invalid.includes('chronology') ? 'kronologi-error' : undefined
            }
          />
        </Field>

        <Field
          id="tanggal"
          label="Tanggal kejadian"
          required
          hint="Gunakan tanggal perkiraan bila tanggal pasti tidak diketahui."
          error={errorFor('incidentDate')}
        >
          <input
            id="tanggal"
            type="date"
            className="input"
            value={fields.incidentDate}
            onChange={(e) => set('incidentDate', e.target.value)}
            aria-invalid={invalid.includes('incidentDate') ? 'true' : undefined}
            aria-describedby={
              invalid.includes('incidentDate') ? 'tanggal-error' : undefined
            }
          />
          <div className="check" style={{ marginTop: 8 }}>
            <input
              id="approx"
              type="checkbox"
              checked={fields.incidentDateApprox}
              onChange={(e) => set('incidentDateApprox', e.target.checked)}
            />
            <span>
              <label htmlFor="approx" className="check-label">
                Tanggal perkiraan.
              </label>{' '}
              Tandai bila hanya ingat kisarannya.
            </span>
          </div>
        </Field>

        <Field
          id="lokasi"
          label="Lokasi kejadian"
          required
          error={errorFor('location')}
        >
          <input
            id="lokasi"
            className="input"
            value={fields.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="Contoh: Loket layanan A — wilayah simulasi"
            aria-invalid={invalid.includes('location') ? 'true' : undefined}
            aria-describedby={
              invalid.includes('location') ? 'lokasi-error' : undefined
            }
          />
        </Field>

        <Field
          id="pihak"
          label="Pihak terkait"
          required
          error={errorFor('involvedParty')}
        >
          <input
            id="pihak"
            className="input"
            value={fields.involvedParty}
            onChange={(e) => set('involvedParty', e.target.value)}
            placeholder="Contoh: Petugas loket (nama tidak diketahui)"
            aria-invalid={
              invalid.includes('involvedParty') ? 'true' : undefined
            }
            aria-describedby={
              invalid.includes('involvedParty') ? 'pihak-error' : undefined
            }
          />
        </Field>

        {invalid.length > 0 ? (
          <Notice variant="error">
            <p>
              Beberapa isian wajib belum lengkap. Periksa bagian bertanda merah.
            </p>
          </Notice>
        ) : null}

        <ActionsRow>
          <button type="submit">Lanjut ke bukti</button>
          <Link to="/">Kembali</Link>
        </ActionsRow>
      </form>

      <Notice>
        <p>
          Semua isian di atas adalah contoh untuk simulasi, bukan aduan nyata.
        </p>
      </Notice>
    </Page>
  )
}
