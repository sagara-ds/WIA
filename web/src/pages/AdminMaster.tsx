import { Link, useNavigate } from 'react-router'
import { useEffect, useState } from 'react'
import { Page, Card, ActionsRow } from '../components/Page'
import { RequireAdmin } from '../components/RequireAdmin'
import { adminApi } from '../lib/api'

export function AdminMaster() {
  const navigate = useNavigate()
  const [data, setData] = useState<{ categories: string[]; units: { name: string }[]; admins: { name: string; role: string }[] }>({ categories: [], units: [], admins: [] })
  const [name, setName] = useState('')
  useEffect(() => { void adminApi.masterData().then((d: any) => setData({ categories: d.categories.map((c: any) => c.name), units: d.units, admins: d.admins })) }, [])

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
            <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) void adminApi.masterCreate('categories', name.trim()).then(() => { setName(''); void adminApi.masterData().then((d: any) => setData({ categories: d.categories.map((c: any) => c.name), units: d.units, admins: d.admins })) }) }}>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kategori baru" aria-label="Kategori baru" />
              <button type="submit">Tambah kategori</button>
            </form>
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
