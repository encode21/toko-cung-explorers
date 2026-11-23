# Pantai Cung: pesisir terbuka

Pembaruan lokal, 16 Oktober 2026. Pantai kini berada di tepi barat laut kota, terbuka ke utara dan barat. Tanah di luar kota diganti laut sampai horizon; pantai tidak lagi berbentuk kolam oval dengan tanah di sekelilingnya.

![Pesisir dan laut terbuka](open-coast-desktop.png)

## Bentuk dunia

- Kota memiliki batas daratan ±64 m, dengan garis pantai barat laut pada `x=-38` dan `z=-29`. Dasar pantai turun landai selama 12 m, sampai kedalaman air 3,2 m.
- Permukaan laut membentang sampai ±2.000 m. Batas gerak dunia dipindah dari ±56 m ke ±180 m sehingga pemain bisa berenang melewati tepi pantai lama.
- Bangunan, spawn, aktivitas, dan lintasan NPC tetap di daratan. Jalan/trotoar yang memanjang ke laut memiliki collider dari geometri permukaan yang sama sehingga tetap dapat dilalui.
- Palem, payung, dan mercusuar disesuaikan ke daratan pesisir. Dermaga dan ramp tetap dapat digunakan; berdiri di atasnya tidak memicu berenang.
- Minimap ringkas dan detail memakai garis pantai yang sama dengan model dunia. Fishing Spot memiliki dasar/perairan terpisah dengan kedalaman 2,2 m dan juga dapat dipakai berenang.
- Laut memakai permukaan opaque dan garis ombak ringan. Dasar mesh dan collider berbagi geometri; tidak ada bidang tanah datar yang menutup laut atau kolam memancing.

Akses tetap melalui **Jelajah → Pantai Cung**, tujuan `(-38, 0, -29)` dengan petunjuk lewat trotoar utara/barat kota.

## Kontrol

WASD atau analog menggerakkan pemain. Berenang otomatis saat cukup dalam dan kaki terendam; Spasi/tombol lompat mengayuh. Pemain mengapung saat diam. Mendekati tepian landai mengembalikan jalan dan lompat. Ambang masuk 1,05 m dan keluar 0,72 m mencegah perpindahan animasi berulang di tepian.

## Verifikasi perubahan pesisir

```sh
node scripts/check-swimming-layout.mjs
node --test tests/swimming.test.mjs tests/jump-animation.test.mjs tests/jump-remote.test.mjs tests/running-fishing.test.mjs
node scripts/check-swimming-browser.mjs
node scripts/check-fishing-browser.mjs
npx tsc --noEmit
npm run build
```

23 tes logika/animasi lulus. Validator penempatan memastikan pusat lot dan lintasan NPC tetap kering serta tapak kolam memancing tidak tertutup objek lain. Browser memakai Player/Rapier/HUD/world produksi dengan transport backend fixture: desktop 1280×720 (60 Hz) dan landscape mobile 740×360 (40 Hz).

Uji browser mencakup darat → dangkal → dalam, diam mengapung, kayuhan, keluar lewat pantai, lompat setelah keluar, akses ramp/dermaga, masuk air dari ujung dermaga, berenang melewati dinding lama, serta mengapung jauh di luar mesh pesisir. Jalan dan trotoar di atas laut juga diperiksa agar pemain tidak menembus permukaan. Regresi memancing desktop/mobile memeriksa posisi di dermaga, tangkapan, retry, dan kontrol lari.

Bukti terbaru: [hasil pengujian](open-coast-report.json), [tampilan mobile](open-coast-mobile.png). Screenshot/laporan lain di direktori ini berasal dari implementasi pantai terdahulu.

Belum diverifikasi: perangkat Android/iOS fisik, performa GPU nyata, dua akun multiplayer live, dan objek tambahan dari registry Cloud. Pengujian lokal dan push Git tidak membuktikan deploy produksi.


## Pantai kota/Gang dan kontak air — 24 November 2026

Pantai kota kini terlihat menurun menuju laut y=−1,2, dengan gradasi rumput–pasir yang lebar dan bergelombang serta pasir basah di garis air. Terrain mencakup distrik timur; lapisan rumput datar yang menutupinya dihapus. Dermaga dan pohon mengikuti ketinggian baru.

Gang Cung memakai rumput kota dan pasir menurun 1,6 m sepanjang 10 m. Pemain bisa turun sampai batas air dangkal; seluruh pantai tetap dikenali sebagai ruang Gang yang sama. Air Gang terdaftar hanya saat scene aktif, terpisah dari laut kota.

Air memakai gelombang silang, highlight, dan busa tepi bergerak. Kontak menghasilkan tetesan balistik dan riak yang memudar; kecebur saat jatuh/lompat menambah percikan dan riak kedua. Rekaman untuk kayuhan, masuk air, dan kecebur berbeda, mengikuti mute/volume SFX dan cap suara. [Lisensi/aset audio](../../../public/assets/audio/water/LICENSE.md) — tiga MP3 mono berjumlah sekitar 21 KB, tanpa dependency baru.

Verifikasi:
- Swimming, model/geometry Gang, dan Gang store: 22 tes terfokus lulus (18 swimming/geometry/store + 4 model). Layout/NPC/kolam dan bounded splash queue lulus.
- TypeScript, lint produksi terkait, dan build production lulus.
- Browser desktop 1280×720/60 Hz dan mobile 740×360/40 Hz: jalan dari darat ke dangkal, berenang, daya apung, kayuhan, keluar, melompat dari dermaga, tiga rekaman audio benar-benar diputar, jalan turun ke pantai Gang dan tertahan batasnya; tidak ada browser exception atau console error.
- Fixture efek: dua avatar, percikan berhenti saat kering, pool terbatas, reduced motion, mute, dan volume SFX nol.

[Hasil browser](soft-shore-report.json) · [Pantai kota](soft-shore-city.png) · [Pantai Gang](soft-shore-gang.png).

Pengujian memakai data fixture dan Chrome lokal, bukan akun production/HP fisik. Kualitas dengar lewat speaker/headphone dan multiplayer live belum diuji. Rilis frontend saja, tanpa migrasi/backend. Sony melakukan deployment sendiri setelah review/merge PR.
