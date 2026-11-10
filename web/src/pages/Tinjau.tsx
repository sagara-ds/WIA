import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Page, Card, ActionsRow, Notice } from '../components/Page'
import { CheckField } from '../components/Field'
import { Skeleton } from '../components/Feedback'
import { api } from '../lib/api'
import type { EvidenceMeta, ReportFields } from '../lib/types'
import { formatTanggal } from '../lib/format'

export function Tinjau() {
  const navigate = useNavigate()
  const [fields, setFields] = useState<ReportFields | null>(null)
  const [evidence, setEvidence] = useState<EvidenceMeta[]>([])
  const [missingFiles, setMissingFiles] = useState<string[]>([])
  const [agree, setAgree] = useState(false)
  const [captcha, setCaptcha] = useState(false)
  const [fatal, setFatal] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    void api.loadDraft().then((d) => {
      if (!d.fields) {
        navigate('/lapor', { replace: true })
        return
      }
      setFields(d.fields)
      setEvidence(d.evidence)
      // Fix J: File yang dipilih tidak tidak selamat dari reload halaman —
      // deteksi dulu agar pengguna tahu datanya, bukan menelan 400 generik.
      setMissingFiles(api.missingDraftFiles(d.evidence))
    })
  }, [navigate])

  if (fatal) {
    return (
      <Page
        eyebrow="LAPORAN · KIRIM TIDAK BERHASIL"
        title="Laporan belum terkirim."
        lead="Terjadi gangguan pada simulasi. Coba ulangi pengiriman."
      >
        <ActionsRow>
          <button type="button" onClick={() => navigate('/lapor')}>
            Ubah laporan
          </button>
        </ActionsRow>
      </Page>
    )
  }

  if (!fields) {
    return (
      <Page
        eyebrow="BUAT LAPORAN · LANGKAH 3 DARI 3"
        title="Menyiapkan tinjauan laporan."
        lead="Memuat draf laporan."
      >
        <Skeleton lines={5} />
      </Page>
    )
  }

  const submit = async () => {
    if (!agree || !captcha || sending) return
    if (missingFiles.length > 0) return
    setSending(true)
    try {
      const issued = await api.createReport(fields, evidence)
      if (!issued) {
        setFatal(true)
        return
      }
      navigate('/terkirim')
    } finally {
      setSending(false)
    }
  }

  return (
    <Page
      reportStep={3}
      eyebrow="BUAT LAPORAN · LANGKAH 3 DARI 3"
      title="Periksa sebelum mengirim."
      lead="Pastikan kronologi dan bukti tidak memuat identitas Anda."
    >
      <div className="cards">
        <Card title={fields.category}>
          <p>
            {`${fields.title} · ${formatTanggal(fields.incidentDate, fields.incidentDateApprox)} · ${fields.location}`}
          </p>
        </Card>
        <Card title="Kronologi">
          <p>{fields.chronology}</p>
        </Card>
        <Card title="Pihak terkait">
          <p>{fields.involvedParty}</p>
        </Card>
        <Card title="Bukti">
          <p>
            {evidence.length === 0
              ? 'Tidak ada berkas.'
              : evidence.map((e, i) => `${i + 1}. ${e.name}`).join('\n')}
          </p>
        </Card>
      </div>

      {missingFiles.length > 0 ? (
        <Notice variant="error">
          <p>
            <strong>Bukti berikut tidak bisa ikut terkirim</strong> karena halaman pernah dimuat
            ulang: {missingFiles.join(', ')}. Tambahkan ulang berkasnya di langkah bukti, atau hapus
            lalu kirimkan tanpa bukti tersebut.
          </p>
        </Notice>
      ) : null}

      <CheckField
        id="setuju"
        checked={agree}
        onChange={setAgree}
        label="Persetujuan penggunaan"
        text="Saya memahami kebijakan privasi dan bahwa ini adalah simulasi."
      />
      <CheckField
        id="captcha"
        checked={captcha}
        onChange={setCaptcha}
        label="Verifikasi anti-spam"
        text="Contoh CAPTCHA — bukan pemeriksaan bot nyata. Pada implementasi akhir menggunakan Cloudflare Turnstile."
      />

      <ActionsRow>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!agree || !captcha || sending || missingFiles.length > 0}
        >
          {sending ? 'Mengirim…' : 'Kirim laporan'}
        </button>
        <button type="button" onClick={() => navigate('/bukti')}>
          Kembali ke bukti
        </button>
        <Link to="/panduan">Baca kebijakan privasi</Link>
      </ActionsRow>

      <Notice>
        <p>Dengan mengirim, kode tiket dan PIN akan dibuat dan hanya ditampilkan sekali.</p>
      </Notice>
    </Page>
  )
}
