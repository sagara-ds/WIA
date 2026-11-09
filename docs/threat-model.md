# Threat Model — SIAP (Sistem Informasi Aduan Publik)

Prototipe lomba (First Draft Submission). Seluruh data contoh, tidak menerima laporan sungguhan.
Dokumen ini menjelaskan dengan jujur apa yang dilindungi dan apa yang tidak.

## 1. Aset yang dilindungi
- Isi laporan: `title`, `chronology`, `location`, `involvedParty`
- Balasan pelapor (`ticket_messages` dengan `is_enc`)
- File bukti (blob terenkripsi di `server/uploads/`)
- Identitas pelapor: tidak pernah diminta (form anonim tidak meminta nama/email/telepon)

## 2. Aktor ancaman
- Operator server/DB yang penasaran atau menyalahgunakan akses baca DB
- Penyusup yang membobol DB SQLite atau file upload
- Admin yang membaca isi tanpa izin pelapor
- Brute-force offline terhadap PIN 6 digit dan kunci pemulihan

## 3. Mekanisme & jaminan teknis
Keputusan desain: PIN 6 digit (≈10^6 kemungkinan) **tidak cukup** sebagai kunci enkripsi,
karena mudah brute-force offline. Ini jaminan yang diberikan:

- Kunci pemulihan acak 128-bit ditampilkan **sekali** di `/terkirim` bersama nomor tiket + PIN.
  PIN untuk lookup tiket; kunci pemulihan untuk dekripsi isi.
- Data key acak 256-bit per tiket (`crypto.getRandomValues`), dibungkus (wrap) dengan KEK
  turunan kunci pemulihan + salt acak per tiket (PBKDF2-SHA256, 310.000 iterasi).
- Enkripsi AES-GCM-256 di sisi klien (`web/src/lib/crypto.ts`) untuk isi + balasan + bukti.
  Server hanya menerima dan menyimpan ciphertext + IV + wrapped key + salt + `pinHash`.
  Server **tidak pernah** menerima plaintext isi/bukti.
- PIN disimpan sebagai hash PBKDF2-SHA256 150.000 iterasi, salt 16 byte (`saltHex$hashHex`).
  Password admin pakai bcrypt.
- Sesi admin `httpOnly` + `SameSite=Lax`; sesi tiket 30 menit, berlaku untuk GET tiket dan
  download bukti. Pesan gagal PIN bersifat generik ("Tiket atau PIN tidak ditemukan").
- Berbagi akses eksplisit: admin punya pasangan kunci RSA-OAEP 4096 (privat di browser admin,
  publik di server). Pelapor membungkus data key dengan public key admin **hanya setelah**
  menekan "Izinkan admin membaca". Tanpa izin, admin hanya melihat metadata status.
- Audit log append-only (`audit_log` tanpa UPDATE/DELETE endpoint), rate-limit login & check
  tiket (10/menit/IP, in-memory), header `nosniff`/frame deny, tidak log IP mentah/body.

## 4. Yang TIDAK dijamin
- Perangkat pelapor bisa disadap (malware, shoulder-surfing) — enkripsi end-to-end tidak
  melindungi endpoint yang sudah terkompromi.
- Jika kunci pemulihan hilang, isi tidak dapat dipulihkan. Tidak ada jalur pemulihan via
  email/telepon karena formulir anonim.
- PIN lemah: tanpa kunci pemulihan, lookup tetap mungkin, tetapi isi tetap terenkripsi.
- Metadata (kategori, status, waktu) disimpan plaintext untuk agregasi transparansi & antrean —
  tidak dienkripsi. Ini bocor informasi kasar (mis. jumlah laporan per kategori).
- Nama file asli bukti disimpan di DB `ticket_evidence.name` untuk UX; isi file terenkripsi,
  EXIF tidak dibersihkan untuk PDF (limitasi tercatat).
- Ini klaim **teknis-demonstratif**, bukan jaminan hukum. Perlindungan hukum butuh kebijakan resmi,
  audit keamanan profesional, dan pemrosesan data yang sah.

## 5. Retensi & log
- DB SQLite lokal (`server/data/`, gitignored), upload di `server/uploads/` (gitignored).
- Log server tidak mencatat IP mentah, body request, PIN, atau isi laporan.
- Sesi tiket berakhir 30 menit; sesi admin mengikuti cookie server.

## 6. Kerentanan diketahui (demo)
- Rate-limit in-memory hilang saat restart; belum booting multi-instance.
- Kunci RSA admin demo disimpan di `localStorage` browser admin (untuk simulasi) — di produksi
  harus di HSM/keychain + provisioning resmi.
- Rekey/rotasi data key belum diimplementasikan.
