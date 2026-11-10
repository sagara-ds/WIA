# SIAP — Sistem Informasi Aduan Publik

> **Sistem pelaporan dugaan penyimpangan secara anonim dengan backend nyata.**
> Pelapor mengirim laporan tanpa identitas, menerima **kode tiket + PIN 6 digit**, lalu memantau penanganan sampai selesai. Petugas memproses laporan melalui antrean dan transisi status yang tercatat di database.

**Status:** Prototipe lomba (backend SQLite aktif) · **Seluruh data adalah contoh** · Tidak menerima laporan sungguhan.

![Pratinjau desktop](assets/desktop-preview.png)

---

## Daftar Isi

1. [Latar Belakang & Tujuan](#latar-belakang--tujuan)
2. [Fitur Utama](#fitur-utama)
3. [Tech Stack](#tech-stack)
4. [Cara Menjalankan](#cara-menjalankan)
5. [Akun & Tiket Demo](#akun--tiket-demo)
6. [Struktur Folder](#struktur-folder)
7. [Sitemap](#sitemap)
8. [Alur Status](#alur-status)
9. [Keterlacakan PRD](#keterlacakan-prd)
10. [Screenshot](#screenshot)
11. [Desain & Wireframe](#desain--wireframe)
12. [Status & Progress](#status--progress)
13. [Keamanan & Batasan](#keamanan--batasan)

---

## Latar Belakang & Tujuan

Pelaporan dugaan penyimpangan sering terhambat rasa takut terhadap pembalasan. SIAP dirancang sebagai ruang aman untuk bersuara:

- **Anonim sejak awal** — formulir tidak meminta nama, email, atau nomor telepon.
- **Akses pribadi berbasis tiket + PIN** — pelapor memegang kendali atas tiketnya tanpa membuat akun.
- **Tindak lanjut yang terlihat** — status, pesan admin, permintaan kelengkapan, dan ringkasan hasil dapat dibaca pelapor.
- **Transparansi publik** — dashboard agregat menampilkan tren penanganan tanpa membuka isi aduan.

Tujuan prototipe: mendemonstrasikan alur pelaporan anonim ujung-ke-ujung (pelapor, petugas, super admin, publik) sebagai dasar pengembangan sistem produksi.

---

## Fitur Utama

### Untuk pelapor
- Formulir laporan **3 langkah**: kejadian → bukti → tinjau.
- Unggah bukti JPG/PNG/PDF (maksimal 5 berkas, 10 MB per berkas).
- Penerbitan **kode tiket + PIN** (ditampilkan sekali) dan peringatan penyimpanan.
- Cek status dengan tiket + PIN, termasuk linimasa penanganan.
- Balas permintaan admin dengan pesan dan bukti tambahan.
- Membaca ringkasan hasil dan dokumen hasil saat tiket selesai.

### Untuk petugas (verifikator)
- Login petugas dengan peran `verifikator`.
- Antrean laporan dengan filter status, kategori, dan pencarian.
- Detail laporan + catatan internal.
- Transisi status: **verifikasi, minta dilengkapi, tolak, teruskan, tindak lanjut, selesai** — semuanya wajib beralasan dan tercatat.

### Untuk super admin
- Semua kemampuan verifikator.
- **Audit log** akses dan keputusan (hanya-baca).
- **Master data**: kategori, unit tujuan, dan akun petugas.

### Untuk publik
- Dashboard transparansi: statistik agregat, laporan per kategori, dan tren laporan masuk.
- Panduan & privasi.

---

## Tech Stack

| Lapisan                 | Teknologi                                        |
| ----------------------- | ------------------------------------------------ |
| UI                      | React 19 + TypeScript                            |
| Build                   | Vite 8                                           |
| Routing                 | React Router 8                                   |
| Styling                 | Tailwind CSS 4 + CSS design token kustom         |
| Lint                    | Oxlint                                           |
| Font                    | Inter Variable (`@fontsource-variable/inter`)    |
| Backend                 | Express 5 + TypeScript (`tsx` dev server)        |
| Database                | SQLite (`better-sqlite3`) — otomatis dibuat saat server start |
| Sesi                    | Cookie `httpOnly` + store SQLite (`express-session`) |
| Validasi server         | Zod                                              |
| Upload bukti            | Multer (disk storage, nama acak)                 |

---

## Cara Menjalankan

Prasyarat: **Node.js LTS terbaru (22+)** dan npm.

Jalankan **dua terminal** — backend dan frontend:

```bash
# Terminal 1 — server (port 3001)
cd server
npm install
npm run dev

# Terminal 2 — web (port 5173)
cd web
npm install
npm run dev        # http://localhost:5173
```

Perintah lain:

```bash
cd web
npm run lint       # oxlint
npm run build      # tsc -b && vite build
npm run preview    # menyajikan hasil build

cd server
npm run build      # tsc -p tsconfig.json
```

> Database (`server/data/siap.db`) dan sesi dibuat **otomatis** saat server start, termasuk seed data demo (idempoten — restart tidak menduplikasi). Vite mem-proxy `/api` ke `http://localhost:3001`, tanpa CORS.

---

## Akun & Tiket Demo

### Akun petugas

| Email                        | Kata sandi    | Peran       |
| ---------------------------- | ------------- | ----------- |
| `verifikator@contoh.invalid` | `verif-admin` | verifikator |
| `pengelola@contoh.invalid`   | `super-admin` | super_admin |

Akses panel petugas melalui tautan **“Akses petugas →”** di footer atau langsung ke `/petugas`.

### Tiket contoh

| Kode tiket        | PIN      | Status           |
| ----------------- | -------- | ---------------- |
| `SIAP-DEMO-7K4M9` | `482619` | Perlu Dilengkapi |
| `SIAP-DEMO-2Q6R8` | `730215` | Selesai          |
| `SIAP-FL-K8N3R`   | `901234` | Diterima         |
| `SIAP-FL-P4W7Q`   | `567890` | Diterima         |
| `SIAP-FL-M9V2T`   | `345678` | Perlu Dilengkapi |
| `SIAP-FL-B6D8L`   | `234567` | Ditolak          |
| `SIAP-FL-R3H5Y`   | `123456` | Diteruskan       |
| `SIAP-FL-T7J2N`   | `890123` | Ditindaklanjuti  |

Semua tiket, nama unit, dan percakapan adalah **data contoh** untuk simulasi.

---

## Struktur Folder

```
server/                       # backend (Express 5 + SQLite)
├── src/
│   ├── index.ts              # app + sesi + mount route + proxy target
│   ├── db.ts                 # init DB, skema, seed demo idempoten
│   ├── session-store.ts      # session store di atas better-sqlite3
│   ├── tickets.ts            # assembler view tiket + transisi legal
│   ├── middleware/           # requireAuth, requireRole, rate-limit
│   └── routes/               # auth, public, admin, uploads
├── data/                     # siap.db (gitignored, dibuat otomatis)
└── uploads/                  # berkas bukti (gitignored)

web/                          # frontend (React 19 + Vite 8)
├── src/
│   ├── App.tsx               # definisi 22 rute
│   ├── main.tsx
│   ├── styles.css            # design token & komponen CSS
│   ├── components/           # Page, Card, Field, StatusBadge, Feedback, dll.
│   ├── lib/
│   │   ├── types.ts          # tipe domain + konstanta validasi
│   │   ├── api.ts            # lapisan REST (api & adminApi) — fetch + cookie
│   │   ├── mock-data.ts      # kredensial/seed demo untuk tampilan
│   │   ├── format.ts         # format tanggal & ukuran Indonesia
│   │   └── upload.ts         # konstanta validasi berkas
│   └── pages/                # 22 halaman publik, petugas, super admin
├── index.html
├── package.json
└── vite.config.ts            # proxy /api -> localhost:3001
```

---

## Sitemap

```mermaid
flowchart TD
  subgraph Publik
    A[Beranda /] --> B[Lapor /lapor]
    B --> C[Bukti /bukti]
    C --> D[Tinjau /tinjau]
    D --> E[Terkirim /terkirim]
    A --> F[Cek status /cek]
    F --> G[Tiket /tiket]
    G --> H[Balas /tiket/balas]
    H --> I[Balas terkirim /tiket/balas-terkirim]
    A --> T[Transparansi /transparansi]
    A --> P[Panduan /panduan]
  end
  subgraph Petugas
    L[Login /petugas] --> Q[Antrean /petugas/antrean]
    Q --> DET[Detail /petugas/detail]
    DET --> V[Verifikasi /petugas/verifikasi]
    DET --> LK[Minta dilengkapi /petugas/lengkapi]
    DET --> TL[Tolak /petugas/tolak]
    V --> TR[Teruskan /petugas/teruskan]
    TR --> TA[Tindak lanjut /petugas/tindakan]
    TA --> S[Selesai /petugas/selesai]
  end
  subgraph Super Admin
    AU[Audit log /petugas/audit]
    MA[Master data /petugas/master]
  end
```

---

## Alur Status

```mermaid
stateDiagram-v2
  [*] --> Diterima
  Diterima --> Diverifikasi
  Diterima --> PerluDilengkapi
  Diterima --> Ditolak
  PerluDilengkapi --> Diverifikasi
  PerluDilengkapi --> Ditolak
  Diverifikasi --> Diteruskan
  Diteruskan --> Ditindaklanjuti
  Ditindaklanjuti --> Selesai
  Selesai --> [*]
  Ditolak --> [*]
  state "Perlu Dilengkapi" as PerluDilengkapi
  state "Ditindaklanjuti" as Ditindaklanjuti
```

Catatan: balasan pelapor **tidak otomatis** mengubah status. Tiket tetap `Perlu Dilengkapi` sampai admin memeriksa ulang.

---

## Keterlacakan PRD

| Kebutuhan | Layar                                                  |
| --------- | ------------------------------------------------------ |
| F-01–F-06 | `lapor`, `bukti`, `tinjau`, `terkirim`                 |
| F-09–F-12 | `cek`, `tiket`, `balas`, `balas-terkirim`              |
| F-13–F-17 | `petugas` (login), `antrean`, `detail`, `verifikasi`,  |
|           | `lengkapi`, `tolak`, `teruskan`, `tindakan`, `selesai` |
| F-18      | `petugas/audit`                                        |
| F-19      | `petugas/master` (ringkasan; CRUD belum dirinci)       |
| F-20–F-23 | `transparansi`                                         |
| F-07–F-08 | Ditunda: identitas terverifikasi dan peta              |

---

## Screenshot

Desktop : ![Pratinjau desktop](assets/desktop-preview.png)
Mobile  : ![Pratinjau mobile](assets/mobile-preview.png)

Screenshot merupakan pratinjau rancangan (mock-up) dari file desain SIAP.

---

## Desain & Wireframe

Rancangan antarmuka lengkap (wireframe, mock-up, dan prototype interaktif) tersedia di Figma:

- [Wireframe desktop](https://www.figma.com/design/I6y3NdiGXwkWVwcahYevbo/SIAP?node-id=8-4668)
- [Mock-up desktop](https://www.figma.com/design/I6y3NdiGXwkWVwcahYevbo/SIAP?node-id=9-3)
- [Prototype desktop](https://www.figma.com/proto/I6y3NdiGXwkWVwcahYevbo/SIAP?node-id=9-3&starting-point-node-id=9%3A3)
- [Prototype mobile](https://www.figma.com/proto/I6y3NdiGXwkWVwcahYevbo/SIAP?node-id=9-2296&starting-point-node-id=9%3A2296)

Rancangan mengikuti **PRD SIAP v1.0 (30 Oktober 2026)**: 28 layar dalam empat versi (wireframe/mock-up × desktop/mobile), total 112 frame.

---

## Status & Progress

### Fase 0 — Polesan submission ✅ (9 November 2026)
- [x] README lengkap (deskripsi, fitur, tech stack, cara run, kredensial, progress)
- [x] Sitemap Mermaid + tabel keterlacakan PRD
- [x] Screenshot desktop & mobile di `web/docs/`
- [x] Grafik transparansi (bar kategori + sparkline tren)
- [x] Badge status konsisten di seluruh halaman
- [x] Empty state & loading skeleton
- [x] Lint bersih (0 warning) & build hijau
- [x] Audit responsivitas 390 px + navigasi mobile
- [x] Validasi form inline di alur lapor

### Fase 1 — Backend & database nyata ✅ (10 November 2026)
- [x] Express 5 + SQLite (better-sqlite3) + Zod + Multer + sesi cookie httpOnly
- [x] Auth admin: bcrypt, sesi httpOnly di SQLite, middleware `requireAuth`/`requireRole`
- [x] Endpoint publik: kategori, buat laporan (nomor+PIN server-side), cek tiket (rate-limit + sesi 30 menit), balasan, transparansi
- [x] Endpoint admin: antrean (filter/search), detail + audit `REPORT_VIEWED`, transisi status tervalidasi (409 bila ilegal), audit log, master data
- [x] Upload bukti ke server: validasi MIME/ukuran/jumlah di server, unduhan terautentikasi
- [x] `api.ts` bermigrasi dari `sessionStorage` ke REST API (mock-db dihapus)
- [x] Seed demo idempoten: 8 tiket + 2 admin (PIN tetap sama)
- [x] Lint 0 warning & build hijau

### Fase 2 — Panel admin fungsional (rencana)
- [ ] Transisi status, pesan dua arah, master data CRUD di server
- [ ] Penegakan peran `verifikator` / `super_admin` di server
- [ ] Audit log server-side append-only

### Fase 3 — Keamanan & anonimitas ✅ (10 November 2026)
- [x] Threat model & dokumentasi batasan (`docs/threat-model.md`)
- [x] Enkripsi end-to-end isi laporan & balasan pelapor (AES-GCM-256 di sisi klien)
- [x] File bukti dienkripsi sebelum keluar dari browser; metadata MIME/ukuran divalidasi server
- [x] Kunci pemulihan acak 128-bit tampil sekali di `/terkirim` (PIN 6 digit tidak cukup)
- [x] Berbagi akses eksplisit ke admin (data key dibungkus public key RSA-OAEP)
- [x] Header keamanan + rate-limit per-jalur (reuse `middleware/ratelimit.ts`)
- [x] Lint 0 warning & build hijau

---

## Keamanan & Batasan

Ini adalah **prototipe lomba**, bukan sistem produksi:

- Backend aktif (Express + SQLite): data tiket bertahan setelah browser ditutup dan konsisten antar perangkat pada server yang sama.
- PIN di-hash **PBKDF2-SHA256 (150.000 iterasi, salt 16 byte)** di server; PIN asli hanya tampil sekali di `/terkirim` dan tidak pernah dikirim ulang.
- Sesi admin & sesi tiket memakai cookie **httpOnly + SameSite=Lax** (secure di produksi); tidak ada token di localStorage.
- Cek tiket di-rate-limit (10 percobaan/menit/IP) dengan pesan gagal generik yang tidak mengungkap keberadaan tiket.
- Transisi status divalidasi di server (409 bila ilegal); audit log append-only.
- Batas upload (5 berkas, 10 MB, JPG/PNG/PDF) ditegakkan **di server**; berkas bukti hanya dapat diunduh dengan sesi tiket atau sesi petugas.
- Isi laporan, balasan pelapor, dan file bukti **terenkripsi end-to-end** (AES-GCM-256) di sisi klien; server hanya menyimpan ciphertext + wrapped key + salt. Kunci pemulihan acak 128-bit tampil sekali di `/terkirim` — tanpa kunci ini isi tidak dapat dibuka (detail di `docs/threat-model.md`).
- Admin hanya dapat membaca isi bila pelapor secara eksplisit menekan "Izinkan admin membaca" (data key dibungkus dengan public key RSA-OAEP admin). Tanpa izin, admin hanya melihat status dan metadata. Kunci privat admin demo disimpan di `localStorage` browser admin (simulasi — produksi harus di HSM/keychain).
- Metadata tetap plaintext untuk kebutuhan antrean & agregasi: kategori, status, waktu, dan tanggal kejadian — ini bocor informasi kasar dan dicatat jujur di threat model.
- Header keamanan: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`. Rate-limit in-memory per-IP per-jalur: `/api/admin` 10/menit dan `/tickets/check` 10/menit.
- Pembatasan peran (`verifikator` / `super_admin`) dijaga di server pada auth; penegakan penuh per endpoint super admin menyusul di Fase 2.
- Dashboard transparansi masih menampilkan angka demo statis, bukan agregasi real-time.
- Data contoh tidak boleh diganti dengan data pribadi sungguhan.
- Klaim privasi pada prototipe ini bersifat **teknis-demonstratif**, bukan jaminan hukum.

---

## Disclaimer

SIAP adalah prototipe lomba. Seluruh nama unit, angka, tiket, bukti, dan percakapan merupakan **data contoh**. Aplikasi ini tidak menerima laporan nyata dan tidak mewakili instansi mana pun.
