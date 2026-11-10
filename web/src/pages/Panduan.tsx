import { Page, Card, ActionsRow, CtaLink } from '../components/Page'

const PANDUAN: [string, string][] = [
  [
    'Susun laporan yang jelas',
    'Jelaskan apa, kapan, di mana, dan pihak yang terlibat. Pisahkan dugaan dari fakta yang Anda ketahui.',
  ],
  [
    'Lindungi identitas Anda',
    'Jangan sertakan nama atau kontak pribadi. Periksa isi gambar dan dokumen sebelum mengunggah.',
  ],
  [
    'Simpan akses tiket',
    'Simpan kode tiket, PIN, dan kunci pemulihan saat laporan dikirim. Tiket dan PIN dipakai untuk masuk; kunci pemulihan membuka isi terenkripsi. Kunci ini tidak menggantikan PIN. Pemulihan lewat email atau nomor telepon tidak tersedia.',
  ],
  [
    'Tentang privasi',
    'Isi laporan dan bukti dienkripsi di browser. Petugas dapat membaca isi setelah Anda memberikan izin dari tiket. Kategori, status, dan waktu tetap digunakan sebagai metadata. Dashboard publik hanya menampilkan agregat. Ini prototipe, bukan jaminan anonimitas untuk laporan sungguhan.',
  ],
]

export function Panduan() {
  return (
    <Page
      eyebrow="PANDUAN & PRIVASI"
      title="Pahami sebelum melapor."
      lead="SIAP adalah prototype lomba. Gunakan data contoh dan jangan kirim aduan atau bukti sungguhan."
    >
      <div className="cards">
        {PANDUAN.map(([t, body]) => (
          <Card key={t} title={t}>
            <p>{body}</p>
          </Card>
        ))}
      </div>
      <ActionsRow>
        <CtaLink to="/lapor">Mulai laporan</CtaLink>
        <CtaLink to="/">Kembali ke beranda</CtaLink>
      </ActionsRow>
    </Page>
  )
}
