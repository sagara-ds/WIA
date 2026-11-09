import { useState } from 'react'
import type { FormEvent, FormEventHandler } from 'react'
import { useNavigate } from 'react-router'
import { Page, ActionsRow, Notice } from '../components/Page'
import { Field } from '../components/Field'
import { adminApi } from '../lib/api'

export function PetugasLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  const creds = adminApi.demoAdminCredentials()

  const onSubmit: FormEventHandler<HTMLFormElement> = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email.trim() || !password.trim() || busy) return
    setBusy(true)
    void adminApi
      .login(email.trim(), password.trim())
      .then((session) => {
        if (session) {
          navigate(session.role === 'super_admin' ? '/petugas/audit' : '/petugas/antrean')
        } else {
          setFailed(true)
        }
      })
      .finally(() => setBusy(false))
  }

  return (
    <Page
      eyebrow="AKSES PETUGAS"
      title="Masuk ke panel SIAP."
      lead="Khusus petugas berwenang. Login pada prototype adalah simulasi."
    >
      <form onSubmit={onSubmit} noValidate>
        <Field id="email-admin" label="Email admin" required>
          <input
            id="email-admin"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@contoh.invalid"
            autoComplete="username"
            autoFocus
          />
        </Field>
        <Field id="password-admin" label="Kata sandi" required>
          <input
            id="password-admin"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Kata sandi admin"
            autoComplete="current-password"
          />
        </Field>

        {failed ? (
          <Notice variant="error">
            <p>Email atau kata sandi tidak cocok. Periksa kredensial dan coba lagi.</p>
          </Notice>
        ) : null}

        <ActionsRow>
          <button type="submit" disabled={busy}>
            {busy ? 'Memverifikasi…' : 'Masuk'}
          </button>
          <a href="/">Kembali ke publik</a>
        </ActionsRow>
      </form>

      <Notice>
        <p>
          Kredensial demo:{' '}
          {creds.map((c) => (
            <span key={c.email}>
              <code>
                {c.email} / {c.password} ({c.role})
              </code>
              {' · '}
            </span>
          ))}
          data contoh untuk simulasi panel petugas.
        </p>
      </Notice>
    </Page>
  )
}
