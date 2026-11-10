import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Page, Card, ActionsRow, Notice } from '../components/Page'
import { RequireAdmin } from '../components/RequireAdmin'
import { EmptyState, Skeleton } from '../components/Feedback'
import { adminApi } from '../lib/api'
import type { AuditEntry } from '../lib/types'

export function AdminAudit() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    void adminApi
      .audit()
      .then((list) => {
        if (active) setEntries(list)
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Audit log belum dapat dimuat.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [retry])

  const onReload = () => {
    setLoading(true)
    setError(null)
    setRetry((value) => value + 1)
  }

  return (
    <RequireAdmin roles={['super_admin']}>
      <Page
        eyebrow="SUPER ADMIN · AUDIT LOG"
        title="Jejak akses dan keputusan."
        lead="Audit log ditampilkan sebagai catatan hanya-baca. Keutuhan log harus ditegakkan oleh sistem backend."
      >
        <div className="cards">
          {loading ? (
            <Skeleton lines={5} label="Memuat audit log…" />
          ) : error ? (
            <Notice variant="error">
              <p role="alert">{error}</p>
              <button type="button" onClick={onReload}>
                Coba muat ulang
              </button>
            </Notice>
          ) : entries.length === 0 ? (
            <EmptyState title="Audit log kosong">
              Belum ada aksi admin yang tercatat pada sesi ini.
            </EmptyState>
          ) : (
            entries.map((e) => (
              <Card key={e.id} title={`${e.at} · ${e.actor}`}>
                <p>
                  {e.action} · {e.detail}
                </p>
              </Card>
            ))
          )}
        </div>
        <ActionsRow>
          <Link to="/petugas/master">Kelola master data</Link>
          <Link to="/petugas/antrean">Lihat antrean (demo)</Link>
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
