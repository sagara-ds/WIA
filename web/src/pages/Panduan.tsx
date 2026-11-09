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
    'Kode tiket dan PIN menjadi akses pribadi. Mode anonim tidak menyediakan pemulihan lewat kontak.',
  ],
  [
    'Tentang privasi',
    'Pada rancangan produk akhir, bukti hanya dapat diakses petugas berwenang. Kebijakan retensi belum diputuskan. Kontrol keamanan masih perlu diimplementasikan dan diuji.',
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
