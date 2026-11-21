# Prompt untuk Gemini — Rapikan UI & performa Warung (Toko Cung World)

> Tempel seluruh isi file ini ke Gemini, di dalam repo `toko-cung-explorers`.

---

## Peranmu

Kamu adalah frontend engineer game web 3D yang merapikan fitur **Warung Sendiri** di Toko Cung World.
Targetnya ada dua: **(1) tampilan** terasa seperti warung sungguhan, rapi, dan konsisten dengan HUD lain, serta
**(2) performa** lancar di HP Android kelas menengah/bawah dalam mode landscape.
Fitur dan logika game sudah berjalan. Tugasmu **merapikan, bukan menambah fitur**.

## Stack dan aturan repo (wajib dibaca dulu)

- TanStack Start + React 19, React Three Fiber (`@react-three/fiber`, `drei`, `rapier`), zustand. Bahasa UI: Indonesia.
- Baca **`AGENTS.md`** dan **`style-game.md`** sebelum mengubah UI. Ikuti palet, komponen acuan, dan checklist §10.
  Warungku sudah terdaftar di peta komponen `style-game.md`. Perbarui baris itu kalau standarnya berubah.
- Repo tersinkron ke Lovable: **jangan force-push atau rewrite history**. Buat branch baru.
- Jangan menambah dependency. Jangan menambah aset berat (gambar/GLB). Ilustrasi produk sudah berupa SVG di `ProductArt.tsx`.
- CSS warung ada di `src/ui/hud/warung-panel.css`. Semua selector di-scope ke `.warung-*` / `.game-warung-sheet`. Jangan menambah override global.

## Peta fitur (file yang boleh kamu ubah)

| File | Isi |
|---|---|
| `src/ui/hud/WarungPanel.tsx` | Panel HP "Warungku": tab Warungku, Kulakan, Harga, Mampir, Juara |
| `src/ui/hud/WarungHud.tsx` | HUD dalam warung (bar atas, pembeli datang, mini-game layani, dialog cerita, belanja), prompt depan kavling, prompt Kulakan di Toko Cung |
| `src/ui/hud/warung-panel.css` | Semua gaya warung (ada blok "compact pass" untuk HUD dalam ruangan di akhir file) |
| `src/game/warung/ProductArt.tsx` | Ilustrasi SVG 11 produk |
| `src/game/warung/WarungScene.tsx` | Ruangan 3D warung (etalase, renceng, rak, produk 3D, pembeli NPC berjalan) |
| `src/game/warung/WarungLots.tsx` | Etalase/gerobak di 15 kavling rumah kota |
| `src/game/warung/LeaderboardBoard.tsx` | Papan Juara 3D di Alun-alun Cung (104, 0, 24.5) |
| `src/game/warung/store.ts`, `model.ts`, `lots.ts` | State dan helper. **Ubah hanya jika perlu untuk performa.** Jangan mengubah bentuk request API |

Spek lengkap fitur: `docs/warung-sendiri.md`.

## Batasan yang TIDAK boleh berubah

- **Server bersifat otoritatif.** Kas, stok, harga, upah, event cerita, dan papan juara dihitung di Laravel (`POST /api/world/warung`, operasi BFF `warung`).
  Jangan memindahkan perhitungan ke client, dan jangan mengubah nama action atau field:
  `read{inside?}`, `open`, `restock`, `price`, `serve`, `upgrade`, `visit`, `buy{expectedPrice}`, `directory`, `lots`, `hire`, `work`, `event{eventId,choice}`, `leaderboard`.
- Semua uang di sini **simulasi** ("Kas Warung"). Teks UI tidak boleh menyiratkan uang/produk asli. Jangan pakai merek nyata (tulis "ojol", bukan nama aplikasi).
- Pertahankan: label aksesibilitas, state loading/disabled/error/empty, fokus dan alur tutup `GameModal`, serta tombol Keluar warung.
- Tes yang ada harus tetap lulus (perintah di bawah).

## Masukan pemilik produk (wajib ditangani)

1. **HUD dalam warung terlalu besar dan menutupi ruangan.** Card dan tombol harus lebih kecil, sedangkan **teks sedikit lebih besar**.
   Saat ini bar atas, card pembeli/cerita, dan chip "Rak kosong" bisa bertumpuk dan menutupi separuh layar 844×390.
   Rancang ulang tata letaknya. Contoh: bar ringkas di atas, card aksi di sisi kanan bawah (di atas tombol lompat, tanpa menutup analog), dan chip status kecil.
2. **Harus terasa seperti warung, bukan dashboard.** Pakai ilustrasi produk, label harga, nuansa kertas/kayu, dan bahasa santai Indonesia. Tetap mengikuti palet krem/oranye di `style-game.md`.
3. **Tab Harga dan Kulakan** sudah berupa kartu produk. Rapikan hierarki: nama produk → harga (besar) → info sekunder (untung/pcs, stok, Laris/Normal/Sepi) → satu aksi utama.
4. **Mini-game layani pembeli**: buat jelas dan cepat dipakai satu jempol. Pesanan pembeli tampil sebagai balon bicara, pilihan barang sebagai ubin produk dari rak, dan progres "kresek".
5. **Dialog cerita** (ngutang / iuran RT / ojol): ringkas, punya karakter (badge peran, nama NPC), dan dua tombol jelas.
6. **Prompt dunia** ("Masuk warung" di depan kavling, "Kulakan" di Toko Cung) jangan sampai muncul bersamaan dan saling menimpa. Pilih satu berdasarkan yang paling dekat.
7. Papan Juara 3D dan tampak depan warung di kavling harus terbaca dari jarak normal kamera, tanpa teks tumpang-tindih.

## Target performa (HP landscape, kualitas otomatis LOW)

Jangan menyentuh file performa yang sedang dikerjakan terpisah: `Player.tsx`, `Npc.tsx`, `RemotePlayers.tsx`,
`HiddenIndoors.tsx`, `AdaptiveQuality.tsx`, `draw-breakdown.ts`, dan file avatar.

Ukur sebelum dan sesudah dengan **Pengaturan → Diagnostik** (FPS, draw calls, triangles). Laporkan angkanya.

Temuan yang sudah diketahui, untuk diperiksa dan diperbaiki:
- **Jangan menambah atau menghapus lampu** (`pointLight`/`spotLight`) secara dinamis: perubahan jumlah lampu memaksa three.js
  mengompilasi ulang semua shader (freeze). Lampu tambahan di `WarungScene` sudah dihapus; terangi dengan material/emissive.
- `LotPrompt` dan `KulakanPrompt` sudah memakai selector turunan (tidak re-render tiap sinkron posisi). Pertahankan pola itu.
- `WarungLots.tsx` dan `LeaderboardBoard.tsx` memakai banyak `<Text>` (troika). Setiap Text = draw call + SDF.
  Kurangi jumlahnya (gabungkan baris, sembunyikan detail di jarak jauh, atau render hanya kavling dalam radius tertentu dari pemain).
- `WarungScene` membuat ulang batch produk saat `stock` berubah (setiap polling 20 detik). Pastikan memo tetap stabil kalau isi stok tidak berubah.
- Interval di HUD (`customerTick` 500 ms, `CounterCard` 500 ms, timer mini-game 1 s) jangan dibuat ulang terlalu sering, dan jangan berjalan saat tidak berjaga.
- Pertimbangkan `frameloop`/LOD untuk avatar pembeli NPC (`BaseAvatarV2`) dan matikan bayangan untuk produk kecil.

Di luar cakupan warung, tapi catat kalau kamu menemukannya: pemilik melaporkan **masuk gedung Toko Cung terasa sangat berat**.
Jangan perbaiki besar-besaran tanpa angka diagnostik. Cukup laporkan penyebab yang kamu temukan beserta datanya.

## Cara verifikasi

```sh
node_modules/.bin/tsc --noEmit --pretty false
node_modules/.bin/eslint src/game/warung src/ui/hud/WarungHud.tsx src/ui/hud/WarungPanel.tsx
node --import tsx --test tests/warung.test.mjs
npm run build
```

Periksa tampilan di browser pada **844×390** (landscape pendek) dan **1024×768**, termasuk safe area dan saat keyboard chat terbuka.
Build dan tes tidak membuktikan tampilan. Sertakan screenshot sebelum/sesudah untuk: panel Warungku (semua tab), HUD dalam warung
(menunggu pembeli, mini-game, dialog cerita, rak kosong), prompt depan kavling, dan Papan Juara.

## Format laporan akhir

1. Ringkasan perubahan per file (singkat).
2. Angka performa sebelum → sesudah (FPS, draw calls) di skenario: kota, dalam warung, depan Papan Juara.
3. Screenshot sebelum/sesudah.
4. Hal yang sengaja tidak dikerjakan dan risiko yang tersisa.
5. Pembaruan `style-game.md` (jika standar visual berubah) dan `docs/warung-sendiri.md` (jika perilaku UI berubah).
