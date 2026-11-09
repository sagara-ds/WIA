# Rencana Pengembangan SIAP — `rencanaMikael.md`

> Disusun dari hasil penilaian juri **First Draft Submission (FDS)**
> Skor: **41/45** · Rata-rata 4,56 · Target: **45/45**
> Tanggal: 2026-11-09 · Aplikasi: `web/` (React 19 + Vite + TypeScript + Tailwind 4)

---

## 1. Ringkasan Penilaian Juri

| Bagian | Aspek | Skor | Artinya |
|---|---|---|---|
| 1 | Relevansi ide terhadap tema & subtema | 5 | Konsep sepenuhnya menjawab transparansi & akuntabilitas |
| 1 | Latar belakang & tujuan | 5 | Masalah, tujuan, rencana fitur jelas |
| 1 | Keaslian & kreativitas | 5 | Ada kebaruan dalam menyajikan data publik |
| 2 | Kejelasan struktur (sitemap) & wireframe | **4** | Jelas & logis, belum maksimal |
| 2 | Kelengkapan repository & README.md | **4** | Ada README, belum lengkap |
| 2 | Ketepatan halaman wajib FDS | 5 | Screenshot landing + 1 halaman lain ✅ |
| 3 | Desain visual & layout | **4** | Proporsional, perlu polesan |
| 3 | Fungsionalitas, navigasi & responsivitas | **4** | Berjalan baik, "memadai" saja |
| 3 | Potensi dampak website | 5 | Potensi nyata untuk data publik |

**Catatan juri (Bagian 4):**
- ✅ **Pujian:** konsep SIAP eksekusinya matang, terstruktur, sangat aplikatif; formulir bertahap + tiket berbasis PIN = solusi efektif untuk privasi pelapor.
- 🗄️ **Saran 1:** *Integrasi backend & basis data nyata* — kembangkan server (mis. Node.js/Express + database relasional) agar tidak berhenti di demo lokal berbasis sesi browser.
- 🛡️ **Saran 2:** *Panel admin fungsional* — wujudkan rancangan Figma pada modul admin (verifikasi laporan, pesan dua arah, manajemen master data) untuk operasional nyata.
- 🔐 **Saran 3:** *Keamanan & anonimitas* — terapkan enkripsi end-to-end atau mekanisme zero-knowledge agar identitas pelapor anonim terlindungi secara hukum dan teknis di lingkungan produksi.

**Kesimpulan:** semua yang "konsep" = 5. Empat Aspek bernilai 4: (1) sitemap/wireframe, (2) README, (3) visual/layout, (4) fungsionalitas & responsivitas.

---

## 2. Temuan Teknis on Repo (per 2026-11-09)

- ✅ Build hijau: `tsc -b` tanpa error, `vite build ~2s`, 0 vulnerabilitas
- ⚠️ 1 lint warning: `set-state-in-effect` di `web/src/pages/AdminDetail.tsx`
- ⚠️ `web/README.md` masih **template bawaan Vite** — penyebab skor README 4
- ⚠️ Halaman Transparansi menampilkan statistik sebagai **paragraf teks**, belum grafik
- ✅ **Untung besar:** `web/src/lib/api.ts` sudah menjadi lapisan abstraksi — seluruh UI memanggil `api.*` / `adminApi.*`, bukan `mock-db` langsung → migrasi ke backend nyata = tukar implementasi dalam 1 file, UI tidak perlu rombak

---

## 3. Fase 0 — Polesan Skor Juri 4→5 ⚡ (prioritas pertama)

- [ ] Tulis ulang `web/README.md`: judul SIAP + deskripsi, latar belakang & tujuan, daftar fitur, tech stack, cara run (`npm install` → `npm run dev`), kredensial demo (`verifikator@contoh.invalid` / `verif-admin`, `pengelola@contoh.invalid` / `super-admin`), disclaimer prototipe
- [ ] Sitemap sebagai **diagram Mermaid** di README (GitHub render otomatis)
- [ ] Masukkan screenshot `desktop-preview.png` + `mobile-preview.png` dari `WIA/SIAP Design/`
- [ ] Tambah link wireframe/mockup/prototype Figma + tabel Keterlacakan PRD (F-01–F-23 → layar) dari `Design brief.md`
- [ ] Halaman Transparansi: ganti paragraf jadi grafik sederhana (bar per kategori + sparkline tren, SVG murni tanpa library baru)
- [ ] Badge status konsisten (warna tetap per status di semua halaman)
- [ ] Empty state & loading skeleton (antrean admin, cek tiket)
- [ ] Poles hero landing + footer global (tentang SIAP, disclaimer data contoh)
- [ ] Fix lint `set-state-in-effect` di `AdminDetail.tsx`
- [ ] Audit responsivitas semua 22 rute di viewport 390px (mobile), perbaiki overflow
- [ ] Validasi form inline di Lapor + focus states / aksesibilitas keyboard

**Kriteria selesai:** `oxlint` 0 warning, build hijau, README lengkap, semua rute aman di 390px.

---

## 4. Fase 1 — Backend Nyata 🗄️ (saran juri #1)

- [ ] Express (Node.js) + SQLite untuk demo / PostgreSQL untuk produksi
- [ ] Endpoint mengikuti `mock-db.ts` 1:1:
  - `POST /reports` (buat aduan + issue tiket/PIN)
  - `POST /tickets/check` (verifikasi nomor + PIN)
  - `GET /tickets/:number`, `POST /tickets/:number/replies`
  - `POST /admin/login`, `GET /admin/queue`, `GET /admin/tickets/:number`
  - `PATCH /admin/tickets/:number/status`, `GET /admin/audit`, master data CRUD
- [ ] Upload bukti ke server + metadata `EvidenceMeta`
- [ ] `api.ts` beralih ke `fetch` ke server — UI tidak berubah
- [ ] Sesi admin via cookie `httpOnly`

**Kriteria selesai:** data bertahan setelah restart browser/server; bisa diuji dari 2 browser berbeda.

---

## 5. Fase 2 — Panel Admin Beroperasi Nyata 🛡️ (saran juri #2)

- [ ] Transisi status (verifikasi / lengkapi / tolak / teruskan / tindakan / selesai) persist di DB dengan aturan `allowedTransitions` ditegakkan di server
- [ ] Pesan dua arah pelapor↔admin tersimpan di DB, muncul di Cek Tiket
- [ ] Master data CRUD nyata (kategori, unit, admin)
- [ ] Role `verifikator` vs `super_admin` ditegakkan di server, bukan hanya UI
- [ ] Audit log server-side **append-only**

---

## 6. Fase 3 — Keamanan & Anonimitas 🔐 (saran juri #3)

- [ ] Kunci enkripsi diturunkan **di browser** dari *nomor tiket + PIN* (WebCrypto HKDF)
- [ ] Konten laporan + bukti dienkripsi **AES-GCM sebelum dikirim** → server hanya menyimpan ciphertext, tidak bisa membaca isi
- [ ] Identitas pelapor tidak pernah dikirim; server tidak menyimpan IP mentah (hash + salt bila perlu statistik)
- [ ] Nama file bukti diacak di server; metadata diminimalkan
- [ ] Admin membaca isi laporan **hanya setelah pelapor membagikan kunci secara eksplisit** (kunci dibungkus public key admin saat pelapor mengizinkan)
- [ ] Dokumen *threat model* singkat + catatan bahwa aspek hukum memerlukan kebijakan privasi resmi
- [ ] Batas prototipe dinyatakan jujur di README (sudah jadi nilai plus di FDS)

---

## 7. Urutan & Strategi

1. **Fase 0 dulu** — termurah, langsung menaikkan skor submission berikutnya (README sendiri menaikkan 2 aspek).
2. **Fase 1** sebelum Fase 2/3 — admin fungsional dan keamanan sama-sama butuh backend nyata dulu.
3. **Jaga skor 5 jangan regresi:** setiap perubahan → `tsc -b` + `vite build` + `oxlint` harus tetap hijau; uji manual alur lapor → tiket → cek → balas → admin → selesai.
4. Sebelum submission final: update bagian **Progress** di README + screenshot ulang halaman terbaik.
