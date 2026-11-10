# Redesign SIAP — Ruang Warga

Pengguna memilih Ruang Warga setelah membandingkan tiga arah visual. Fokusnya adalah presentasi kepada juri lomba, dengan cakupan seluruh halaman publik dan panel petugas. Implementasi memakai React/Vite dan backend yang sudah tersedia.

## Yang berubah

- Beranda menggunakan bidang hijau pekat, judul humanis besar, dan meja aksi kuning-hijau untuk memulai laporan atau membuka tiket. Kategori yang dipilih diteruskan ke formulir.
- Alur publik memakai indikator bernama Kejadian, Bukti, Tinjau; dokumen dan formulir memakai permukaan terang yang nyaman dibaca.
- Tiket menampilkan status dan linimasa yang terstruktur. Kesalahan akses tampil di dalam formulir sehingga pengguna bisa memperbaiki isian.
- Transparansi mengutamakan agregat nyata, periode, grafik kategori, dan tren. Panduan menjelaskan perbedaan tiket, PIN, dan kunci pemulihan sesuai implementasi.
- Panel petugas memiliki navigasi khusus berdasarkan peran. Antrean memakai tabel di desktop dan daftar pada ponsel, pencarian berjeda, serta keadaan memuat, gagal, dan kosong yang berbeda.
- Identitas yang sama diterapkan melalui komponen dan gaya bersama pada rute yang sudah ada. Fungsi backend dan aturan akses dipertahankan.

## Rekomendasi alur demo

1. Buka beranda dan pilih satu kategori. Tunjukkan bahwa kategori ikut masuk ke formulir tanpa membuat akun.
2. Gunakan cerita fiktif singkat untuk memperlihatkan tiga langkah pelaporan dan penerbitan akses pribadi.
3. Buka tiket contoh dari halaman cek status. Tunjukkan status, permintaan petugas, dan aksi balas.
4. Masuk memakai akun verifikator contoh, cari laporan, dan buka detail. Jelaskan hubungan tindakan petugas dengan linimasa pelapor.
5. Tutup dengan dashboard transparansi: juri melihat agregat penanganan tanpa isi laporan pribadi.

Siapkan tiket contoh sebelum presentasi untuk menghindari pengetikan panjang. Identifikasi semua data sebagai contoh. Jelaskan kunci pemulihan sebagai pembuka isi terenkripsi, bukan pengganti PIN.

## Menjaga desain berikutnya

Gunakan PRODUCT.md untuk kebenaran produk, DESIGN.md untuk token serta komponen visual, dan .impeccable/surfaces/ untuk strategi tiap halaman. Pertahankan perbedaan antara beranda yang ekspresif dan ruang kerja yang mengutamakan pemindaian informasi. Tambahkan fitur melalui pola tersebut agar identitas tetap konsisten.

## Validasi

Build TypeScript/Vite dan lint dijalankan. Uji browser mencakup beranda pada lebar 390, 420, 1280, dan 1440 px, pengiriman laporan contoh terenkripsi, akses tiket salah/benar, antrean dan detail verifikator, audit/master super admin, panduan, dan transparansi. Pengujian ini tidak menyatakan bahwa seluruh transisi status atau seluruh jenis unggahan telah diuji ulang.
