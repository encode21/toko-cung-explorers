# Misi pengiriman truk

Kontrak: misi opsional `TRUCK_DELIVERY` menggunakan otoritas room yang sama dengan misi bantuan. Satu truk dibooking untuk satu sesi di room; hadiah hanya Kontribusi +1, bukan CP/XP. Tawaran sekali per sesi room. Terima dekat paket depan toko, ambil/muat tiga paket satu per satu, naik, kemudikan sendiri, parkir di loading yard belakang, turun, ambil/serahkan setiap paket ke gudang. Tiap transisi divalidasi host berdasarkan tahap, jarak, pemilik, cooldown, dan revisi. Pembatalan, kedaluwarsa 20 menit, dan Spawn melepas kemudi; checkpoint room mempertahankan muatan sampai run berakhir.

Broadcast `mission_drive`: `{from, room, missionId, seq, throttle:-1..1, steer:-1..1, brake:boolean}`. Hanya pengemudi sesi aktif yang diterima. Urutan monoton, input kedaluwarsa 400 ms berhenti, integrasi host maksimal 50 ms, kecepatan maju 6 m/s dan mundur 2.5 m/s. Host memeriksa collider di setiap langkah; snapshot misi berisi pose truk, driver, loaded/unloaded, tanpa percaya posisi kiriman pengemudi. Snapshot pengemudi terputus berhenti dan melepas driver. Posisi keluar dipilih lewat pemeriksaan collider. Tidak ada endpoint HTTP atau skema DB baru untuk truk.

Rilis backend lebih dulu: migrasi data NPC memindah hanya posisi bawaan Warga Cung yang bertumpuk pickup; migrasi target kasir memperbarui titik scan bawaan ke [5.4,0,-1]. Keduanya mempertahankan posisi editor. Kemudian rilis frontend dialog dan truk bersama. Semua klien dalam room perlu versi frontend baru untuk memahami tipe misi dan broadcast baru.

Pembatalan/Spawn/kedaluwarsa boleh mencoba lagi; tiap penerimaan truk mendapat ID run baru untuk menolak input tertunda dari run sebelumnya. Selesai memberi satu kontribusi dan tidak ditawarkan lagi selama sesi. Navigasi ke belakang melalui sisi timur dan jalan belakang agar tidak mengarahkan truk melintasi toko atau mobil supplier. Klien yang berada dalam interior Underground tidak menjadi host simulasi luar; perubahan lokasi ini langsung memperbarui availability presence. Avatar pengemudi remote mengikuti pose visual kabin dan collider orangnya dinonaktifkan selama menyetir agar tidak menahan truk pada host.

Verifikasi lokal: `node scripts/check-reactive-missions.mjs`, `node scripts/check-truck-browser.mjs`. Browser menjalankan Player, Rapier, scene toko, runtime host, HUD dan input asli; server HTTP memakai fixture. Desktop mengemudikan seluruh rute jalan sebelum bongkar. Ini bukan bukti transport Supabase lintas perangkat/akun produksi; lakukan smoke-test room dua akun setelah rilis.

Hasil browser lokal terakhir: rute desktop penuh, joystick/REM dan Spawn pada landscape 740×360, posisi Warga bebas pickup, tiga meja kasir dan kamera indoor lulus. Fixture juga menjalankan avatar remote + host produksi untuk memastikan collider pengemudi tidak menghalangi, kabin mengikuti truk, input asing ditolak, timeout mengerem dan disconnect melepas driver. Pemeriksaan tipe, lint file produksi berubah dan build lulus.

## Penataan area pengiriman — 22 Oktober 2026

Truk mulai di [14.9,0,10.5], menghadap jalan depan; palet paket di [16.6,0,13.7]. Keduanya berada di driveway abu-abu sisi kanan depan, terpisah dari booth promo, bangku dan Pak Budi. Muat/bongkar memakai sisi kanan bak (offset lokal [1.9,-0.8]); naik dari sisi yang sama ([1.85,0.8]). Petunjuk keluar mengarah ke jalan timur [22,0,15]. Tidak mengubah jumlah paket, hadiah atau jarak validasi aksi.

Checkpoint lama yang masih berhenti di posisi awal [8,12.5] dipindah oleh host ke bay baru saat rekonsiliasi, mempertahankan muatan dan paket yang dibawa. Truk yang ditempati atau sudah bergerak tidak dipindah. Ini pemulihan state room, tanpa migrasi database. Fixture browser kini memuat booth promo dan populasi NPC produksi; ambil/muat/naik diuji dengan berjalan menggunakan keyboard, bukan melompat langsung ke tiap titik.

Dekorasi pickup lama (`pickup-parcels`, `pickup-trolley`, `pickup-cone`) dihapus: troli/cone bertumpuk dengan collider truk di bay baru dan membuat gas tertahan. Regresi direproduksi dengan ActivityProps produksi; fixture mencakup NakamaOps, ClubScene, supplier, dock gudang dan PrincipalBuilding juga. Tidak mengabaikan collider dunia untuk meloloskan kendaraan.

REM sentuh kini aktif selama jari ditahan, termasuk saat jari pertama masih menekan gas. Melepas/cancel sentuhan, blur, panel terbuka atau turun dari truk membersihkan status rem. Tap tetap memberi pengereman singkat; Space desktop tetap bisa ditahan.

Verifikasi setelah perbaikan collider dan rem: perjalanan kaki ambil/muat/naik, rute keyboard penuh, gas/mundur/Space, serta gas+REM dua jari di 740×360 lulus. REM tetap menahan gas melewati durasi impuls, release melanjutkan gas, touchcancel membersihkan rem; Spawn dan remote-host fixture lulus. Typecheck, lint produksi berubah dan build lulus. QA transport dua akun/perangkat fisik tetap belum dijalankan.
