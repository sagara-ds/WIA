import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useEffect } from 'react'

function clsForNav(pathname: string, to: string): true | undefined {
  const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
  return active ? true : undefined
}

export function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <>
      <div className="demo">PROTOTYPE LOMBA · Data contoh · Tidak menerima laporan sungguhan</div>
      <header className="app">
        <Link to="/" className="brand">
          <span className="mark" aria-hidden="true">
            S
          </span>
          <span className="brand-word-wrap">
            <span>SIAP</span>
            <span className="subbrand">SISTEM INFORMASI ADUAN PUBLIK</span>
          </span>
        </Link>
        <nav className="app-nav" aria-label="Navigasi utama">
          <NavLink to="/" aria-current={clsForNav(pathname, '/')}>
            Beranda
          </NavLink>
          <NavLink to="/transparansi" aria-current={clsForNav(pathname, '/transparansi')}>
            Transparansi
          </NavLink>
          <NavLink to="/panduan" aria-current={clsForNav(pathname, '/panduan')}>
            Panduan &amp; privasi
          </NavLink>
          <NavLink to="/cek" aria-current={clsForNav(pathname, '/cek')}>
            Cek status →
          </NavLink>
        </nav>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="app">
        <div className="footer-app-info">
          <strong>SIAP · Sistem Informasi Aduan Publik.</strong>
          <p>Prototipe lomba. Seluruh data adalah contoh dan tidak menerima laporan sungguhan.</p>
          <div className="footer-links">
            <Link to="/panduan">Panduan &amp; privasi</Link>
            <Link to="/transparansi">Transparansi</Link>
            <Link to="/cek">Cek status</Link>
          </div>
        </div>
        <Link to="/petugas" className="access-footer">
          Akses petugas →
        </Link>
      </footer>
    </>
  )
}
