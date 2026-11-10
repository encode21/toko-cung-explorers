# Gunung alami dan leaderboard summit

Status: **in_progress — kode dan pengujian lokal siap, layanan akun belum diterbitkan/dimigrasikan**.
Tanggal: 10 November 2026.

## Hasil

- Jalur tanah 1.817 meter menyatu dengan lereng dan sepuluh CP perkemahan, masing-masing 24 × 20 m; jalur bertumpuk menjelang puncak dialihkan ke sisi utara.
- Jembatan kayu utuh melintasi lembah air terjun. Tampilan tanah dan permukaan fisik menggunakan mesh yang sama.
- Basecamp pesisir berisi pasir, palem, api unggun, bangku gelondongan, tenda, saung, dua dermaga, helipad/helikopter, tiga manekin outfit dan papan summit. Vegetasi dibuat berkelompok dengan batas bebas jalur.
- Papan menampilkan sepuluh pendaki teratas dan jumlah summit pemain sendiri. Nama/ranking berasal dari layanan akun, bukan data contoh atau penyimpanan browser.
- Jalur versi 3 memakai CP 1–10 lalu summit. Jarak jalur/pos diperlebar; summit menjadi padang beradius 22 m dengan batu nama, bendera, tenda, dan kursi lipat yang bisa diduduki. Nama lokasi adalah **Gunung Cung**.
- Satu perjalanan hanya menghasilkan satu summit. CP berurutan, identitas sesi, posisi dan perkembangan rute diperiksa server. Pengulangan permintaan tidak menggandakan jumlah. Data sebelum fitur ini aktif tidak dapat dipulihkan karena sebelumnya summit hanya tersimpan dalam sesi.

- Outfit pinjaman dan papan summit tidak mengubah profil. Papan dibuka dari total summit yang disahkan server, memakai tombol 2 atau slot sentuh. Riwayat summit lama juga memenuhi syarat.
- Lokasi kota/gunung tidak dipasang bersamaan; termasuk collider dan simulasi kota. Kehadiran pemain menyerahkan otoritas lalu lintas saat pindah ke gunung. Laut pantai memakai registry renang yang sama dan kedalaman tanah aktual.

## Area kode

Frontend: `src/game/mountain/`, panggilan CP aktual di `src/game/player/Player.tsx`, dan operasi `mountain` di `src/services/world/`.
Backend: `app/Services/World/WorldMountain.php`, `routes/world.php`, migrasi `world_mountain_runs`, dan `tests/Feature/WorldMountainTest.php` pada repo layanan akun `microservices/toko-cung`.

## Penerbitan

Frontend saat ini menggunakan layanan akun jarak jauh. Perubahan backend lokal tidak otomatis mengubah layanan tersebut. Database yang dikonfigurasi juga berada di server jarak jauh; tidak ada migrasi yang dijalankan ke sana selama pekerjaan ini.

Setelah penerbitan backend disetujui, gunakan prosedur deploy layanan akun dan jalankan migrasi terbatas berikut pada lingkungan tujuan:

```sh
php artisan migrate --path=database/migrations/2026_11_10_210000_create_world_mountain_runs.php
php artisan migrate --path=database/migrations/2026_11_10_220000_add_route_version_to_world_mountain_runs.php
```

Migrasi kedua menandai catatan lama sebagai versi 1. Summit yang sudah selesai tetap masuk leaderboard; pendakian versi 1/2 yang masih aktif harus dimulai ulang dari basecamp. Klien mengirim `routeVersion: 3`, server menolak versi tidak cocok, dan klien hanya menerima pengakuan dari server versi 3. Versi 3 memakai kolom yang sama, tanpa migrasi baru. Jalankan dua migrasi tersebut hanya jika belum terpasang, lalu terbitkan backend versi 3 sebelum frontend baru. Validator posisi mobility juga mencakup pulau baru agar gendong tetap berfungsi.

Periksa respons operasi `mountain` dengan akun pengujian, selesaikan satu pendakian, lalu pastikan satu entri muncul dan pengulangan permintaan tidak menambahnya lagi. Terbitkan frontend setelah endpoint siap. Jangan menghapus tabel saat mengembalikan versi frontend karena tabel menyimpan riwayat pemain.

## Verifikasi

- Geometri: 43.675 sampel pada lima lajur, semua segitiga utuh, rasio kemiringan maksimum 0,338 dan selisih interpolasi mesh 0,089 m. Pusat serta sudut aman setiap teras CP diperiksa bersama respawn CP 1–10.
- Fisika browser: 13.752 sampel per ukuran layar, serta perjalanan karakter selama 250 detik dari basecamp sampai puncak melewati seluruh 10 CP tanpa melompat. Sebanyak 178 sampel transportasi dari perjalanan aktual diputar ulang ke validator backend dan menghasilkan tepat satu summit.
- Pemeriksaan tampilan komputer 1280×720 dan HP 740×360, serta lint/TypeScript/build.
- Uji layanan akun memakai SQLite terisolasi: 21 tes dan 96 assertion lulus; database jarak jauh tidak diubah. Cakupan versi 3 meliputi urutan sepuluh CP, penolakan rute empat-CP yang masih aktif, penjagaan receipt lama, percobaan lompat urutan, dan penghargaan tepat satu kali.
- Kursi lipat di tepi puncak diuji lewat interaksi duduk/berdiri desktop dan sentuh. Foto akhir memperlihatkan batu nama, bendera, papan genggam, perkemahan, serta pandangan ke lereng tanpa penghalang di depan kursi.
- Uji antrean klien sepuluh CP mencakup posisi rigidbody terbaru, permintaan lambat, langsung kembali ke basecamp, perjalanan berikutnya, dan retry tanpa penggandaan summit.

Folder catatan Obsidian yang disebutkan AGENTS backend tidak tersedia pada komputer ini; catatan implementasi dan rollout disimpan di repo ini sebagai pengganti.
