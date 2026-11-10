# Pegunungan, helikopter, dan senter

Implementasi Gunung Cung, diperbarui pada 10 November 2026 dengan sepuluh checkpoint dan jalur hutan yang tersambung.

## Cara mencoba

1. Masuk ke dunia, buka map, lalu pilih **Petunjuk ke helipad**. Map utama menampilkan Pusat Kota dan Pegunungan; klik masing-masing untuk membuka detail.
2. Ikuti petunjuk menuju helipad di sisi barat area perluasan kota. Dekati sisi helikopter, tekan **F** atau tombol **Naik Helikopter**.
3. Setelah transisi singkat, pemain tiba di basecamp pantai dengan dermaga, palem, tenda dan helipad. Lewati gapura Gunung Cung dan ikuti sepuluh CP berurutan sampai penanda summit berbendera Merah Putih.
4. Lewati area teras CP untuk mengaktifkannya, termasuk saat melompat biasa; tidak harus menginjak penanda bundar. CP harus berurutan; setiap aktivasi baru memiliki bunyi, perubahan warna, centang, dan pesan. Berdiam di CP tidak mengulang bunyi.
5. Klik slot **Senter** di atas chat atau tekan **1** untuk memakai dan menyalakannya. Desktop juga mendukung **L** untuk menyalakan/mematikan. Pilih slot sekali lagi untuk menyimpan dan mematikan senter. Tidak ada baterai.
6. Jika jatuh, pemain kembali ke CP terakhir. Tombol **Basecamp/Pos CP** juga bisa dipakai jika tersangkut.
7. Setelah summit, confetti dan modal menawarkan **Tetap di puncak** atau **Kembali ke basecamp**. Pilihan kembali memulai progres pendakian baru; tombol juga tersedia di HUD jika modal ditutup. Untuk pulang ke kota, naik helikopter dari basecamp.

8. Di basecamp, buka **Outfit pendaki** untuk memilih tiga pakaian pinjaman. Outfit profil tetap tersimpan dan kembali tampil di kota.
9. Setelah summit diakui server, tekan **2** atau slot Summit untuk memegang papan Gunung Cung. Dekati kursi lipat di puncak dan tekan **F/Duduk**; Spasi atau **Berdiri** untuk bangun. Gunakan kamera yang sudah ada untuk berfoto.

## Perilaku saat ini

- Jalur tanah sepanjang sekitar 1.817 meter menyatu dengan medan. Kesepuluh CP berbentuk perkemahan seluas 24 × 20 m, dengan jarak antarpos yang diperpanjang. Seluruh jalur tersambung tanpa celah lompatan wajib. Jembatan kayu bertali melintasi lembah air terjun, dengan lentera besi hitam dan lampu kuning hangat. Puncak berada pada ketinggian dunia 96 meter.
- Gapura batu hanya ada di awal pendakian. Summit beradius 22 m memakai batu bertuliskan **GUNUNG CUNG**, dua tenda, tiga kursi lipat yang dapat diduduki, dan area foto menghadap panorama. Bendera merah di atas putih, rasio 3:2, bergerak mengikuti angin dan berhenti pada reduced motion.
- Aliran sungai, kolam, tebing berbatu, buih dan kabut lokal melengkapi hutan. Tanah dan batu memakai tekstur CC0 berukuran 1K, vegetasi memakai instancing dan pengurangan detail di HP.
- Progres CP hanya selama sesi bermain. Perjalanan baru dari kota mereset pendakian. Total summit pada papan basecamp disahkan dan disimpan oleh server; tidak ada reward saldo, Point, atau XP tambahan. Rute versi 3 mewajibkan sepuluh CP, sementara summit historis tetap tersimpan.
- Senter dan animasi perpindahan helikopter bersifat lokal pada pemain. Posisi pemain tetap dikirim lewat sistem multiplayer yang ada.
- Penerbangan menggunakan transisi singkat, bukan kontrol mengemudikan helikopter.
- Gendong, terbang GM, memancing, misi Principal, dan pengiriman truk perlu dihentikan/diselesaikan sebelum menggunakan helikopter.
- Kota dan gunung hanya dirender saat dikunjungi; collider tujuan disiapkan sebelum teleport, sedangkan kamera dan fisika pemain tetap hidup.
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

## Riwayat: revisi jalur Obby awal — 10 November 2026

Data rute dan tantangan bersama dipakai oleh terrain, visual/collider serta kedua peta. Tangga memiliki riser bertepi landai sesuai mesh tabrakan; batu memiliki celah nyata yang dapat dilompati pada kecepatan jalan. Jatuh tetap kembali ke CP terakhir. Air terjun memakai shader ringan dan batch batu/buih; reduced motion menghentikan animasinya. CP memeriksa area/tinggi, sementara urutan tetap divalidasi oleh progress store. UI memakai GameModal dan confetti yang sama dengan penyelesaian quest.

Catatan tersebut menjelaskan versi awal. Celah dan tantangan lompatan kemudian diganti jalur tanah tersambung. Kondisi terkini dan kebutuhan migrasi/penerbitan leaderboard dijelaskan di [catatan summit](mountain-summit.md). Backend rute versi 3 dan migrasi tabel/version yang belum terpasang perlu diterbitkan sebelum frontend; pengujian lokal tidak menerbitkan layanan atau mengubah database asli.
