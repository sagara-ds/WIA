import { Link, useLocation } from 'react-router'
import { ArrowRight } from './Icons'

export function SideRail() {
  const { pathname } = useLocation()
  const access =
    pathname.startsWith('/cek') ||
    pathname.startsWith('/tiket') ||
    pathname === '/terkirim'
  return (
    <aside className="side">
      <svg className="side-symbol" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M7 7h18v18H7zM12 13h8m-8 6h5" />
      </svg>
      <h2>
        {access
          ? 'Akses Anda, simpan baik-baik.'
          : 'Bantu laporan Anda terbaca jelas.'}
      </h2>
      <p>
        {access
          ? 'Kode tiket dan PIN diperlukan untuk masuk. Kunci pemulihan diperlukan untuk membuka isi laporan terenkripsi.'
          : 'Sampaikan apa yang terjadi, kapan, di mana, dan pihak yang terlibat. Pisahkan fakta dari dugaan.'}
      </p>
      <div className="side-privacy">
        <strong>Identitas Anda berharga.</strong>
        <p>
          Hindari informasi pribadi dalam kronologi dan bukti. Isi laporan tidak
          muncul di dashboard publik.
        </p>
      </div>
      <Link to="/panduan">
        Baca panduan <ArrowRight />
      </Link>
    </aside>
  )
}
