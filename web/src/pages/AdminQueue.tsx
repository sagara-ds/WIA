import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Page, Card, ActionsRow, StatGrid } from '../components/Page'
import { RequireAdmin } from '../components/RequireAdmin'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, Skeleton } from '../components/Feedback'
import { adminApi } from '../lib/api'
import type { StoredTicket, Status } from '../lib/types'
import { formatTanggal } from '../lib/format'

export function AdminQueue() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<StoredTicket[]>([])
  const [statusFilter, setStatusFilter] = useState<Status | ''>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { void adminApi.masterData().then((d: any) => setCategories((d.categories || []).map((c: any) => c.name))) }, [])
  useEffect(() => {
    void adminApi
      .queue({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        search: search || undefined,
      })
      .then((list) => {
        setTickets(list)
        setLoading(false)
      })
  }, [statusFilter, categoryFilter, search])

  if (loading) {
    return (
      <RequireAdmin>
        <Page
          eyebrow="PANEL VERIFIKATOR · DATA CONTOH"
          title="Memuat antrean laporan."
          lead="Menyiapkan daftar tiket."
        >
          <Skeleton lines={6} />
        </Page>
      </RequireAdmin>
    )
  }

  const menunggu = tickets.filter((t) => t.status === 'Diterima' || t.status === 'Perlu Dilengkapi').length
  const sedang = tickets.filter(
    (t) =>
      t.status === 'Diverifikasi' || t.status === 'Diteruskan' || t.status === 'Ditindaklanjuti',
  ).length

  const stats = [
    { value: String(menunggu), label: 'Menunggu pemeriksaan' },
    { value: String(tickets.filter((t) => t.status === 'Perlu Dilengkapi').length), label: 'Perlu dilengkapi' },
    { value: String(sedang), label: 'Sedang ditangani' },
  ]

  return (
    <RequireAdmin>
      <Page
        eyebrow="PANEL VERIFIKATOR · DATA CONTOH"
        title="Antrean laporan."
        lead="Periksa kelengkapan, catat keputusan, dan teruskan kepada unit yang sesuai."
      >
        <StatGrid items={stats} />

        <div className="field">
          <label htmlFor="filter">Cari / filter laporan</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select
              id="filter-status"
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Status | '')}
              style={{ flex: '1 1 150px' }}
            >
              <option value="">Semua status</option>
              <option value="Diterima">Diterima</option>
              <option value="Perlu Dilengkapi">Perlu Dilengkapi</option>
              <option value="Diverifikasi">Diverifikasi</option>
              <option value="Diteruskan">Diteruskan</option>
              <option value="Ditindaklanjuti">Ditindaklanjuti</option>
            </select>
            <select
              id="filter-cat"
              className="input"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ flex: '1 1 150px' }}
            >
              <option value="">Semua kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="search"
              className="input"
              placeholder="Cari tiket atau judul…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: '1 1 200px' }}
            />
          </div>
        </div>

        <div className="cards">
          {tickets.length === 0 ? (
            <EmptyState title="Tidak ada laporan">
              Tidak ada laporan yang cocok dengan filter saat ini.
            </EmptyState>
          ) : (
            tickets.map((t) => (
              <Card
                key={t.number}
                title={
                  <span className="card-title-row">
                    {t.number}
                    <StatusBadge status={t.status} />
                  </span>
                }
              >
                <p>
                  {t.title} · {formatTanggal(t.incidentDate, t.incidentDateApprox)}
                </p>
                <ActionsRow>
                  <button
                    type="button"
                    onClick={() => {
                      adminApi.setAdminTicketNumber(t.number)
                      navigate('/petugas/detail')
                    }}
                  >
                    Periksa laporan
                  </button>
                </ActionsRow>
              </Card>
            ))
          )}
        </div>

        <ActionsRow>
          <button
            type="button"
            onClick={() => {
              adminApi.logout()
              navigate('/')
            }}
          >
            Keluar
          </button>
        </ActionsRow>
      </Page>
    </RequireAdmin>
  )
}
