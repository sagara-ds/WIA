import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { Page, Card, ActionsRow } from '../components/Page'
import { api } from '../lib/api'
import type { StoredTicket } from '../lib/types'
import { formatBytes } from '../lib/format'

export function BalasTerkirim() {
  const [ticket, setTicket] = useState<StoredTicket | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    void api.getActiveTicket().then((t) => {
      const hasReply = t ? t.messages.some((m) => m.author === 'pelapor') : false
      if (!hasReply) {
        setMissing(true)
        return
      }
      setTicket(t)
    })
  }, [])

  if (missing) return <Navigate to="/tiket" replace />
  if (!ticket) return null

  const lastReply = [...ticket.messages].reverse().find((m) => m.author === 'pelapor')

  return (
    <Page
      eyebrow="BALASAN TERKIRIM"
      title="Informasi tambahan sudah diterima."
      lead="Status tetap Perlu Dilengkapi sampai admin selesai memeriksa balasan. Pengiriman pesan tidak otomatis memverifikasi laporan."
    >
      <div className="cards">
        <Card title={`Pelapor · ${lastReply ? lastReply.at : ''}`}>
          <p>
            {lastReply ? lastReply.body : ''}
            {lastReply?.attachment
              ? `\nLampiran: ${lastReply.attachment.name} (${formatBytes(lastReply.attachment.size)})`
              : ''}
          </p>
        </Card>
        <Card title="Langkah berikutnya">
          <p>
            {
              'Admin memeriksa kelengkapan informasi. Belum ada tenggat resmi pada studi kasus ini.'
            }
          </p>
        </Card>
      </div>
      <ActionsRow>
        <Link to="/">Kembali ke beranda</Link>
        <Link to="/transparansi">Lihat transparansi</Link>
      </ActionsRow>
    </Page>
  )
}
