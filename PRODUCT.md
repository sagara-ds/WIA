# SIAP — Sistem Informasi Aduan Publik

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Masyarakat membuat laporan dugaan penyimpangan tanpa akun dan tanpa meminta nama atau kontak. Petugas memverifikasi serta menindaklanjuti laporan; super admin mengelola master data dan audit. Untuk redesign ini, presentasi dan daya tarik bagi juri lomba menjadi prioritas yang dikonfirmasi pengguna.

## Product Purpose

Prototipe lomba yang mendemonstrasikan pelaporan anonim sampai penanganan dan transparansi agregat. Semua data merupakan contoh; aplikasi tidak menerima laporan nyata dan tidak mewakili instansi tertentu.

## Positioning

Pelaporan tiga langkah dengan akses pribadi lewat kode tiket, PIN, dan kunci pemulihan untuk laporan terenkripsi; pelapor dapat mengikuti status, membaca pesan, dan memberikan bukti tambahan tanpa membuat akun.

## Operating Context

Demo lomba berbahasa Indonesia melalui desktop dan ponsel. Pengguna meminta redesign semua halaman publik serta panel petugas sekaligus. React, TypeScript, Vite, dan backend Express/SQLite sudah tersedia.

## Capabilities and Constraints

- Pertahankan rute, fungsi, data, validasi, autentikasi, dan integrasi API yang sudah bekerja.
- Formulir kejadian, bukti, tinjau; unggahan maksimal lima JPG/PNG/PDF, masing-masing 10 MB.
- Tiket dan PIN serta kunci pemulihan disimpan pelapor. Konten terenkripsi hanya terbuka bagi petugas setelah pelapor memberikan izin.
- Antrean, keputusan status, pesan dua arah, audit, master data, dan grafik agregat berasal dari backend.
- Jangan menambah klaim jaminan keamanan, statistik, dukungan institusi, atau testimoni yang tidak terbukti.

## Brand Commitments

Nama SIAP dan bahasa Indonesia dipertahankan. Pengguna meminta penggantian dunia visual yang generik dan kaku; tidak mengunci warna atau jenis huruf lama.

Pengguna memilih identitas Ruang Warga untuk seluruh aplikasi melalui halaman keputusan Impeccable. Detail visual yang diterapkan dicatat dalam DESIGN.md; komposisi khusus beranda dicatat pada surface brief.

## Evidence on Hand

README.md, implementasi web/src, server/src, dan docs/threat-model.md. Tiket dan kredensial demo tersedia dalam repositori. Gambar di assets dan web/docs merupakan pratinjau lama, bukan kebenaran visual implementasi terkini.

## Product Principles

- Tampilkan mekanisme produk melalui alur yang bisa dicoba juri.
- Bedakan tugas publik dan petugas sambil menjaga satu identitas.
- Teks privasi harus sesuai perilaku teknis saat ini.
- Hierarki dan keterbacaan harus bekerja pada ponsel serta desktop.
