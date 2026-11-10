import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Page, ActionsRow, StatGrid, Notice } from '../components/Page'
import { RequireAdmin } from '../components/RequireAdmin'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, Skeleton } from '../components/Feedback'
import { adminApi } from '../lib/api'
import type { StoredTicket, Status } from '../lib/types'
import { formatTanggal } from '../lib/format'
import { ArrowRight } from '../components/Icons'

export function AdminQueue() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<StoredTicket[]>([])
  const [statusFilter, setStatusFilter] = useState<Status | ''>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [kategori, setKategori] = useState<string[]>([])

  useEffect(() => {
    void adminApi.reference().then((d) => setKategori(d?.categories ?? []))
  }, [])

  useEffect(() => {
    if (search === debouncedSearch) return
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(false)
      setDebouncedSearch(search)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search, debouncedSearch])

  useEffect(() => {
    let active = true
    void adminApi
      .queue({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        search: debouncedSearch || undefined,
      })
      .then((list) => {
        if (!active) return
        setTickets(list)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) {
          setLoading(false)
          setInitialized(true)
        }
      })
    return () => {
      active = false
    }
  }, [statusFilter, categoryFilter, debouncedSearch, retry])

  if (loading && !initialized) {
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

  const menunggu = tickets.filter(
    (t) => t.status === 'Diterima' || t.status === 'Perlu Dilengkapi',
  ).length
  const sedang = tickets.filter(
    (t) =>
      t.status === 'Diverifikasi' ||
      t.status === 'Diteruskan' ||
      t.status === 'Ditindaklanjuti',
  ).length

  const stats = [
    { value: String(menunggu), label: 'Menunggu pemeriksaan' },
    {
      value: String(
        tickets.filter((t) => t.status === 'Perlu Dilengkapi').length,
      ),
      label: 'Perlu dilengkapi',
    },
    { value: String(sedang), label: 'Sedang ditangani' },
  ]

  return (
    <RequireAdmin>
      <Page
        eyebrow="PANEL VERIFIKATOR · DATA CONTOH"
        title="Antrean laporan."
        lead="Antrean laporan aktif. Periksa kelengkapan, catat keputusan, dan teruskan kepada unit yang sesuai."
      >
        <StatGrid items={stats} />

        <div className="queue-toolbar">
          <div className="field">
            <label htmlFor="filter-search">Cari laporan</label>
            <input
              id="filter-search"
              type="search"
              className="input"
              placeholder="Nomor tiket atau judul…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="filter-status">Status</label>
            <select
              id="filter-status"
              className="input"
              value={statusFilter}
              onChange={(e) => {
                setLoading(true)
                setError(false)
                setStatusFilter(e.target.value as Status | '')
              }}
            >
              <option value="">Semua status aktif</option>
              <option value="Diterima">Diterima</option>
              <option value="Perlu Dilengkapi">Perlu Dilengkapi</option>
              <option value="Diverifikasi">Diverifikasi</option>
              <option value="Diteruskan">Diteruskan</option>
              <option value="Ditindaklanjuti">Ditindaklanjuti</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter-cat">Kategori</label>
            <select
              id="filter-cat"
              className="input"
              value={categoryFilter}
              onChange={(e) => {
                setLoading(true)
                setError(false)
                setCategoryFilter(e.target.value)
              }}
            >
              <option value="">Semua kategori</option>
              {kategori.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <Notice variant="error">
            <p role="alert">
              Antrean belum dapat dimuat. Koneksi terganggu atau akses sementara
              dibatasi. Coba lagi setelah beberapa saat.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                setError(false)
                setRetry((value) => value + 1)
              }}
            >
              Coba muat ulang
            </button>
          </Notice>
        )}
        <div className="queue-table-wrap" aria-busy={loading}>
          {loading ? (
            <Skeleton lines={5} />
          ) : error ? null : tickets.length === 0 ? (
            <EmptyState title="Tidak ada laporan">
              Tidak ada laporan yang cocok dengan filter saat ini.
            </EmptyState>
          ) : (
            <table className="queue-table">
              <caption className="sr-only">
                Daftar laporan sesuai pencarian dan filter
              </caption>
              <thead>
                <tr>
                  <th scope="col">Laporan</th>
                  <th scope="col">Kejadian</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Tindakan</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.number}>
                    <td>
                      <strong>{t.title}</strong>
                      <span className="ticket-number">
                        {t.number} · {t.category}
                      </span>
                    </td>
                    <td>
                      {formatTanggal(t.incidentDate, t.incidentDateApprox)}
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td>
                      <button
                        className="queue-open"
                        type="button"
                        aria-label={`Periksa laporan ${t.number}`}
                        onClick={() => {
                          adminApi.setAdminTicketNumber(t.number)
                          navigate('/petugas/detail')
                        }}
                      >
                        Periksa <ArrowRight />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="queue-result-count" role="status">
          {loading
            ? 'Memperbarui antrean…'
            : error
              ? 'Data belum tersedia.'
              : `${tickets.length} laporan aktif sesuai filter · Data contoh`}
        </p>

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
