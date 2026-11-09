import { Page, Card, ActionsRow, CtaLink } from '../components/Page'

const STEPS: [string, string, string][] = [
  ['1', 'Laporkan tanpa identitas', 'Isi formulir tiga langkah: kejadian, bukti, lalu tinjau. Nama, email, dan nomor telepon tidak diminta.'],
  ['2', 'Simpan tiket & PIN', 'Setelah terkirim, Anda menerima kode tiket dan PIN 6 digit. Keduanya hanya ditampilkan sekali.'],
  ['3', 'Pantau sampai tuntas', 'Buka cek status untuk membaca linimasa, pesan admin, dan mengirim bukti tambahan.'],
]

const CARDS: [string, string][] = [
  ['Identitas tidak diminta', 'Mode anonim tidak meminta nama, email, atau nomor telepon.'],
  ['Tindak lanjut terlihat', 'Lihat perkembangan dan jawaban admin melalui tiket Anda.'],
  [
    'Transparansi bersama',
    'Publik dapat melihat statistik penanganan tanpa membuka isi aduan.',
  ],
]

export function Home() {
  return (
    <Page
      home
      eyebrow="RUANG AMAN UNTUK BERSUARA"
      title="Lapor aman, pantau sampai tuntas."
      lead="Sampaikan dugaan penyimpangan tanpa mencantumkan identitas. Ikuti perkembangannya melalui tiket pribadi."
    >
      <div className="steps" aria-label="Cara kerja SIAP">
        {STEPS.map(([no, title, body]) => (
          <div className="step" key={no}>
            <span className="step-no" aria-hidden="true">
              {no}
            </span>
            <strong>{title}</strong>
            <p>{body}</p>
          </div>
        ))}
      </div>
      <div className="cards">
        {CARDS.map(([t, body]) => (
          <Card key={t} title={t}>
            <p>{body}</p>
          </Card>
        ))}
      </div>
      <ActionsRow>
        <CtaLink to="/lapor">Buat laporan anonim</CtaLink>
        <CtaLink to="/cek">Cek status laporan</CtaLink>
        <CtaLink to="/transparansi">Lihat transparansi</CtaLink>
        <CtaLink to="/panduan">Panduan &amp; privasi</CtaLink>
      </ActionsRow>
    </Page>
  )
}
