import { Link, useNavigate } from 'react-router'
import { Page, Card, ActionsRow } from '../components/Page'
import { RequireAdmin } from '../components/RequireAdmin'
import { adminApi } from '../lib/api'

export function AdminMaster() {
  const navigate = useNavigate()
  const data = adminApi.masterData()

  return (
    <RequireAdmin roles={['super_admin']}>
      <Page
        eyebrow="SUPER ADMIN · KONFIGURASI"
        title="Kelola referensi layanan."
        lead="Ringkasan master data. Form tambah/edit dan konfirmasi nonaktifkan masih perlu dirinci sebelum implementasi."
      >
        <div className="cards">
          <Card title="Kategori">
            <p>{data.categories.join(' · ')}</p>
          </Card>
          <Card title="Unit tujuan">
            <p>{data.units.map((u) => `${u.name} · Aktif`).join('\n')}</p>
          </Card>
          <Card title="Akun petugas">
            <p>{data.admins.map((a) => `${a.name} · ${a.role} · Aktif`).join('\n')}</p>
          </Card>
        </div>
        <ActionsRow>
          <Link to="/petugas/audit">Kembali ke audit log</Link>
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
