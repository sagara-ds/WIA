import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useEffect } from 'react'
import { adminApi } from '../lib/api'

export function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const home = pathname === '/'
  const staff = pathname.startsWith('/petugas/')
  const session = adminApi.getSession()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div
      className={`site-shell${home ? ' is-home' : ''}${staff ? ' is-staff' : ''}`}
    >
      <a href="#main" className="skip-link">
        Langsung ke konten
      </a>
      <header className="app">
        <Link to="/" className="brand" aria-label="SIAP — Beranda">
          <span className="wordmark">
            SIAP<span>.</span>
          </span>
          <span className="subbrand">
            Sistem Informasi
            <br />
            Aduan Publik
          </span>
        </Link>
        <nav className="app-nav" aria-label="Navigasi utama">
          <NavLink to="/" end>
            Beranda
          </NavLink>
          <NavLink to="/panduan">Cara melapor</NavLink>
          <NavLink to="/transparansi">Transparansi</NavLink>
          {/* Fix E: label & tujuan sesuai sesi — sesi aktif tidak semuaing "masuk" */}
          <NavLink
            to={staff ? '/cek' : session ? '/petugas/antrean' : '/petugas'}
            className="staff-link"
          >
            {staff ? 'Layanan publik' : session ? 'Kembali ke panel petugas' : 'Masuk petugas'}
          </NavLink>
        </nav>
        <span className="prototype-label">
          Prototipe lomba <span>· Data contoh</span>
        </span>
      </header>
      <div className="workspace">
        {staff && (
          <aside className="staff-rail" aria-label="Ruang kerja petugas">
            <div className="rail-title">
              Ruang kerja
              <br />
              <strong>Petugas SIAP</strong>
            </div>
            <nav aria-label="Navigasi petugas">
              <NavLink to="/petugas/antrean">Antrean laporan</NavLink>
              {session?.role === 'super_admin' && (
                <>
                  <NavLink to="/petugas/audit">Jejak audit</NavLink>
                  <NavLink to="/petugas/master">Master data</NavLink>
                </>
              )}
            </nav>
            <div className="rail-note">
              Setiap keputusan
              <br />
              menjadi jejak penanganan.
            </div>
            <div className="staff-account">
              <strong>
                {session?.role === 'super_admin'
                  ? 'Super admin'
                  : 'Verifikator'}
              </strong>
              <span>Sesi petugas aktif</span>
              <button
                type="button"
                onClick={() => {
                  adminApi.logout()
                  navigate('/petugas')
                }}
              >
                Keluar dari panel
              </button>
            </div>
          </aside>
        )}
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <footer className="app">
        <div className="footer-app-info">
          <strong>Ruang untuk suara warga.</strong>
          <span> Jalur untuk tindak lanjut.</span>
          <p>
            Prototipe lomba. Tidak menerima laporan nyata dan tidak mewakili
            instansi tertentu.
          </p>
        </div>
        <nav className="footer-links" aria-label="Tautan informasi">
          <Link to="/panduan">Panduan &amp; privasi</Link>
          <Link to="/cek">Akses tiket</Link>
        </nav>
      </footer>
    </div>
  )
}
