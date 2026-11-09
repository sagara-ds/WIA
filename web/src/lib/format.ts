const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function formatStamp(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${BULAN[d.getMonth()]}, ${hh}.${mm}`
}

export function formatTanggal(dateISO: string, approx: boolean): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  if (!y || !m || !d) return dateISO
  const base = `${d} ${BULAN[m - 1]} ${y}`
  return approx ? `${base} (perkiraan)` : base
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`
  const mb = (n / (1024 * 1024)).toFixed(1).replace('.', ',')
  return `${mb} MB`
}

export function nowISO(): string {
  return new Date().toISOString()
}
