import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Page, Card, ActionsRow, Notice } from '../components/Page'
import { Field } from '../components/Field'
import { RequireAdmin } from '../components/RequireAdmin'
import { Skeleton } from '../components/Feedback'
import { adminApi } from '../lib/api'

interface MasterItem {
  id: string
  name: string
  active: boolean
}

interface MasterData {
  categories: MasterItem[]
  units: MasterItem[]
  admins: { email: string; name: string; role: string }[]
}

function MasterRow({
  item,
  busy,
  onSave,
  onToggle,
}: {
  item: MasterItem
  busy: boolean
  onSave: (id: string, name: string) => void
  onToggle: (id: string, active: boolean) => void
}) {
  const [name, setName] = useState(item.name)
  const changed = name.trim() !== item.name
  return (
    <div className="field">
      <input
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label={`Nama ${item.name}`}
        disabled={busy}
      />
      <p className="hint">{item.active ? 'Status: aktif' : 'Status: nonaktif'}</p>
      <ActionsRow>
        <button
          type="button"
          disabled={busy || !name.trim() || !changed}
          onClick={() => onSave(item.id, name.trim())}
        >
          Simpan nama
        </button>
        <button type="button" disabled={busy} onClick={() => onToggle(item.id, !item.active)}>
          {item.active ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      </ActionsRow>
    </div>
  )
}

export function AdminMaster() {
  const navigate = useNavigate()
  const [data, setData] = useState<MasterData | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [newUnit, setNewUnit] = useState('')

  useEffect(() => {
    void adminApi.masterData().then((d) => {
      if (d) setData(d)
    })
  }, [])

  const run = (fn: () => Promise<string>) => {
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    fn()
      .then((msg) => {
        setNotice(msg)
        return adminApi.masterData()
      })
      .then((d) => {
        if (d) setData(d)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Gagal menyimpan perubahan.'))
      .finally(() => setBusy(false))
  }

  const onAdd = (kind: 'categories' | 'units') => {
    const value = (kind === 'categories' ? newCategory : newUnit).trim()
    if (!value) return
    run(async () => {
      await adminApi.addMaster(kind, value)
      if (kind === 'categories') setNewCategory('')
      else setNewUnit('')
      return `${value} ditambahkan.`
    })
  }

  const onSave = (kind: 'categories' | 'units', id: string, name: string) => {
    run(async () => {
      await adminApi.patchMaster(kind, id, { name })
      return `Nama diubah menjadi ${name}.`
    })
  }

  const onToggle = (kind: 'categories' | 'units', id: string, active: boolean) => {
    run(async () => {
      await adminApi.patchMaster(kind, id, { active })
      return active ? 'Item diaktifkan kembali.' : 'Item dinonaktifkan.'
    })
  }

  const addForm = (kind: 'categories' | 'units') => (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onAdd(kind)
  }

  return (
    <RequireAdmin roles={['super_admin']}>
      <Page
        eyebrow="SUPER ADMIN · KONFIGURASI"
        title="Kelola referensi layanan."
        lead="Tambah, ubah nama, dan aktifkan/nonaktifkan kategori serta unit. Perubahan langsung memengaruhi form lapor dan pilihan penerusan."
      >
        {error ? (
          <Notice variant="error">
            <p role="alert">{error}</p>
          </Notice>
        ) : null}
        {notice ? (
          <Notice>
            <p role="status">{notice}</p>
          </Notice>
        ) : null}
        {data ? (
          <div className="cards">
            <Card title="Kategori">
              <form onSubmit={addForm('categories')} noValidate>
                <Field id="kategori-baru" label="Kategori baru" required>
                  <input
                    id="kategori-baru"
                    className="input"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Nama kategori…"
                    disabled={busy}
                  />
                </Field>
                <ActionsRow>
                  <button type="submit" disabled={busy || !newCategory.trim()}>
                    Tambah kategori
                  </button>
                </ActionsRow>
              </form>
              {data.categories.map((c) => (
                <MasterRow
                  key={c.id}
                  item={c}
                  busy={busy}
                  onSave={(id, name) => onSave('categories', id, name)}
                  onToggle={(id, active) => onToggle('categories', id, active)}
                />
              ))}
            </Card>
            <Card title="Unit tujuan">
              <form onSubmit={addForm('units')} noValidate>
                <Field id="unit-baru" label="Unit baru" required>
                  <input
                    id="unit-baru"
                    className="input"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="Nama unit…"
                    disabled={busy}
                  />
                </Field>
                <ActionsRow>
                  <button type="submit" disabled={busy || !newUnit.trim()}>
                    Tambah unit
                  </button>
                </ActionsRow>
              </form>
              {data.units.map((u) => (
                <MasterRow
                  key={u.id}
                  item={u}
                  busy={busy}
                  onSave={(id, name) => onSave('units', id, name)}
                  onToggle={(id, active) => onToggle('units', id, active)}
                />
              ))}
            </Card>
            <Card title="Akun petugas">
              <p>{data.admins.map((a) => `${a.name} · ${a.role} · Aktif`).join('\n')}</p>
            </Card>
          </div>
        ) : (
          <Skeleton lines={6} />
        )}
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
