import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Page, Card, ActionsRow, Notice } from '../components/Page'
import type { IssuedTicket } from '../lib/types'
import { api } from '../lib/api'

export function Terkirim() {
  const navigate = useNavigate()
  const [issued] = useState<IssuedTicket | null>(() => api.consumeLastIssued())
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  useEffect(() => {
    if (!issued) navigate('/cek', { replace: true })
  }, [issued, navigate])

  if (!issued) return null

  const copyText = `Kode tiket: ${issued.number}\nPIN: ${issued.pin}`

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
      setCopyError(false)
    } catch {
      setCopyError(true)
      setCopied(false)
    }
  }

  return (
    <Page
      eyebrow="LAPORAN BERHASIL DIKIRIM"
      title="Simpan akses tiket Anda."
      lead="Tiket dan PIN hanya ditampilkan bersama pada langkah ini. Tanpa keduanya, Anda tidak dapat membuka tiket."
    >
      <div className="cards">
        <Card title="Kode tiket">
          <p>
            <strong className="mono">{issued.number}</strong>
          </p>
        </Card>
        <Card title="PIN">
          <p>
            <strong className="mono">{issued.pin}</strong>
          </p>
        </Card>
        <Card title="Simpan di tempat pribadi">
          <p>
            {
              'PIN tidak ditampilkan lagi setelah langkah ini. Jangan membagikan akses tiket kepada orang lain.'
            }
          </p>
        </Card>
      </div>

      {copied ? (
        <Notice>
          <p>
            <strong>Contoh akses tiket tersimpan.</strong> Tiket dan PIN telah disalin ke clipboard.
          </p>
        </Notice>
      ) : null}
      {copyError ? (
        <Notice variant="error">
          <p>Pengelola clipboard memblokir salinan. Salin manual dari kartu di atas.</p>
        </Notice>
      ) : null}

      <ActionsRow>
        <button type="button" onClick={() => void onCopy()} disabled={copied}>
          {copied ? 'Tersalin ✓' : 'Salin tiket & PIN'}
        </button>
        <Link to="/cek">Buka cek status</Link>
      </ActionsRow>
    </Page>
  )
}
