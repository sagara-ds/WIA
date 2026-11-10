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

  const creds = api.demoCredentials()

  const onSubmit: FormEventHandler<HTMLFormElement> = (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault()
    if (!number.trim() || !pin.trim() || busy) {
      setFailed(true)
      return
    }
    setFailed(false)
    setBusy(true)
    api.setRecoveryKey(recoveryKey)
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

  return (
    <Page
      eyebrow="AKSES TIKET PRIBADI"
      title="Sudah sampai mana laporan Anda?"
      lead="Masukkan kode tiket dan PIN yang Anda simpan saat mengirim laporan. Tidak perlu akun warga."
    >
      <form onSubmit={onSubmit} noValidate>
        {failed && (
          <div className="notice error" role="alert">
            <p>
              Kode tiket atau PIN belum cocok, atau akses sedang dibatasi.
              Periksa isian dan coba kembali setelah beberapa saat.
            </p>
            <Link to="/panduan">Baca panduan akses</Link>
          </div>
        )}
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
        <Field
          id="kunci"
          label="Kunci pemulihan"
          hint="Wajib untuk laporan terenkripsi. Kosongkan untuk tiket contoh lama."
        >
          <input
            id="kunci"
            className="input"
            value={recoveryKey}
            onChange={(e) => setRecoveryKey(e.target.value)}
            placeholder="Kunci pemulihan dari langkah kirim"
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
        <p>
          Kehilangan tiket atau PIN? Pada mode anonim, pemulihan melalui email
          atau nomor telepon tidak tersedia.
        </p>
        <p>
          Kredensial data contoh:{' '}
          {creds.map((c) => (
            <span key={c.number}>
              <code>
                {c.number} / {c.pin} ({c.status})
              </code>
              {' · '}
            </span>
          ))}
          buat laporan sendiri untuk mendapatkan tiket baru.
        </p>
      </div>
    </Page>
  )
}
