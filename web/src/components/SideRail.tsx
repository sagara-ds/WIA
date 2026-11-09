import { Link } from 'react-router'

export function SideRail() {
  return (
    <aside className="side">
      <strong>Pelaporan yang tertib.</strong>
      <p>
        01 · Sampaikan fakta
        <br />
        02 · Sertakan bukti
        <br />
        03 · Simpan akses tiket
        <br />
        04 · Pantau tanggapan
      </p>
      <strong>Identitas Anda berharga.</strong>
      <p>
        Hindari informasi pribadi dalam kronologi dan bukti. Isi laporan tidak ditampilkan di
        dashboard publik.
      </p>
      <Link to="/panduan">Baca panduan →</Link>
    </aside>
  )
}
