# Pusat kota, kendaraan, dan papan iklan

Pembaruan 12 November 2026. Kode lokal tersedia; dokumen ini tidak menandakan penerbitan ke server.

## Perubahan

- Pusat kota berisi 39 lot bangunan, termasuk 18 tambahan di daratan. Ruko memakai dua atau tiga lantai, balkon beton, rolling door, jendela berbingkai, papan nama, AC dan pipa. Rumah warga memakai atap seng miring serta pagar depan.
- Model dan posisi Toko Cung, Cung Underground, dan Principal Dungeon dipertahankan. Jalur NPC, akses misi, Obby dan helipad tetap memiliki ruang bebas.
- Aspal berbutir, trotoar bata merah, garis pemandu kuning dan kerb hitam-putih mengikuti geometri jalan yang sama dengan tabrakan dan lalu lintas. Ada 65 tiang lampu; cahaya aktif tetap dibatasi sesuai kualitas perangkat.
- Sebanyak 33 pohon jalan memakai geometri daun dan cabang yang sama dengan gunung. Tingkat detail berkurang mengikuti jarak kamera; batang dan collider tetap diam saat daun bergerak.
- Truk barang mempunyai kabin kuning di atas roda depan, bak merah berusuk, panjang 6 m, rangka bawah, pijakan, spion dan pelek komersial. Titik duduk, naik/turun, roda dan tabrakan memakai definisi ukuran yang sama.
- MPV putih hadir di armada NPC dengan kap dan kaca depan miring, atap melengkung memanjang, serta lengkung roda yang mengikuti ban. Kaca transparan memperlihatkan kabin dan pengemudi. Model kendaraan lainnya serta kontrol yang sudah ada dipertahankan.
- Empat papan iklan berdiri di trotoar, dengan panel vertikal dua sisi dan penyangga besi. Bidang panel melintang arah jalan agar terlihat dari kedua arah perjalanan. Panel dinaikkan 1,4 m: tepi bawah 3,12 m dan tepi atas 5,76 m dari tanah, dengan kaki tiang tetap di sisi belakang trotoar. Papan mengambil banner `type = popup` yang aktif dari API banner Toko Cung, mengikuti `sort_order` lalu ID. Jika banner lebih sedikit dari jumlah papan, daftar diulang; bila layanan atau gambar gagal dimuat, setiap slot memakai gambar lokalnya atau poster **Ruang Iklan**. Slot `pusat-01` tetap memakai poster ABC di `public/ads/promo-abc.png` sebagai cadangan lokal.

Tiga plang arah di trotoar depan area permainan (Proyek Langit, Fishing Spot, dan Pantai Cung) telah dihapus; papan nama di lokasi tujuan dan akses kegiatan tetap tersedia.

## Mengelola gambar iklan

Cara utama adalah membuat atau mengubah banner pada pengelolaan Banner Toko Cung, memilih tipe `popup`, mengaktifkan statusnya, dan mengatur `sort_order`. API publik hanya mengembalikan banner berstatus aktif; frontend memilih tipe `popup` dan hanya menerima URL gambar HTTPS. Perubahan tampil saat dunia dimuat kembali tanpa build frontend baru.

Konfigurasi lokal berikut menjadi cadangan ketika daftar popup kosong atau layanan tidak tersedia:

1. Siapkan gambar dalam WebP, PNG, atau JPEG. Rasio vertikal **2:3**, misalnya 800 × 1200 piksel, mengisi panel sepenuhnya; rasio lain tetap didukung dengan mempertahankan proporsi gambar.
2. Buat folder `public/ads/` jika belum ada, lalu simpan gambar, misalnya `public/ads/promo-november.webp`.
3. Buka `src/game/world/city-advertising.ts`, lalu ganti nilai `imageUrl` pada slot yang diinginkan. Path dimulai dari `/ads/`, tanpa awalan `public/`:

```ts
imageUrl: "/ads/promo-november.webp",
```

4. Bangun dan terbitkan frontend dengan prosedur proyek. Ini konfigurasi aset, belum berupa menu pengelolaan iklan di dalam game.

Slot tersedia:

- `pusat-01` — depan Toko Cung, posisi `[3.5, 0, 24.15]`, cadangan `imageUrl: "/ads/promo-abc.png"`.
- `pusat-02` — simpang barat, posisi `[-48, 0, 24.15]`, `imageUrl: ""`.
- `kampung-01` — jalan kampung, posisi `[-34.15, 0, -13]`, `imageUrl: ""`.
- `pasar-01` — depan pasar, posisi `[96, 0, 24.15]`, `imageUrl: ""`.

Satu banner atau `imageUrl` mengisi kedua sisi papan. Mengosongkan cadangan (`""`) mengembalikan poster bawaan saat tidak ada banner API. Gambar ditampilkan utuh di dalam panel 2:3 dengan perilaku `contain`: tidak dipotong atau diregangkan. Jika rasionya berbeda, ada ruang kosong pada sisi yang tersisa. Setelah perubahan banner, periksa kedua sisi papan di dalam game.

## Batas pemeliharaan

- Pertahankan model dan posisi Toko Cung, Cung Underground, dan Principal Dungeon. Lot biasa memakai collider bangunan solid; detail fasad tidak menambahkan interior yang bisa dimasuki.
- Tambahan lot dan perlengkapan jalan harus berada di daratan, dalam batas lot yang diperiksa, dan tidak menutup jalur NPC, titik misi, pintu venue, Obby, helipad, parkir atau jalan kendaraan. Setelah memindahkan slot iklan, pohon, atau lampu, jalankan kembali pemeriksaan tata letak.
- Gunakan geometri daun/cabang gunung yang sudah dibagi pakai, instancing dan pengurangan detail sesuai jarak/perangkat. Batang serta collider tetap stabil, angin mengikuti reduced motion, dan jumlah lampu aktif mengikuti anggaran renderer.
- Ukuran MPV/truk, posisi kursi, roda, pintu, titik keluar dan collider bersumber dari `src/game/vehicles/definitions.ts`. Pertahankan kaca transparan serta ruang kabin; jangan mengecilkan avatar atau menyembunyikan anggota tubuh untuk mengatasi benturan.

## Pemeriksaan

- `node scripts/check-city-layout.mjs`: lot, tanah kering, rute NPC, titik misi, akses venue/helipad, serta posisi pohon/lampu/papan iklan.
- `node scripts/check-road-network.mjs`: sambungan jaringan jalan dan akses kendaraan.
- `node scripts/check-city-refresh-browser.mjs`: tampilan desktop/mobile, pergantian gambar iklan, fallback gambar gagal, shader, dan kesinambungan tabrakan jalan.
- `node scripts/check-city-banners.mjs`: kontrak respons aktif, filter tipe popup, URL gambar HTTPS, urutan dan fallback.
- `node scripts/check-truck-browser.mjs`: Player dan Rapier asli untuk memuat tiga paket, mengemudi melalui rute kota, bongkar, menyelesaikan misi, kontrol sentuh, dan pengemudi remote.
- TypeScript, ESLint berkas yang berubah, dan `node scripts/check-vehicle-fit.mjs`: konsistensi kode serta posisi avatar di kendaraan. Build produksi menjadi pemeriksaan akhir sebelum penerbitan frontend.

Browser memakai layanan akun tiruan dan Chrome headless; hasilnya bukan pengukuran FPS pada ponsel fisik. Tes lama `check-world-plan.mjs` memiliki hitungan NPC yang kedaluwarsa (mengharapkan 14, data saat ini 15); kegagalan yang sama terkonfirmasi pada kode awal sebelum perubahan kota. Pemeriksaan tata letak baru diuji terpisah.
