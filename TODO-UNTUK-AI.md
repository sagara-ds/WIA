# TODO — Handoff Pengembangan SIAP untuk AI Developer

> **Dokumen ini adalah instruksi eksekusi untuk AI agent yang melanjutkan proyek ini.**
> Baca seluruh dokumen sebelum mengubah kode. Jangan berasumsi — semua fakta di sini sudah diverifikasi terhadap kode per **9 November 2026**.
>
> - Strategi & alasan (skor juri, target): `rencanaMikael.md`
> - Dokumen ini: **urutan kerja operasional yang tidak ambigu**
> - Aturan main: kerjakan **berurutan per fase**, satu task = satu commit, dan **setiap task wajib lulus verifikasi** sebelum lanjut.
> - **Legenda status:** ✅ = sudah dikerjakan · ⬜ = belum dikerjakan

---

## 0. Ringkasan Proyek (30 detik)

**SIAP (Sistem Informasi Aduan Publik)** adalah prototipe frontend untuk pelaporan dugaan penyimpangan secara **anonim**. Pelapor mengisi formulir 3 langkah, menerima **nomor tiket + PIN 6 digit**, lalu bisa memantau status, membaca pesan admin, dan membalas dengan bukti. Admin memproses tiket lewat antrean: verifikasi → lengkapi/tolak/teruskan → tindak lanjut → selesai. Ada juga dashboard transparansi publik (agregat saja) dan panel super admin (audit log + master data).

**Status saat ini:** frontend-only. Semua data disimpan di `sessionStorage` browser (hilang saat tab ditutup). **Tidak ada backend.** Ini yang harus dilanjutkan sesuai 3 saran juri:

1. **Backend & database nyata** (Express + database relasional)
2. **Panel admin fungsional nyata** (verifikasi, pesan dua arah, master data)
3. **Keamanan & anonimitas** (enkripsi end-to-end / zero-knowledge)

**Skor juri FDS: 41/45.** Empat aspek bernilai 4 yang harus dinaikkan: (a) sitemap/wireframe, (b) README, (c) desain visual, (d) fungsionalitas & responsivitas.

---

## 1. Setup & Perintah Verifikasi

Aplikasi ada di **`web/`**, BUKAN di root repo.

```powershell
cd web
npm install        # sudah pernah dijalankan; node_modules ada
npm run dev        # http://localhost:5173
npm run lint       # oxlint — target: 0 warning
npm run build      # tsc -b && vite build — target: sukses
npm run preview    # cek hasil build
```

- Node.js: gunakan **LTS terbaru (22+)** karena Vite 8.
- Stack: React 19, TypeScript 7, Vite 8, Tailwind 4 (`@import 'tailwindcss'` di `src/styles.css`), react-router 8, oxlint.
- Jangan jalankan `npm install` di root repo. Jangan commit `node_modules/` atau `dist/`.
- Kerja di branch `mikaelPunyaBranch` atau branch baru dari situ. **Jangan commit/push ke `main`.**

---

## 2. Peta Repository

```
WIA/                          ← root repo (working directory AI)
├── rencanaMikael.md          ← dokumen strategi (jangan diubah)
├── TODO-UNTUK-AI.md          ← dokumen ini
├── web/                      ← APLIKASI (semua kerjaan kode di sini)
│   ├── src/
│   │   ├── App.tsx           ← definisi 22 rute + catch-all
│   │   ├── styles.css        ← design system (CSS custom, Tailwind tersedia)
│   │   ├── components/       ← Page, Card, Layout, SideRail, Field, FileChip, RequireAdmin
│   │   ├── lib/
│   │   │   ├── types.ts      ← SEMUA tipe domain + konstanta validasi
│   │   │   ├── api.ts        ← LAPISAN ABSTRAKSI — UI hanya memanggil file ini
│   │   │   ├── mock-db.ts    ← "database" sessionStorage (target migrasi backend)
│   │   │   ├── mock-data.ts  ← seed tiket, admin, audit, transparansi
│   │   │   └── format.ts     ← format tanggal/ukuran Indonesia
│   │   └── pages/            ← 22 halaman
│   └── package.json
└── WIA/                      ← artefak desain (Obsidian vault + SIAP Design)
    └── SIAP Design/          ← brief PRD, screenshot, script Figma
```

**PENTING:** folder `WIA/` hanya referensi desain — **jangan diubah** kecuali diminta eksplisit. Jangan menyentuh `node_modules/`, `dist/`, atau file di luar `web/`.

---

## 3. Arsitektur & Alur Data

```
pages/*.tsx  →  lib/api.ts (api & adminApi)  →  lib/mock-db.ts  →  sessionStorage
```

- **UI tidak pernah memanggil `mock-db.ts` langsung.** Semua lewat `api.ts` / `adminApi`.
- Karena itu, migrasi backend (Fase 1) = mengganti isi `api.ts` dengan `fetch`, **tanpa mengubah halaman**.
- Kontrak tipe ada di `src/lib/types.ts`. Jangan ubah nama field tanpa memperbarui semua pemakai.

### 3.1 Peta metode `api.ts` → endpoint backend (Fase 1)

| Metode `api.ts` | Endpoint yang harus dibuat | Body / Query | Respons |
|---|---|---|---|
| `api.kategori()` | `GET /api/categories` | — | `string[]` |
| `api.createReport(fields, evidence)` | `POST /api/reports` | `ReportFields` + metadata bukti | `{ number, pin }` (PIN hanya sekali) |
| `api.checkTicket(number, pin)` | `POST /api/tickets/check` | `{ number, pin }` | `StoredTicket \| null` + cookie sesi tiket |
| `api.getTicket(number)` | `GET /api/tickets/:number` | cookie sesi tiket | `StoredTicket \| null` |
| `api.sendReply(number, body, evidence)` | `POST /api/tickets/:number/replies` | `{ body, evidence }` | `StoredTicket` |
| `api.transparansi()` | `GET /api/transparency` | — | `Transparansi` |
| `adminApi.login(email, password)` | `POST /api/admin/login` | `{ email, password }` | `AdminSession` + cookie `httpOnly` |
| `adminApi.logout()` | `POST /api/admin/logout` | — | `204` |
| `adminApi.queue(filter)` | `GET /api/admin/tickets` | `?status=&category=&search=` | `StoredTicket[]` |
| `adminApi.detail(number)` | `GET /api/admin/tickets/:number` | — | `{ ticket, internalNotes }` |
| `adminApi.transition(...)` | `PATCH /api/admin/tickets/:number/status` | `{ toStatus, note, internal, extra }` | `StoredTicket` |
| `adminApi.audit()` | `GET /api/admin/audit` | — | `AuditEntry[]` |
| `adminApi.masterData()` | `GET /api/admin/master` | — | `{ categories, units, admins }` |
| Master CRUD (Fase 2) | `POST/PATCH/DELETE /api/admin/master/*` | sesuai entitas | entitas |

Draft laporan (`loadDraft`, `addDraftFiles`, `saveDraftFields`, `clearDraft`) **tetap di browser** (localStorage/sessionStorage) — draft belum tentu jadi laporan, tidak perlu server.

---

## 4. Aturan Domain — WAJIB Dipertahankan

### 4.1 Status & transisi (sumber: `mock-db.ts` → `allowedTransitions`)

| Status saat ini | Boleh pindah ke |
|---|---|
| `Diterima` | `Diverifikasi`, `Perlu Dilengkapi`, `Ditolak` |
| `Perlu Dilengkapi` | `Diverifikasi`, `Ditolak` |
| `Diverifikasi` | `Diteruskan` |
| `Diteruskan` | `Ditindaklanjuti` |
| `Ditindaklanjuti` | `Selesai` |
| `Ditolak` | (final — tidak ada) |
| `Selesai` | (final — tidak ada) |

- Setiap transisi **wajib punya catatan/alasan** (UI sudah menegakkan; server juga harus).
- `Selesai` wajib punya `resultSummary`; `Diteruskan` wajib pilih `unit`.
- Antrean admin **mengecualikan** `Selesai` dan `Ditolak`.
- Saat status jadi `Perlu Dilengkapi`, timeline menambah entri `waiter: true` ("Menunggu tanggapan pelapor"). Saat pelapor membalas, entri waiter dihapus lalu diganti "Balasan diterima" + "Menunggu pemeriksaan admin". **Status TIDAK otomatis berubah setelah balasan pelapor.**

### 4.2 Validasi file (sumber: `types.ts`)

- MIME: `image/jpeg`, `image/png`, `application/pdf` saja.
- Maksimal **5 file** per laporan (total, termasuk balasan).
- Maksimal **10 MB** per file.
- Validasi harus dilakukan **juga di server** (jangan hanya client).

### 4.3 PIN & keamanan tiket

- Nomor tiket: `SIAP-` + 5 karakter alfabet `BCDFGHJKLMNPQRSTVWXYZ123456789` (tanpa huruf ambigu).
- PIN: 6 digit angka, dibuat acak.
- PIN disimpan sebagai hash **PBKDF2-SHA256, 150.000 iterasi, salt 16 byte**, format `saltHex$hashHex`.
- **PIN asli hanya ditampilkan SEKALI** di halaman `/terkirim`. Jangan pernah tampilkan lagi.
- Cek tiket: nomor tidak case-sensitive (di-uppercase), PIN di-trim. Pesan gagal harus generik ("tiket atau PIN tidak ditemukan") — jangan ungkap apakah tiket ada.
- Login admin saat ini membandingkan hash — di backend gunakan **bcrypt/argon2** yang benar.

### 4.4 Peran admin

- `verifikator`: antrean + semua transisi.
- `super_admin`: semua di atas + halaman `/petugas/audit` dan `/petugas/master` (di UI dijaga `RequireAdmin roles={['super_admin']}` — di backend wajib ditegakkan juga).
- Audit log: `LOGIN`, `REPORT_VIEWED`, `STATUS_CHANGED` — **append-only**, jangan pernah edit/hapus.

---

## 5. Konvensi Kode

- **Bahasa UI: Indonesia.** Nada formal, tanpa istilah Inggris kecuali teknis.
- Format tanggal & ukuran: gunakan `src/lib/format.ts` (`formatStamp`, `formatTanggal`, `formatBytes`). Jangan format manual.
- Komponen layout: gunakan `Page`, `Card`, `ActionsRow`, `CtaLink`, `Timeline`, `Notice`, `StatGrid` dari `src/components/Page.tsx`.
- Styling: CSS class di `src/styles.css` (design token di `:root`). Tailwind tersedia, tapi **ikuti pola yang sudah ada** (class semantik seperti `.card`, `.stats`, `.actions`) — jangan campur utility Tailwind acak di JSX.
- Nama file halaman: PascalCase (`AdminQueue.tsx`), ekspor bernama (`export function AdminQueue`).
- Komentar kode: hanya jika perlu; jangan tinggalkan `console.log` berisi data laporan/PIN.
- Jangan menambah library baru tanpa alasan kuat. Grafik → SVG/CSS native. Kripto → WebCrypto native.

---

## 6. Guardrails (JANGAN DILANGGAR)

1. **Jangan hapus banner disclaimer** `"PROTOTYPE LOMBA · Data contoh · Tidak menerima laporan sungguhan"` di `Layout.tsx` dan peringatan data contoh di halaman Transparansi. Ini nilai plus dari juri.
2. **Jangan hapus seed data** di `mock-data.ts`; boleh menambah.
3. **Jangan ubah folder `WIA/`** (artefak desain).
4. **Jangan klaim sistem "aman secara hukum"** di README/UI — hanya teknis. Aspek hukum butuh kebijakan resmi.
5. **Jangan commit ke `main`.** Commit kecil per task dengan pesan jelas (contoh: `feat(web): add sitemap section to README`).
6. Setiap akhir task: `npm run lint` **0 warning** dan `npm run build` **sukses**. Kalau salah satu gagal, perbaiki dulu — jangan lanjut.
7. Jangan mengubah perilaku produk yang sudah dinilai 5 (formulir bertahap, tiket+PIN, transparansi agregat) tanpa alasan dari dokumen ini.

---

## 7. TODO — Urutan Eksekusi

> Format tiap task: **Tujuan → File → Langkah → Selesai bila → Verifikasi**.
> Kerjakan Fase 0 dulu (cepat, langsung menaikkan skor juri), baru Fase 1–3.
>
> **Status per 9 November 2026:** ✅ **Fase 0 SELESAI (10/10 task)** · ⬜ Fase 1–3 belum dimulai.

---

### FASE 0 — Polesan Submission (naikkan 4 aspek dari 4 → 5)

#### ✅ [T0.1] Tulis ulang README.md
- **Tujuan:** skor "Kelengkapan Repository & README.md" dari 4 → 5.
- **File:** `web/README.md` (sekarang masih template bawaan Vite — wajib diganti total).
- **Langkah:**
  1. Judul + deskripsi SIAP (anonim, tiket+PIN, transparansi).
  2. Latar belakang & tujuan (ringkas dari `WIA/SIAP Design/Design brief.md`).
  3. Daftar fitur: alur pelapor, alur admin, super admin, transparansi.
  4. Tech stack + versi.
  5. Cara menjalankan: `cd web`, `npm install`, `npm run dev`; build/lint.
  6. Kredensial demo (lihat bagian 9 dokumen ini) + cara cek tiket demo.
  7. Struktur folder singkat.
  8. Status/progress (checklist per fase).
  9. Disclaimer prototipe: data contoh, bukan sistem produksi, tidak menerima laporan nyata.
- **Selesai bila:** tidak ada lagi teks template Vite ("This template provides...", "React Compiler", "Oxlint configuration"); semua bagian di atas ada.
- **Verifikasi:** baca ulang README; pastikan perintah di README benar-benar jalan.

#### ✅ [T0.2] Sitemap + keterlacakan PRD di README
- **Tujuan:** skor "Kejelasan Struktur (Sitemap) & Wireframe" dari 4 → 5.
- **File:** `web/README.md` (bagian baru).
- **Langkah:**
  1. Tambah diagram **Mermaid** (`flowchart TD`) berisi 22 rute dari `src/App.tsx`, dikelompokkan: Publik (Beranda, Lapor→Bukti→Tinjau→Terkirim, Cek→Tiket→Balas), Admin (`/petugas/*`), Super Admin (audit, master), Pendukung (transparansi, panduan).
  2. Tambah tabel keterlacakan PRD F-01–F-23 → halaman (salin dari `Design brief.md`, bagian "Keterlacakan PRD").
  3. Tambah link Figma wireframe/mockup/prototype (ada di `Design brief.md`, bagian "Link hasil").
- **Selesai bila:** diagram render di GitHub (cek sintaks Mermaid) dan semua rute di `App.tsx` tercakup.
- **Verifikasi:** hitung rute di diagram = 22 halaman (catch-all `*` tidak perlu dimasukkan).

#### ✅ [T0.3] Screenshot di repository
- **Tujuan:** bukti visual untuk juri; syarat FDS (landing + 1 halaman lain) sudah aman, ini menambah kualitas.
- **File:** buat `web/docs/`; salin `WIA/SIAP Design/desktop-preview.png` dan `mobile-preview.png` ke `web/docs/` (supaya repo `web/` mandiri).
- **Langkah:** embed keduanya di README dengan caption. Opsional: screenshot halaman Transparansi & antrean admin setelah Fase 0 selesai.
- **Selesai bila:** gambar tampil di README dengan path relatif yang benar.
- **Verifikasi:** preview markdown; pastikan tidak ada path absolut.

#### ✅ [T0.4] Grafik di halaman Transparansi
- **Tujuan:** skor "Desain Visual" & "Potensi Dampak" — data publik harus mudah dibaca.
- **File:** `src/lib/types.ts` (`Transparansi`), `src/lib/mock-data.ts` (`TRANSPARANSI`), `src/pages/Transparansi.tsx`, `src/styles.css`.
- **Langkah:**
  1. Tambah field terstruktur ke tipe `Transparansi`: `perKategoriData: { label: string; value: number }[]` dan `trenData: { label: string; value: number }[]`. Isi dari string yang ada: `Pungutan liar 48 · Penyalahgunaan anggaran 36 · Fasilitas 28 · Lainnya 16`; `Juli 72 · Agustus 89 · September 104 · Oktober 128`.
  2. Render **bar chart horizontal** (div + CSS width %) untuk per kategori, dan **sparkline SVG** untuk tren. Tanpa library chart.
  3. Sertakan label nilai yang terbaca + teks alternatif (`aria-label` / tabel tersembunyi) untuk aksesibilitas.
  4. Hapus pemakaian string lama `perKategori`/`tren` dari halaman (boleh pertahankan field string di tipe untuk kompatibilitas, tapi jangan ditampilkan ganda).
- **Selesai bila:** grafik tampil benar di desktop & 390px; angka sesuai seed; `npm run build` sukses.
- **Verifikasi:** bandingkan angka dengan `mock-data.ts`; zoom 200% tetap terbaca.

#### ✅ [T0.5] Komponen badge status yang konsisten
- **Tujuan:** konsistensi visual (status memakai teks + warna pendukung, sesuai design brief).
- **File:** baru `src/components/StatusBadge.tsx`; pakai di `AdminQueue.tsx`, `AdminDetail.tsx`, `Tiket.tsx`, dan halaman admin lain yang menampilkan status; tambah class di `src/styles.css`.
- **Langkah:** buat satu pemetaan tetap status → class warna (7 status). Jangan mengubah teks status. Gunakan `aria-label` yang jelas.
- **Selesai bila:** semua tampilan status memakai komponen ini; tidak ada warna status hardcoded tersisa di halaman.
- **Verifikasi:** grep nama status di `src/pages/` — tidak ada span/div status ad-hoc.

#### ✅ [T0.6] Empty state & loading state
- **Tujuan:** skor fungsionalitas — UI tidak "kosong membingungkan" saat data belum ada/loading.
- **File:** `AdminQueue.tsx`, `AdminAudit.tsx`, `AdminDetail.tsx`, `Tiket.tsx` (dan halaman lain yang `return null` saat loading).
- **Langkah:**
  1. Buat komponen kecil `EmptyState` dan `Skeleton` (boleh di `Page.tsx` atau file baru).
  2. `AdminDetail` saat ini `return null` sambil menunggu — ganti dengan skeleton.
  3. Antrean/audit kosong → tampilkan pesan jelas + CTA kembali.
- **Selesai bila:** tidak ada halaman yang menampilkan layar kosong tanpa penjelasan.
- **Verifikasi:** uji dengan filter antrean yang tidak punya hasil; uji refresh langsung di `/petugas/detail`.

#### ✅ [T0.7] Poles landing & footer
- **Tujuan:** skor "Desain Visual & Layout".
- **File:** `src/pages/Home.tsx`, `src/components/Layout.tsx`, `src/styles.css`.
- **Langkah:** perbaiki hierarki hero (judul, subjudul, CTA utama jelas), tambah ringkasan "cara kerja" 3 langkah bila belum ada, footer memuat: disclaimer data contoh, link Panduan, link Transparansi, teks "Prototipe lomba". Jangan mengubah alur navigasi.
- **Selesai bila:** landing terbaca baik di 390px & 1440px; tidak ada overflow horizontal.
- **Verifikasi:** uji manual kedua viewport.

#### ✅ [T0.8] Perbaiki lint warning
- **Tujuan:** `oxlint` bersih (0 warning).
- **File:** `src/pages/AdminDetail.tsx` (warning `react(set-state-in-effect)` di sekitar baris 18).
- **Langkah:** hilangkan `setState` sinkron di dalam `useEffect`. Pola yang disarankan: baca nomor tiket saat render; jika tidak ada, langsung `<Navigate to="/petugas/antrean" replace />`; state hanya diisi di callback async. Alternatif: `useState` inisialisasi + efek hanya untuk fetch.
- **Selesai bila:** `npm run lint` → 0 warning, `npm run build` sukses, perilaku redirect sama.
- **Verifikasi:** buka `/petugas/detail` tanpa memilih tiket → redirect ke antrean; dengan tiket → detail tampil.

#### ✅ [T0.9] Audit responsivitas 390px
- **Tujuan:** skor "Fungsionalitas, Navigasi & Responsivitas".
- **File:** semua halaman di `src/pages/`, terutama yang punya tabel/form lebar (`AdminQueue`, `AdminDetail`, `AdminAudit`, `AdminMaster`, `Lapor`, `Tiket`), plus `src/styles.css`.
- **Langkah:** buka semua 22 rute di viewport 390×844. Perbaiki overflow horizontal (tabel → wrapper `overflow-x:auto`; grid → 1 kolom; tombol → full width bila perlu). Jangan mengubah desain desktop.
- **Selesai bila:** `document.documentElement.scrollWidth <= 390` di semua rute; navigasi & form bisa dipakai dengan jari.
- **Verifikasi:** DevTools responsive mode, cek tiap rute; catat hasil di commit message.

#### ✅ [T0.10] Validasi form inline di alur Lapor
- **Tujuan:** fungsionalitas & UX.
- **File:** `src/pages/Lapor.tsx`, `src/pages/Bukti.tsx`, `src/components/Field.tsx`.
- **Langkah:** tampilkan error di bawah field yang gagal (judul, kategori, kronologi, tanggal, lokasi, pihak terkait), dengan `aria-describedby`. Jangan mengubah aturan wajib yang ada.
- **Selesai bila:** submit kosong menampilkan error per field, bukan hanya pesan umum; pengguna bisa lanjut setelah diperbaiki.
- **Verifikasi:** uji submit kosong, submit sebagian, submit valid; keyboard-only.

**Definisi selesai Fase 0:** ✅ **TERPENUHI** — `npm run lint` 0 warning, `npm run build` sukses, README lengkap + sitemap + screenshot, semua rute aman di 390px.

---

### FASE 1 — Backend & Database Nyata (saran juri #1)

> Buat folder baru `server/` di dalam `web/`? **Tidak.** Buat di root repo: `server/` (sejajar dengan `web/`), agar frontend & backend terpisah jelas. Root repo adalah working directory.

#### [T1.1] Scaffold server
- **File baru:** `server/package.json`, `server/tsconfig.json`, `server/src/index.ts`, `server/.env.example`, `server/.gitignore`.
- **Stack wajib:** Node.js 22+, Express 5, TypeScript, `better-sqlite3` (SQLite untuk demo), `zod` (validasi request), `multer` (upload), `express-session` + `connect-sqlite3` (sesi admin), `bcrypt` (password admin).
- **Langkah:** server di port `3001`; health check `GET /api/health` → `{ ok: true }`. Tambah proxy di `web/vite.config.ts`: `/api` → `http://localhost:3001`. Script: `dev` (tsx watch), `build`, `start`.
- **Selesai bila:** `npm run dev` di `server/` hidup; `curl http://localhost:3001/api/health` OK; `npm run dev` di `web/` mem-proxy `/api` tanpa CORS.
- **Verifikasi:** kedua server jalan bersamaan; buka aplikasi web, tidak ada error console.

#### [T1.2] Skema database
- **File baru:** `server/src/db.ts`, `server/src/schema.sql`.
- **Tabel minimum:** `tickets`, `ticket_evidence`, `ticket_messages`, `ticket_timeline`, `internal_notes`, `admins`, `audit_log`, `master_units`, `master_categories`.
- **Kolom mengikuti `web/src/lib/types.ts`** persis (nama field camelCase di API; snake_case di DB boleh, map di layer query).
- **Aturan:** `audit_log` append-only (tidak ada UPDATE/DELETE); `pin_hash` tidak pernah dikirim ke client; `status` pakai CHECK constraint 7 nilai.
- **Selesai bila:** DB otomatis dibuat saat server start; seed admin & 8 tiket demo dimuat sekali (idempoten — jangan duplikat saat restart).
- **Verifikasi:** hapus file DB, restart → data seed kembali; restart lagi → tidak dobel.

#### [T1.3] Auth admin
- **File baru:** `server/src/routes/auth.ts`, `server/src/middleware/auth.ts`.
- **Langkah:** `POST /api/admin/login` (zod), verifikasi bcrypt, set cookie sesi `httpOnly`, `SameSite=Lax`, `secure` hanya di produksi. `POST /api/admin/logout`. Middleware `requireAuth` dan `requireRole('super_admin')`.
- **Selesai bila:** kredensial demo bekerja; cookie tidak terbaca JavaScript; endpoint admin menolak 401 tanpa sesi dan 403 untuk role salah.
- **Verifikasi:** uji via curl + browser; cek tab Application → Cookies.

#### [T1.4] Endpoint publik
- **File baru:** `server/src/routes/public.ts`.
- **Endpoint:** `GET /api/categories`, `POST /api/reports`, `POST /api/tickets/check`, `GET /api/tickets/:number`, `POST /api/tickets/:number/replies`, `GET /api/transparency`.
- **Aturan:**
  - `POST /api/reports`: validasi `ReportFields` + metadata bukti; hasilkan nomor tiket & PIN di server; **PIN dikembalikan sekali**; hash PIN sebelum simpan; status awal `Diterima` + timeline.
  - `POST /api/tickets/check`: rate-limit (mis. 10 percobaan/menit/IP), pesan gagal generik. Sukses → set cookie sesi tiket (berlaku 30 menit) agar `GET /api/tickets/:number` dan download bukti terautentikasi tanpa mengirim PIN berulang.
  - `POST .../replies`: hanya untuk tiket dengan status `Perlu Dilengkapi`? **Tidak wajib** — pelapor boleh membalas kapan saja; tetap tambah pesan + bukti + timeline "Balasan diterima" + "Menunggu pemeriksaan admin" (hapus entri `waiter` lama).
- **Selesai bila:** alur pelapor penuh berfungsi dari UI tanpa `sessionStorage` untuk data tiket.
- **Verifikasi:** buat laporan baru, tutup browser, buka lagi, cek tiket dengan nomor+PIN → data masih ada.

#### [T1.5] Endpoint admin
- **File baru:** `server/src/routes/admin.ts`.
- **Endpoint:** `GET /api/admin/tickets` (filter status/kategori/search; exclude `Selesai`/`Ditolak`), `GET /api/admin/tickets/:number` (+ tulis audit `REPORT_VIEWED`), `PATCH /api/admin/tickets/:number/status`, `GET /api/admin/audit`, `GET /api/admin/master`.
- **Aturan transisi:** validasi `allowedTransitions` **di server** (tolak 409 jika ilegal); `note` wajib; `Selesai` wajib `resultSummary`; `Diteruskan` wajib `unit`; tulis timeline + internal note + audit `STATUS_CHANGED` dalam satu transaksi DB.
- **Selesai bila:** semua halaman admin berfungsi lewat API; transisi ilegal ditolak; audit bertambah.
- **Verifikasi:** uji semua cabang status dari UI; uji PATCH ilegal via curl → 409.

#### [T1.6] Upload bukti ke server
- **File baru:** `server/src/routes/uploads.ts` (atau gabung public/admin), folder `server/uploads/` (gitignored).
- **Langkah:** `multer` diskStorage, nama file acak (`crypto.randomUUID()` + ekstensi), validasi MIME + ukuran + jumlah **di server**, simpan metadata ke `ticket_evidence`. Download: `GET /api/tickets/:number/evidence/:id` — wajib cookie sesi tiket ATAU sesi admin.
- **Selesai bila:** upload dari UI tersimpan di server; file tidak bisa diakses tanpa autentikasi; batas 5 file/10 MB/tipe file ditegakkan server.
- **Verifikasi:** uji file >10 MB, tipe `.exe`, file ke-6 → ditolak dengan pesan jelas.

#### [T1.7] Ganti `api.ts` ke `fetch`
- **File:** `web/src/lib/api.ts` (dan hapus pemakaian `mock-db` dari sana), `web/src/lib/mock-db.ts` boleh dihapus **hanya setelah** semua halaman berjalan dengan API.
- **Langkah:** pertahankan **nama & signature fungsi** (`api.*`, `adminApi.*`) agar halaman tidak berubah. Tangani error jaringan dengan tipe hasil yang sudah ada (`null` untuk not found). Draft tetap di browser.
- **Selesai bila:** `grep -r "mock-db" web/src` → tidak ada pemakaian dari `api.ts`; semua 22 rute berfungsi dengan server hidup.
- **Verifikasi:** matikan server → UI menampilkan pesan error yang wajar, bukan crash; nyalakan lagi → normal.

#### [T1.8] Seed & migrasi data demo
- **File:** `server/src/seed.ts` (atau `seed.sql`).
- **Langkah:** pindahkan 8 tiket demo + 2 admin + seed audit dari `web/src/lib/mock-data.ts`. Hash password admin dengan bcrypt. PIN demo **tetap sama** (lihat bagian 9) agar dokumentasi & juri mudah menguji.
- **Selesai bila:** semua tiket demo bisa dicek dengan nomor+PIN dari README; admin demo bisa login.
- **Verifikasi:** uji 3 tiket berbeda status + kedua admin.

**Definisi selesai Fase 1:** data bertahan setelah restart server & browser; dua browser berbeda melihat data yang sama; `npm run lint` + `npm run build` di `web/` tetap hijau; README diperbarui (cara menjalankan server + endpoint).

---

### FASE 2 — Panel Admin Fungsional Nyata (saran juri #2)

#### [T2.1] Verifikasi alur transisi end-to-end
- **File:** `AdminVerifikasi.tsx`, `AdminLengkapi.tsx`, `AdminTolak.tsx`, `AdminTeruskan.tsx`, `AdminTindakan.tsx`, `AdminSelesai.tsx`.
- **Langkah:** pastikan setiap halaman mengirim `note`/`internal`/`extra` yang diwajibkan dan menampilkan error server (409/400) dengan jelas. Semua perubahan terlihat di halaman pelapor (timeline + pesan).
- **Selesai bila:** 6 cabang transisi berhasil diuji dari UI dan persist di DB; tiket `Selesai` menampilkan `resultSummary` + file hasil ke pelapor.
- **Verifikasi:** skenario penuh: tiket `Diterima` → `Diverifikasi` → `Diteruskan` (pilih unit) → `Ditindaklanjuti` → `Selesai` (isi ringkasan); cek dari sisi pelapor.

#### [T2.2] Pesan dua arah nyata
- **File:** `AdminDetail.tsx` (panel pesan), `web/src/lib/api.ts` (tambah `adminApi.sendMessage` bila belum ada), `server/src/routes/admin.ts`.
- **Langkah:** tambah endpoint `POST /api/admin/tickets/:number/messages` (author `admin`) + tampilkan riwayat di `AdminDetail` dan `Tiket` pelapor. Jangan tampilkan identitas pelapor (tidak ada datanya — jangan tambahkan).
- **Selesai bila:** pesan admin muncul di halaman pelapor setelah refresh; pesan pelapor muncul di detail admin.
- **Verifikasi:** uji dua arah dari dua browser.

#### [T2.3] Master data CRUD
- **File:** `AdminMaster.tsx`, `server/src/routes/admin.ts`, skema DB.
- **Langkah:** CRUD kategori & unit (tambah/edit/nonaktifkan). Admin list minimal read-only. Validasi: nama wajib, tidak duplikat; unit nonaktif tidak bisa dipilih di `AdminTeruskan`.
- **Selesai bila:** perubahan master data persist dan langsung memengaruhi form terkait.
- **Verifikasi:** tambah kategori → muncul di form Lapor; nonaktifkan unit → hilang dari pilihan teruskan.

#### [T2.4] Penegakan peran di server
- **File:** `server/src/middleware/auth.ts`, `server/src/routes/admin.ts`.
- **Langkah:** `/api/admin/audit` dan `/api/admin/master/*` hanya `super_admin`; endpoint transisi & antrean untuk kedua role. Sembunyikan menu di UI berdasarkan role (sudah ada di `RequireAdmin`).
- **Selesai bila:** verifikator mendapat 403 saat memanggil endpoint super admin (uji via curl), dan menu audit/master tidak muncul untuknya.
- **Verifikasi:** login kedua role, bandingkan akses.

#### [T2.5] Audit log server-side append-only
- **File:** `server/src/db.ts` (constraint/trigger), `server/src/routes/*`.
- **Langkah:** catat `LOGIN`, `LOGOUT` (opsional), `REPORT_VIEWED`, `STATUS_CHANGED`, `MASTER_CHANGED`. Tidak ada endpoint edit/hapus. Tampilkan di `AdminAudit` (sudah ada).
- **Selesai bila:** setiap aksi admin tercatat dengan aktor, waktu, detail; tabel tidak bisa diubah lewat API.
- **Verifikasi:** lakukan 5 aksi berbeda → 5 entri baru; coba DELETE via curl → 404/405.

**Definisi selesai Fase 2:** semua fitur admin di `Design brief.md` beroperasi nyata terhadap DB; tidak ada lagi data yang hilang saat browser ditutup.

---

### FASE 3 — Keamanan & Anonimitas (saran juri #3)

> **PENTING — keputusan desain:** PIN 6 digit hanya punya ~10^6 kemungkinan; **tidak cukup** sebagai satu-satunya sumber kunci enkripsi (bisa brute-force offline). **Keputusan yang direkomendasikan:** tambahkan **kunci pemulihan acak 128-bit** yang ditampilkan SEKALI di `/terkirim` bersama PIN. PIN tetap untuk lookup tiket; kunci pemulihan untuk mendekripsi isi. Dokumentasikan trade-off ini di `docs/threat-model.md`.

#### [T3.1] Dokumen threat model
- **File baru:** `web/docs/threat-model.md` (atau `docs/` di root).
- **Isi minimum:** aset yang dilindungi (isi laporan, bukti, identitas pelapor), aktor ancaman (admin nakal, operator server, penyusup DB), jaminan yang diberikan vs tidak, batasan PIN 6 digit, kebijakan retensi & log, catatan bahwa perlindungan hukum butuh kebijakan resmi.
- **Selesai bila:** dokumen menjelaskan dengan jujur apa yang terlindungi dan apa yang tidak.

#### [T3.2] Kriptografi sisi klien
- **File baru:** `web/src/lib/crypto.ts`.
- **Langkah:**
  1. Saat membuat laporan: client membuat **data key** acak 256-bit (`crypto.getRandomValues`).
  2. Data key dibungkus (wrap) dengan **KEK** turunan dari kunci pemulihan 128-bit + salt acak per tiket (PBKDF2-SHA256, ≥ 310.000 iterasi).
  3. Enkripsi `title`, `chronology`, `location`, `involvedParty`, `messages`, dan **file bukti** dengan AES-GCM 256.
  4. Kirim ke server: ciphertext + IV + wrapped key + salt + `pinHash` (atau verifier). Server **tidak pernah** menerima plaintext.
  5. Saat cek tiket: client memasukkan nomor + PIN (lookup) + kunci pemulihan (dekripsi). Jika kunci hilang → data tidak bisa dipulihkan; tampilkan peringatan jelas sejak awal.
- **Selesai bila:** inspeksi payload jaringan (DevTools → Network) tidak pernah berisi plaintext laporan; DB hanya berisi ciphertext.
- **Verifikasi:** buat laporan, buka DB langsung (sqlite) → isi tidak terbaca; cek tiket dari browser lain dengan nomor+PIN+kunci → terbaca.

#### [T3.3] Enkripsi bukti & metadata minimal
- **File:** `web/src/lib/upload.ts`, `web/src/lib/crypto.ts`, `server/src/routes/uploads.ts`.
- **Langkah:** enkripsi file di browser sebelum upload; nama file asli **tidak** dikirim (simpan nama terenkripsi atau nama acak); server menyimpan blob terenkripsi. Untuk gambar, pertimbangkan re-encode via canvas untuk membuang EXIF (catat batasannya untuk PDF).
- **Selesai bila:** server tidak menyimpan nama file asli/EXIF; file hanya bisa dibuka setelah dekripsi di client.

#### [T3.4] Berbagi akses ke admin (eksplisit)
- **File:** `web/src/pages/Tiket.tsx` (tombol "Izinkan admin membaca"), `server/src/routes/admin.ts`, `web/src/lib/crypto.ts`.
- **Langkah:** admin memiliki pasangan kunci (public/private) yang dibuat saat provisioning; pelapor dapat membungkus data key dengan public key admin (RSA-OAEP atau X25519+HKDF via WebCrypto). Tanpa izin pelapor, admin hanya melihat metadata status — bukan isi.
- **Selesai bila:** admin tidak bisa membaca isi sebelum pelapor memberi izin; setelah izin, isi terbaca dan aksi tercatat di audit.
- **Verifikasi:** uji dua kondisi (belum izin vs sudah izin) dari akun admin.

#### [T3.5] Hardening metadata & log
- **Langkah:** jangan log IP mentah; jika perlu statistik, simpan hash IP + salt harian. Jangan log body request. Pastikan cookie sesi `httpOnly` + `SameSite`. Tambah rate-limit pada login & check tiket.
- **Selesai bila:** grep log server tidak berisi isi laporan/PIN/IP mentah.

#### [T3.6] README jujur soal keamanan
- **File:** `web/README.md`.
- **Langkah:** bagian "Keamanan & batasan": apa yang dijamin (server tidak bisa baca isi, PIN tidak disimpan plaintext), apa yang tidak (perangkat pelapor bisa disadap, PIN lemah tanpa kunci pemulihan, bukan jaminan hukum).
- **Selesai bila:** tidak ada klaim berlebihan; juri melihat kejujuran teknis (ini dinilai positif).

**Definisi selesai Fase 3:** server & DB hanya menyimpan ciphertext untuk konten laporan; alur izin admin berfungsi; threat model terdokumentasi; build & lint tetap hijau.

---

## 8. Protokol Verifikasi (wajib setiap task)

1. `cd web && npm run lint` → **0 warning**.
2. `cd web && npm run build` → **sukses**.
3. Uji manual alur yang tersentuh task (jangan hanya percaya build).
4. Commit kecil: `feat(web): ...` / `fix(web): ...` / `docs: ...`.
5. Jika Fase ≥ 1: jalankan `server/` + `web/`, uji dari **dua browser berbeda**.
6. Perbarui checklist progress di `web/README.md` setelah fase selesai.

---

## 9. Data Demo untuk Pengujian

**Admin:**

| Email | Password | Role |
|---|---|---|
| `verifikator@contoh.invalid` | `verif-admin` | verifikator |
| `pengelola@contoh.invalid` | `super-admin` | super_admin |

**Tiket seed (nomor / PIN / status):**

| Nomor | PIN | Status |
|---|---|---|
| `SIAP-DEMO-7K4M9` | `482619` | Perlu Dilengkapi |
| `SIAP-DEMO-2Q6R8` | `730215` | Selesai |
| `SIAP-FL-K8N3R` | `901234` | Diterima |
| `SIAP-FL-P4W7Q` | `567890` | Diterima |
| `SIAP-FL-M9V2T` | `345678` | Perlu Dilengkapi |
| `SIAP-FL-B6D8L` | `234567` | Ditolak |
| `SIAP-FL-R3H5Y` | `123456` | Diteruskan |
| `SIAP-FL-T7J2N` | `890123` | Ditindaklanjuti |

Catatan: semua data adalah **contoh/simulasi**, bukan laporan nyata. Jangan menambahkan data pribadi sungguhan.

---

## 10. Checklist Akhir Sebelum Submission Berikutnya

- [ ] Fase 0 selesai 100% (README, sitemap, screenshot, grafik, badge, loading, lint, responsif, validasi form)
- [ ] `npm run lint` 0 warning; `npm run build` sukses
- [ ] Semua 22 rute diuji di desktop & 390px
- [ ] Alur pelapor penuh diuji (lapor → tiket → cek → balas)
- [ ] Alur admin penuh diuji (login → antrean → 6 cabang transisi)
- [ ] Fase 1–3 sesuai prioritas yang disepakati; progress dicatat di README
- [ ] Screenshot baru landing + 1 halaman unggulan diperbarui
- [ ] Tidak ada file rahasia (`.env`, DB, upload) ikut ter-commit

---

## 11. Log Implementasi

### ✅ Fase 0 — 9 November 2026 (branch `mikaelPunyaBranch`)

**File yang diubah/ditambah:**

| File | Perubahan |
| --- | --- |
| `web/README.md` | Ditulis ulang total: deskripsi, fitur, tech stack, cara run, kredensial demo, sitemap Mermaid, alur status, keterlacakan PRD, screenshot, progress, batasan |
| `web/docs/desktop-preview.png`, `mobile-preview.png` | Screenshot pratinjau disalin dari artefak desain |
| `web/src/styles.css` | Badge status, skeleton shimmer, empty state, field error, chart bar/sparkline, steps landing, footer, navigasi mobile |
| `web/src/components/StatusBadge.tsx` | **Baru** — badge status konsisten untuk 7 status |
| `web/src/components/Feedback.tsx` | **Baru** — `Skeleton` dan `EmptyState` |
| `web/src/components/Page.tsx` | `Page` menerima `badge`; `Card` menerima judul berupa elemen |
| `web/src/components/Field.tsx` | Dukungan `error` inline + `role="alert"` |
| `web/src/components/Layout.tsx` | Footer baru: disclaimer + tautan panduan/transparansi/cek status |
| `web/src/pages/Home.tsx` | Bagian "cara kerja" 3 langkah |
| `web/src/pages/Lapor.tsx` | Validasi inline per field + skeleton |
| `web/src/pages/Bukti.tsx`, `Tinjau.tsx` | Skeleton menggantikan layar kosong |
| `web/src/pages/Transparansi.tsx` | Bar chart per kategori + sparkline tren (SVG native) |
| `web/src/pages/Tiket.tsx` | Badge status + skeleton |
| `web/src/pages/Balas.tsx` | Perbaikan bug: halaman tidak lagi redirect sebelum data selesai dimuat; skeleton |
| `web/src/pages/AdminQueue.tsx` | Badge status, skeleton, empty state |
| `web/src/pages/AdminDetail.tsx` | Perbaikan lint `set-state-in-effect`, skeleton, badge status |
| `web/src/pages/AdminAudit.tsx` | Skeleton + empty state |
| `web/src/lib/types.ts`, `mock-data.ts` | Data terstruktur `perKategoriData` & `trenData` untuk grafik |

**Hasil verifikasi:**
- ✅ `npm run lint` — **0 warning**
- ✅ `npm run build` — sukses (tsc + vite)
- ✅ 22 rute diuji pada viewport **390×844** — `scrollWidth = 390` di semua rute (0 overflow horizontal)
- ✅ Smoke test render: beranda, lapor, transparansi, cek, petugas — konten tampil, tanpa error
- ✅ Alur admin: login verifikator → antrean (6 kartu, 6 badge) → detail (badge `Perlu Dilengkapi`) → login super admin → audit (4 entri)
- ✅ Validasi inline Lapor: submit kosong menampilkan **6 pesan error** per field

**Catatan untuk AI berikutnya:** Fase 0 tidak mengubah arsitektur data. `api.ts` masih memakai `mock-db.ts` + `sessionStorage`; pekerjaan backend dimulai di Fase 1 sesuai urutan di atas.
