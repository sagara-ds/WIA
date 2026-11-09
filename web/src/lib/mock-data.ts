import type { StoredTicket, Transparansi, AdminSession, AuditEntry } from './types'

interface SeedDef {
  number: string
  pin: string
  ticket: Omit<StoredTicket, 'pinHash'>
}

interface AdminSeedDef {
  email: string
  password: string
  session: AdminSession
}

export const KATEGORI = [
  'Pungutan liar',
  'Penyalahgunaan anggaran',
  'Penyalahgunaan fasilitas',
  'Lainnya',
]

export const MASTER_UNITS = [
  { id: 'u1', name: 'Unit Pemeriksa Layanan — simulasi', active: true },
  { id: 'u2', name: 'Unit Pengawasan Fasilitas — simulasi', active: true },
]

export const SEED_ADMINS: AdminSeedDef[] = [
  {
    email: 'verifikator@contoh.invalid',
    password: 'verif-admin',
    session: { email: 'verifikator@contoh.invalid', role: 'verifikator', name: 'Petugas Demo' },
  },
  {
    email: 'pengelola@contoh.invalid',
    password: 'super-admin',
    session: { email: 'pengelola@contoh.invalid', role: 'super_admin', name: 'Pengelola Demo' },
  },
]

export const SEED_AUDIT: Omit<AuditEntry, 'id'>[] = [
  {
    at: '2026-10-30T12:00:00+07:00',
    actor: 'Petugas Demo',
    action: 'STATUS_CHANGED',
    detail: 'Ditindaklanjuti → Selesai · SIAP-DEMO-7K4M9 · Catatan: ringkasan tersedia.',
  },
  {
    at: '2026-10-30T11:30:00+07:00',
    actor: 'Petugas Demo',
    action: 'REPORT_VIEWED',
    detail: 'SIAP-DEMO-7K4M9 · Akses detail tercatat.',
  },
  {
    at: '2026-10-30T10:20:00+07:00',
    actor: 'Petugas Demo',
    action: 'STATUS_CHANGED',
    detail: 'Diterima → Diverifikasi · Catatan: informasi awal cukup.',
  },
]

export const SEED_TICKETS: SeedDef[] = [
  {
    number: 'SIAP-DEMO-7K4M9',
    pin: '482619',
    ticket: {
      number: 'SIAP-DEMO-7K4M9',
      title: 'Dugaan biaya tambahan pada layanan administrasi',
      category: 'Pungutan liar',
      chronology:
        'Pada 28 Oktober, saya diminta membayar biaya tambahan tanpa rincian resmi. Nominal tidak tercantum pada rincian layanan manapun dan saya tidak diberi kwitansi. Ini data contoh untuk simulasi.',
      incidentDate: '2026-10-28',
      incidentDateApprox: false,
      location: 'Loket layanan A — wilayah simulasi',
      involvedParty: 'Petugas loket (nama tidak diketahui)',
      status: 'Perlu Dilengkapi',
      createdAt: '2026-10-30T09:12:00+07:00',
      timeline: [
        { at: '2026-10-30T09:12:00+07:00', label: 'Diterima' },
        { at: '2026-10-30T10:20:00+07:00', label: 'Perlu Dilengkapi' },
        { at: '2026-10-30T10:20:00+07:00', label: 'Menunggu tanggapan pelapor', waiter: true },
      ],
      messages: [
        {
          id: 'm-7k4m9-1',
          at: '2026-10-30T10:20:00+07:00',
          author: 'admin',
          body:
            'Mohon jelaskan jumlah biaya yang diminta dan tambahkan bukti jika tersedia. Hindari mencantumkan identitas pribadi.',
        },
      ],
      evidence: [
        {
          id: 'e-demo-1',
          name: 'bukti-contoh.pdf',
          size: 245760,
          mime: 'application/pdf',
          kind: 'initial',
          at: '2026-10-30T09:12:00+07:00',
        },
      ],
      seeded: true,
    },
  },
  {
    number: 'SIAP-DEMO-2Q6R8',
    pin: '730215',
    ticket: {
      number: 'SIAP-DEMO-2Q6R8',
      title: 'Dugaan penggunaan fasilitas di luar peruntukan',
      category: 'Penyalahgunaan fasilitas',
      chronology:
        'Fasilitas layanan digunakan untuk keperluan di luar peruntukan beberapa kali pada bulan Oktober. Ini data contoh untuk simulasi, bukan aduan nyata.',
      incidentDate: '2026-10-29',
      incidentDateApprox: true,
      location: 'Area layanan B — wilayah simulasi',
      involvedParty: 'Perangkat layanan (nama tidak diketahui)',
      status: 'Selesai',
      createdAt: '2026-10-29T08:41:00+07:00',
      completedAt: '2026-10-30T12:00:00+07:00',
      timeline: [
        { at: '2026-10-29T08:41:00+07:00', label: 'Diterima' },
        { at: '2026-10-29T10:05:00+07:00', label: 'Diverifikasi' },
        { at: '2026-10-29T10:06:00+07:00', label: 'Diteruskan' },
        { at: '2026-10-30T09:40:00+07:00', label: 'Ditindaklanjuti' },
        {
          at: '2026-10-30T12:00:00+07:00',
          label: 'Selesai',
          note: 'Ringkasan hasil tersedia untuk pelapor.',
        },
      ],
      messages: [
        {
          id: 'm-2q6r8-1',
          at: '2026-10-30T12:00:00+07:00',
          author: 'admin',
          body:
            'Penanganan telah selesai. Ringkasan hasil dapat dibaca pada tiket Anda. Dokumen hasil bersifat contoh pada simulasi ini.',
        },
      ],
      evidence: [],
      resultSummary:
        'Unit telah memeriksa prosedur penggunaan fasilitas dan memperjelas peruntukan penggunaannya. Ini hasil simulasi, bukan putusan atas kejadian nyata.',
      resultFile: { name: 'ringkasan-penanganan.pdf', size: 145920 },
      seeded: true,
    },
  },
  {
    number: 'SIAP-FL-K8N3R',
    pin: '901234',
    ticket: {
      number: 'SIAP-FL-K8N3R',
      title: 'Dugaan pembayaran ganda pada layanan perizinan',
      category: 'Pungutan liar',
      chronology: 'Ditagih dua kali untuk perizinan yang sama pada 25 Oktober. Data simulasi.',
      incidentDate: '2026-10-25',
      incidentDateApprox: false,
      location: 'Loket perizinan C — simulasi',
      involvedParty: 'Petugas perizinan (nama tidak diketahui)',
      status: 'Diterima',
      createdAt: '2026-10-29T14:30:00+07:00',
      timeline: [{ at: '2026-10-29T14:30:00+07:00', label: 'Diterima' }],
      messages: [],
      evidence: [],
      seeded: true,
    },
  },
  {
    number: 'SIAP-FL-P4W7Q',
    pin: '567890',
    ticket: {
      number: 'SIAP-FL-P4W7Q',
      title: 'Permintaan biaya administrasi tidak resmi',
      category: 'Pungutan liar',
      chronology: 'Diminta biaya Rp 30.000 tanpa kwitansi pada 26 Oktober. Data simulasi.',
      incidentDate: '2026-10-26',
      incidentDateApprox: false,
      location: 'Kantor layanan D — simulasi',
      involvedParty: 'Petugas administrasi (nama tidak diketahui)',
      status: 'Diterima',
      createdAt: '2026-10-28T09:00:00+07:00',
      timeline: [{ at: '2026-10-28T09:00:00+07:00', label: 'Diterima' }],
      messages: [],
      evidence: [],
      seeded: true,
    },
  },
  {
    number: 'SIAP-FL-M9V2T',
    pin: '345678',
    ticket: {
      number: 'SIAP-FL-M9V2T',
      title: 'Penyalahgunaan anggaran pelatihan',
      category: 'Penyalahgunaan anggaran',
      chronology:
        'Anggaran pelatihan digunakan untuk keperluan di luar program pada Oktober. Data simulasi.',
      incidentDate: '2026-10-20',
      incidentDateApprox: true,
      location: 'Unit pelatihan — simulasi',
      involvedParty: 'Koordinator pelatihan (nama tidak diketahui)',
      status: 'Perlu Dilengkapi',
      createdAt: '2026-10-27T10:15:00+07:00',
      timeline: [
        { at: '2026-10-27T10:15:00+07:00', label: 'Diterima' },
        { at: '2026-10-27T11:00:00+07:00', label: 'Perlu Dilengkapi' },
        { at: '2026-10-27T11:00:00+07:00', label: 'Menunggu tanggapan pelapor', waiter: true },
      ],
      messages: [
        {
          id: 'm-fl-m9v2t-1',
          at: '2026-10-27T11:00:00+07:00',
          author: 'admin',
          body: 'Mohon jelaskan rincian anggaran dan bukti penggunaan bila tersedia.',
        },
      ],
      evidence: [],
      seeded: true,
    },
  },
  {
    number: 'SIAP-FL-B6D8L',
    pin: '234567',
    ticket: {
      number: 'SIAP-FL-B6D8L',
      title: 'Laporan penggunaan kendaraan dinas di luar jam kerja',
      category: 'Penyalahgunaan fasilitas',
      chronology: 'Kendaraan dinas digunakan untuk keperluan pribadi pada 22 Oktober. Data simulasi.',
      incidentDate: '2026-10-22',
      incidentDateApprox: false,
      location: 'Area parkir kantor — simulasi',
      involvedParty: 'Pengguna kendaraan (nama tidak diketahui)',
      status: 'Ditolak',
      createdAt: '2026-10-26T08:20:00+07:00',
      completedAt: '2026-10-26T14:30:00+07:00',
      timeline: [
        { at: '2026-10-26T08:20:00+07:00', label: 'Diterima' },
        {
          at: '2026-10-26T14:30:00+07:00',
          label: 'Ditolak',
          note: 'Bukti tidak cukup untuk memverifikasi dugaan.',
        },
      ],
      messages: [
        {
          id: 'm-fl-b6d8l-1',
          at: '2026-10-26T14:30:00+07:00',
          author: 'admin',
          body:
            'Laporan ditolak karena bukti tidak cukup. Silakan laporkan kembali dengan dokumentasi yang lebih lengkap bila diperlukan.',
        },
      ],
      evidence: [],
      seeded: true,
    },
  },
  {
    number: 'SIAP-FL-R3H5Y',
    pin: '123456',
    ticket: {
      number: 'SIAP-FL-R3H5Y',
      title: 'Dugaan penggunaan fasilitas kantor untuk acara pribadi',
      category: 'Penyalahgunaan fasilitas',
      chronology: 'Ruang rapat digunakan untuk acara ulang tahun pada 21 Oktober. Data simulasi.',
      incidentDate: '2026-10-21',
      incidentDateApprox: false,
      location: 'Ruang rapat lantai 3 — simulasi',
      involvedParty: 'Pengguna ruang rapat (nama tidak diketahui)',
      status: 'Diteruskan',
      createdAt: '2026-10-25T13:40:00+07:00',
      timeline: [
        { at: '2026-10-25T13:40:00+07:00', label: 'Diterima' },
        { at: '2026-10-25T15:00:00+07:00', label: 'Diverifikasi' },
        { at: '2026-10-25T15:05:00+07:00', label: 'Diteruskan' },
      ],
      messages: [],
      evidence: [],
      seeded: true,
    },
  },
  {
    number: 'SIAP-FL-T7J2N',
    pin: '890123',
    ticket: {
      number: 'SIAP-FL-T7J2N',
      title: 'Pengadaan barang tanpa tender resmi',
      category: 'Penyalahgunaan anggaran',
      chronology:
        'Pengadaan alat kantor senilai Rp 15 juta tanpa proses tender pada Oktober. Data simulasi.',
      incidentDate: '2026-10-18',
      incidentDateApprox: true,
      location: 'Unit pengadaan — simulasi',
      involvedParty: 'Petugas pengadaan (nama tidak diketahui)',
      status: 'Ditindaklanjuti',
      createdAt: '2026-10-24T11:00:00+07:00',
      timeline: [
        { at: '2026-10-24T11:00:00+07:00', label: 'Diterima' },
        { at: '2026-10-24T14:20:00+07:00', label: 'Diverifikasi' },
        { at: '2026-10-24T14:25:00+07:00', label: 'Diteruskan' },
        { at: '2026-10-25T09:00:00+07:00', label: 'Ditindaklanjuti' },
      ],
      messages: [],
      evidence: [],
      seeded: true,
    },
  },
]

export const TRANSPARANSI: Transparansi = {
  period: 'Oktober 2026',
  updated: '30 Oktober 2026, 12.00 WIB',
  stats: [
    { value: '128', label: 'Laporan masuk' },
    { value: '46', label: 'Dalam proses' },
    { value: '64', label: 'Selesai' },
    { value: '8,2 hari', label: 'Rata-rata penanganan' },
  ],
  perKategori: 'Pungutan liar 48 · Penyalahgunaan anggaran 36 · Fasilitas 28 · Lainnya 16',
  tren: 'Juli 72 · Agustus 89 · September 104 · Oktober 128',
  perKategoriData: [
    { label: 'Pungutan liar', value: 48 },
    { label: 'Penyalahgunaan anggaran', value: 36 },
    { label: 'Penyalahgunaan fasilitas', value: 28 },
    { label: 'Lainnya', value: 16 },
  ],
  trenData: [
    { label: 'Juli', value: 72 },
    { label: 'Agustus', value: 89 },
    { label: 'September', value: 104 },
    { label: 'Oktober', value: 128 },
  ],
}
