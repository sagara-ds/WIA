import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { api } from '../lib/api'
import { ArrowRight } from '../components/Icons'

const STEPS = [
  [
    'Ceritakan kejadian',
    'Isi rincian, tambahkan bukti, dan tinjau sebelum mengirim.',
  ],
  [
    'Simpan akses pribadi',
    'Catat tiket, PIN, dan kunci pemulihan. Akses laporan tetap di tangan Anda.',
  ],
  [
    'Ikuti penanganan',
    'Baca perkembangan dan pesan petugas. Berikan izin untuk membuka isi terenkripsi.',
  ],
]

export function Home() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<string[]>([])
  const [category, setCategory] = useState('')
  useEffect(() => {
    void api.kategori().then(setCategories)
  }, [])
  return (
    <div className="home-surface">
      <section className="home-opening" aria-labelledby="home-title">
        <h1 id="home-title">
          Suara Anda <span>punya jalan.</span>
        </h1>
        <div className="home-intro-row">
          <p>
            Sampaikan dugaan penyimpangan. Simpan akses pribadi Anda,
            <br className="desktop-break" /> lalu ikuti perjalanan laporan
            hingga tindak lanjut.
          </p>
          <div className="home-anonymous">
            <svg viewBox="0 0 28 28" aria-hidden="true">
              <path d="m14 3 10 4v7c0 6-10 11-10 11S4 20 4 14V7Z" />
              <path d="m9 14 3 3 7-7" />
            </svg>
            <span>
              Tanpa nama. <br />
              Tanpa membuat akun.
            </span>
          </div>
        </div>
      </section>
      <section className="report-desk" aria-label="Mulai atau ikuti laporan">
        <form
          className="desk-start"
          onSubmit={(event) => {
            event.preventDefault()
            navigate(
              category
                ? `/lapor?kategori=${encodeURIComponent(category)}`
                : '/lapor',
            )
          }}
        >
          <h2>Apa yang ingin Anda laporkan?</h2>
          <p>
            Mulai dari kategori. Ceritakan kejadiannya di langkah berikutnya.
          </p>
          <label htmlFor="home-category">Kategori dugaan</label>
          <div className="desk-entry">
            <select
              id="home-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Pilih kategori laporan</option>
              {categories.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <button type="submit">
              Buat laporan anonim <ArrowRight />
            </button>
          </div>
          <p className="desk-note">
            Demo untuk penjurian. Gunakan cerita dan bukti contoh.
          </p>
        </form>
        <aside className="desk-ticket">
          <h2>Sudah punya tiket?</h2>
          <p>
            Buka laporan untuk melihat status, membaca pesan, atau menambah
            bukti.
          </p>
          <Link to="/cek">
            Akses tiket saya <ArrowRight />
          </Link>
          <p className="desk-recovery">
            Siapkan kode tiket dan PIN Anda.
            <br />
            <span>Kunci pemulihan membuka isi terenkripsi.</span>
          </p>
        </aside>
      </section>
      <section className="home-journey" aria-label="Tiga langkah pelaporan">
        <ol>
          {STEPS.map(([title, body], index) => (
            <li key={title}>
              <span className="journey-number">{index + 1}</span>
              <div>
                <h2>{title}</h2>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
