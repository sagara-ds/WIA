import { useEffect, useState } from 'react'
import { Page, Card, ActionsRow, CtaLink } from '../components/Page'
import { Skeleton } from '../components/Feedback'
import { api } from '../lib/api'
import type { Transparansi as TransparansiData } from '../lib/types'

const SPARK_W = 600
const SPARK_H = 180
const SPARK_PAD = 28

export function Transparansi() {
  const [data, setData] = useState<TransparansiData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    void api.transparansi().then((d) => {
      if (d) setData(d)
      else setFailed(true)
    })
  }, [])

  if (failed) {
    return (
      <Page
        eyebrow="DASHBOARD TRANSPARANSI"
        title="Data belum dapat dimuat."
        lead="Terjadi gangguan koneksi ke server. Coba muat ulang halaman beberapa saat lagi."
      >
        <ActionsRow>
          <CtaLink to="/">Kembali</CtaLink>
        </ActionsRow>
      </Page>
    )
  }

  if (!data) {
    return (
      <Page
        eyebrow="DASHBOARD TRANSPARANSI"
        title="Menyiapkan data transparansi."
        lead="Memuat statistik agregat."
      >
        <Skeleton lines={6} />
      </Page>
    )
  }

  const maxKategori = Math.max(1, ...data.perKategoriData.map((d) => d.value))
  const maxTren = Math.max(1, ...data.trenData.map((d) => d.value))
  const coverage = data.coverage
  const points = data.trenData.map((d, i) => {
    const x = SPARK_PAD + (i * (SPARK_W - SPARK_PAD * 2)) / Math.max(1, data.trenData.length - 1)
    const y = SPARK_H - SPARK_PAD - (d.value / maxTren) * (SPARK_H - SPARK_PAD * 2)
    return { ...d, x, y }
  })
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <Page
      eyebrow="DASHBOARD TRANSPARANSI"
      title="Penanganan aduan, terlihat bersama."
      lead={`Periode ${data.period} · Agregat seluruh laporan. Diperbarui ${data.updated}.`}
    >
      <div className="stats">
        {data.stats.map((s) => (
          <div className="stat" key={s.label}>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="cards">
        <Card title="Laporan per kategori">
          <div
            className="chart"
            role="img"
            aria-label={`Laporan per kategori: ${data.perKategoriData
              .map((d) => `${d.label} ${d.value}`)
              .join(', ')}`}
          >
            {data.perKategoriData.map((d) => (
              <div className="bar-row" key={d.label}>
                <span className="bar-label">{d.label}</span>
                <span className="bar-track">
                  <span
                    className="bar-fill"
                    style={{ width: `${Math.round((d.value / maxKategori) * 100)}%` }}
                  />
                </span>
                <span className="bar-value">{d.value}</span>
              </div>
            ))}
          </div>
          <p className="chart-caption">
            Total {data.stats.find((stat) => stat.label === 'Laporan masuk')?.value ?? '0'} laporan.
          </p>
        </Card>
        <Card title="Tren laporan masuk">
          <svg
            className="sparkline"
            viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
            role="img"
            aria-label={`Tren laporan masuk: ${data.trenData
              .map((d) => `${d.label} ${d.value}`)
              .join(', ')}`}
          >
            {[0, 1, 2].map((i) => {
              const y = SPARK_PAD + (i * (SPARK_H - SPARK_PAD * 2)) / 2
              return (
                <line
                  key={i}
                  className="grid-line"
                  x1={SPARK_PAD}
                  x2={SPARK_W - SPARK_PAD}
                  y1={y}
                  y2={y}
                />
              )
            })}
            <polyline className="line" points={polyline} />
            {points.map((p) => (
              <g key={p.label}>
                <circle className="dot" cx={p.x} cy={p.y} r={4.5} />
                <text x={p.x} y={p.y - 12} textAnchor="middle">
                  {p.value}
                </text>
                <text x={p.x} y={SPARK_H - 6} textAnchor="middle">
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
          <p className="chart-caption">Jumlah laporan masuk per bulan.</p>
        </Card>
        <Card title="Cakupan indikator">
          <p>
            {coverage
              ? `Dalam proses: ${coverage.inProcess}. Ditolak: ${coverage.rejected}. Ditindaklanjuti atau selesai: ${coverage.acted} dari ${coverage.denominator} laporan yang tidak ditolak (${coverage.percentage}%). Rata-rata penanganan dihitung dari tiket selesai.`
              : 'Cakupan indikator belum tersedia.'}
          </p>
        </Card>
        <Card title="Privasi publik">
          <p>
            {'Dashboard hanya memuat agregat. Kronologi, lampiran, tiket pribadi, dan pihak terkait tidak ditampilkan.'}
          </p>
        </Card>
      </div>
      <ActionsRow>
        <CtaLink to="/lapor">Buat laporan</CtaLink>
        <CtaLink to="/">Kembali</CtaLink>
      </ActionsRow>
    </Page>
  )
}
