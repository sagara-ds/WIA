import { useState } from 'react'
import type { FormEventHandler, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Page, ActionsRow } from '../components/Page'
import { Field } from '../components/Field'
import { api } from '../lib/api'

export function Cek() {
  const navigate = useNavigate()
  const [number, setNumber] = useState('')
  const [pin, setPin] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  const onSubmit: FormEventHandler<HTMLFormElement> = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!number.trim() || !pin.trim() || busy) {
      setFailed(true)
      return
    }
    setBusy(true)
    if (recoveryKey.trim()) sessionStorage.setItem('siap.recovery-key.v1', recoveryKey.trim())
    void api
      .checkTicket(number, pin)
      .then((found) => {
        if (found) {
          navigate('/tiket')
          return
        }
        setFailed(true)
      })
      .finally(() => setBusy(false))
  }

  if (failed) {
    return (
      <Page
        eyebrow="AKSES BELUM BERHASIL"
        title="Periksa tiket dan PIN Anda."
        lead="Kombinasi kode tiket dan PIN tidak cocok atau akses sedang dibatasi. Coba kembali setelah beberapa saat."
      >
        <ActionsRow>
          <button type="button" onClick={() => navigate('/cek')}>
            Coba lagi
          </button>
          <Link to="/panduan">Buka panduan</Link>
        </ActionsRow>
      </Page>
    )
  }

  return (
    <Page
      eyebrow="AKSES TIKET PRIBADI"
      title="Sudah sampai mana laporan Anda?"
      lead="Masukkan kode tiket dan PIN yang Anda simpan saat mengirim laporan. Tidak perlu akun warga."
    >
      <form onSubmit={onSubmit} noValidate>
        <Field id="tiket" label="Kode tiket" required>
          <input
            id="tiket"
            className="input"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="SIAP-XXXXX"
            autoComplete="off"
            autoFocus
          />
        </Field>
        <Field id="pin" label="PIN" required>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            className="input"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="123456"
            autoComplete="off"
          />
        </Field>
        <Field id="kunci" label="Kunci pemulihan" hint="Wajib untuk laporan terenkripsi. Kosongkan untuk tiket contoh lama.">
          <input
            id="kunci"
            className="input"
            value={recoveryKey}
            onChange={(e) => setRecoveryKey(e.target.value)}
            placeholder="Kunci pemulihan sekali tampil"
            autoComplete="off"
          />
        </Field>
        <ActionsRow>
          <button type="submit" disabled={busy}>
            {busy ? 'Memeriksa…' : 'Buka tiket'}
          </button>
        </ActionsRow>
      </form>

      <div className="notice">
        <p>Kehilangan tiket atau PIN? Pada mode anonim, pemulihan melalui email atau nomor telepon tidak tersedia.</p>
        <p>Buat laporan sendiri untuk mendapatkan tiket baru.</p>
      </div>
    </Page>
  )
}
