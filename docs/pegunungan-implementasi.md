# Pegunungan, helikopter, dan senter

Implementasi konsep, diperluas pada 10 November 2026 dengan jalur Obby pegunungan.

## Cara mencoba

1. Masuk ke dunia, buka map, lalu pilih **Petunjuk ke helipad**. Map utama menampilkan Pusat Kota dan Pegunungan; klik masing-masing untuk membuka detail.
2. Ikuti petunjuk menuju helipad di sisi barat area perluasan kota. Dekati sisi helikopter, tekan **F** atau tombol **Naik Helikopter**.
3. Setelah transisi singkat, pemain tiba di basecamp. Ikuti jalur tanah menuju Pos Rimba, Pos Jembatan, Pos Batu, Pos Awan, lalu Puncak Cung.
4. Lewati area teras CP untuk mengaktifkannya, termasuk saat melompat biasa; tidak harus menginjak penanda bundar. CP harus berurutan; setiap aktivasi baru memiliki bunyi, perubahan warna, centang, dan pesan. Berdiam di CP tidak mengulang bunyi.
5. Pilih **Senter**, lalu **Nyalakan**. Desktop juga mendukung **L**. Pilih **Simpan** untuk menyimpan dan mematikan senter. Tidak ada baterai.
6. Jika jatuh, pemain kembali ke CP terakhir. Tombol **Basecamp/Pos CP** juga bisa dipakai jika tersangkut.
7. Setelah summit, confetti dan modal menawarkan **Tetap di puncak** atau **Kembali ke basecamp**. Pilihan kembali memulai progres pendakian baru; tombol juga tersedia di HUD jika modal ditutup. Untuk pulang ke kota, naik helikopter dari basecamp.

## Perilaku saat ini

- Jalur sekitar 625 meter (sebelumnya 299 m), tiga tangga, dua rangkaian batu lompatan dan titian sempit; empat pos dan puncak setinggi 54 meter tetap di koordinat semula. Air terjun berbatu berada di sisi jembatan. Gunung terpisah secara geografis dari kota dalam dunia multiplayer yang sama.
- Progres CP hanya selama sesi bermain. Perjalanan baru dari kota mereset pendakian. Tidak ada reward saldo, Point, atau XP tambahan.
- Senter dan animasi perpindahan helikopter bersifat lokal pada pemain. Posisi pemain tetap dikirim lewat sistem multiplayer yang ada.
- Penerbangan menggunakan transisi singkat, bukan kontrol mengemudikan helikopter.
- Gendong, terbang GM, memancing, misi Principal, dan pengiriman truk perlu dihentikan/diselesaikan sebelum menggunakan helikopter.
- Gunung menggunakan pencahayaan waktu dunia yang sudah ada. Vegetasi menyesuaikan kategori kualitas perangkat.

## Pemeriksaan

- `node scripts/check-mountain-model.mjs`: urutan CP, penyelesaian sekali, titik kembali, kemiringan dan kesinambungan jalur.
- `node scripts/check-mountain-browser.mjs`: Player/physics/HUD asli dengan layanan backend fixture; menguji perjalanan, CP, jatuh, senter, map, dan pembatalan sesi pada desktop serta landscape mobile.
- `node scripts/check-world-map.mjs`: regresi detail peta kota.
- `node_modules/.bin/tsc --noEmit --pretty false`, ESLint file terkait, dan `npm run build`.

Pengujian browser fixture tidak menggantikan pengujian bersama beberapa akun di server produksi.

## Hasil verifikasi versi awal

- TypeScript, ESLint file fitur, pemeriksaan diff, dan build produksi lulus.
- Tes model gunung dan regresi map kota lulus.
- 15 tes gerak/lompat/spawn serta 1.392 simulasi lompatan Obby pada 40/60 Hz lulus.
- Browser desktop 1280×720 dan landscape ponsel 740×360 lulus tanpa error JavaScript. Pemeriksaan memakai Player, Rapier, HUD, model helikopter, dan senter asli; transport backend menggunakan fixture. Desktop juga memasang collision kota lama.
- Alur yang diuji: map dua lokasi, perjalanan dua arah, menolak boarding ganda, berjalan naik lereng, urutan empat CP, penolakan melewati CP, pemulihan jatuh, puncak, senter, dan pembatalan penerbangan saat keluar sesi.

## Revisi jalur Obby — 10 November 2026

Data rute dan tantangan bersama dipakai oleh terrain, visual/collider serta kedua peta. Tangga memiliki riser bertepi landai sesuai mesh tabrakan; batu memiliki celah nyata yang dapat dilompati pada kecepatan jalan. Jatuh tetap kembali ke CP terakhir. Air terjun memakai shader ringan dan batch batu/buih; reduced motion menghentikan animasinya. CP memeriksa area/tinggi, sementara urutan tetap divalidasi oleh progress store. UI memakai GameModal dan confetti yang sama dengan penyelesaian quest.

Bukti pengujian terbaru tersedia di [QA jalur Obby](qa/mountain-obby/README.md). Tidak ada perubahan backend, migrasi, ekonomi atau quest server. Rilis frontend dan refresh klien; belum deploy/QA HP fisik.
