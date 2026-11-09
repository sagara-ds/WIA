import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import { Page, Card, ActionsRow, Notice } from '../components/Page'
import { FileChip } from '../components/FileChip'
import { Skeleton } from '../components/Feedback'
import { ACCEPT_ATTR } from '../lib/upload'
import { api } from '../lib/api'
import type { UploadIssue } from '../lib/api'

function issueText(issues: UploadIssue[]): string {
  return issues
    .map((i) => {
      if (i.overLimit) return `${i.name} tidak ditambahkan — jumlah berkas melewati batas maksimal 5.`
      if (i.tooBig && i.wrongType)
        return `Ukuran ${i.name} terlalu besar dan jenis berkas belum didukung.`
      if (i.tooBig) return `Ukuran ${i.name} terlalu besar.`
      return `Jenis berkas ${i.name} belum didukung.`
    })
    .join(' ')
}

export function Bukti() {
  const navigate = useNavigate()
  const [evidence, setEvidence] = useState<Awaited<ReturnType<typeof api.loadDraft>>['evidence']>([])
  const [issues, setIssues] = useState<UploadIssue[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void api.loadDraft().then((d) => {
      if (!d.fields) {
        navigate('/lapor', { replace: true })
        return
      }
      setEvidence(d.evidence)
      setReady(true)
    })
  }, [navigate])

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (picked.length === 0) return
    const result = await api.addDraftFiles(picked)
    const draft = await api.loadDraft()
    setEvidence(draft.evidence)
    setIssues(result.issues)
  }

  if (!ready) {
    return (
      <Page
        eyebrow="BUAT LAPORAN · LANGKAH 2 DARI 3"
        title="Menyiapkan unggahan bukti."
        lead="Memuat draf laporan."
      >
        <Skeleton lines={4} />
      </Page>
    )
  }

  return (
    <Page
      eyebrow="BUAT LAPORAN · LANGKAH 2 DARI 3"
      title="Tambahkan bukti pendukung."
      lead="Jangan sertakan wajah, alamat pribadi, atau informasi lain yang dapat membuka identitas Anda."
    >
      <Card title="Area unggah bukti">
        <p>JPG, PNG, atau PDF · maksimal 5 berkas, 10 MB per berkas.</p>
      </Card>
      <div style={{ marginTop: 14 }}>
        <label className="file-input-btn" htmlFor="berkas">
          Pilih berkas untuk ditambahkan
        </label>
        <input
          id="berkas"
          type="file"
          className="file-hidden"
          multiple
          accept={ACCEPT_ATTR}
          onChange={(e) => void onPick(e)}
        />
      </div>

      <div className="cards" style={{ marginTop: 14 }}>
        <Card title={`Berkas terpilih (${evidence.length})`}>
          {evidence.length === 0 ? (
            <p>Belum ada berkas. Anda dapat melanjutkan tanpa bukti.</p>
          ) : (
            <div className="cards" style={{ gap: 8 }}>
              {evidence.map((ev) => (
                <FileChip
                  key={ev.id}
                  item={ev}
                  onRemove={() => {
                    void api.removeDraftEvidence(ev.id).then(() =>
                      void api.loadDraft().then((d) => setEvidence(d.evidence)),
                    )
                  }}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {issues.length > 0 ? (
        <Notice variant="error">
          <p>
            <strong>Berkas belum bisa ditambahkan.</strong> {issueText(issues)} Gunakan JPG, PNG,
            atau PDF dengan ukuran maksimal 10 MB per berkas. Data formulir tetap tersimpan selama
            sesi simulasi.
          </p>
        </Notice>
      ) : (
        <Notice>
          <p>
            Pembersihan metadata diterapkan saat pengembangan: metadata tidak menghapus nama, wajah,
            atau tulisan yang terlihat di dalam bukti.
          </p>
        </Notice>
      )}

      <ActionsRow>
        <button type="button" onClick={() => navigate('/tinjau')}>
          Lanjut tinjau laporan
        </button>
        <button type="button" onClick={() => navigate('/lapor')}>
          Kembali
        </button>
      </ActionsRow>
    </Page>
  )
}
