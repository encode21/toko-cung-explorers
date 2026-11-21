# Warung Sendiri + Mampir — spek v1

Status: **in_progress** (22 Nov 2026). Backend: `toko-cung` (`WorldWarung`). Frontend: repo ini (`src/game/warung`).

## Tujuan

Setiap pemain bisa membuka warungnya sendiri di Toko Cung World, kulakan stok di Toko Cung,
melayani pembeli NPC, upgrade warung, dan **mampir ke warung pemain lain**. Ini pembeda utama
dibanding game warung single-player: warungmu ada di dunia yang sama dengan teman-temanmu.

**Semuanya simulasi.** Tidak ada uang asli, produk asli, atau checkout. Mata uang warung adalah
**Kas Warung** (koin game), terpisah dari World Point dan loyalty App. Tidak ada barang rokok di katalog.

## Lingkaran main (v1)

1. **Buka warung**: kasih nama warung → dapat modal awal Kas Rp50.000 (fiktif), level 1 "Gerobak".
2. **Kulakan di Toko Cung**: beli stok dari katalog dengan harga grosir, dibayar dari Kas.
3. **Atur harga jual**: antara harga grosir s.d. 2× harga pasar. Makin mahal, makin jarang NPC membeli.
4. **Jualan**:
   - *Offline/otomatis*: pembeli NPC datang terus. Setiap kali warung dibaca, server menghitung penjualan
     sejak terakhir dihitung (maks 8 jam), berdasarkan level, stok, dan harga.
   - *Layani langsung* (mini-game): di dalam warungmu, pembeli NPC datang ke etalase dengan pesanan
     (mis. "Mi instan 2, kopi 1"). Ketuk barang yang benar sebelum waktu habis → terjual + bonus 10% kalau
     harga tidak di atas harga pasar.
5. **Upgrade**: Gerobak → Kios → Warung → Toko Kelontong → Minimarket. Membuka barang baru, stok maksimum
   lebih besar, dan pembeli NPC lebih ramai.
6. **Mampir**: dari HP → *Warungku* → *Mampir*, lihat warung pemain yang sedang online di channel yang sama
   dan warung terlaris. Masuk ke warung mereka, lihat raknya, dan **beli stok** dari mereka (masuk ke stok
   warungmu sendiri). Pemilik dapat Kas. Barang level tinggi bisa didapat lebih awal lewat teman.

## Aturan dan rumus (server, `config/world-warung.php`)

| Level | Nama | Biaya upgrade | Stok maks / barang | Pembeli NPC / jam |
|---|---|---|---|---|
| 1 | Gerobak | – | 20 | 20 |
| 2 | Kios | 150.000 | 40 | 30 |
| 3 | Warung | 400.000 | 60 | 45 |
| 4 | Toko Kelontong | 1.000.000 | 80 | 60 |
| 5 | Minimarket | 2.500.000 | 100 | 80 |

- Penjualan otomatis: `pembeli = floor(npcPerJam × menit/60)`, menit dibatasi 480, pembeli dibatasi 500 per hitungan.
  Tiap pembeli memilih satu barang yang ada stoknya (berbobot `weight`), membeli 1 pcs dengan peluang
  `clamp(1.6 − hargaJual/hargaPasar, 0, 1)` (harga pasar → 60%, 1,3× → 30%, ≥1,6× → 0%).
- Layani langsung: maks 3 baris × 3 pcs, jeda minimal 4 detik antar layanan, bonus 10% bila harga ≤ harga pasar.
- Beli dari warung pemain: 1–5 pcs, pembeli wajib punya warung, tidak bisa beli dari warung sendiri,
  stok masuk ke warung pembeli (dibatasi stok maks pembeli).
- Semua aksi tulis memakai `requestId` (idempotent). Riwayat di `world_warung_journal` = buku kas.
- Kunci: baris `users` aktor → baris `world_warungs` diurutkan id (tidak ada deadlock antar dua pembeli).

## API (Laravel `POST /api/world/warung`, lewat BFF operasi `warung`)

`action`: `read` · `open{name}` · `restock{requestId,itemId,qty}` · `price{itemId,price}` ·
`serve{requestId,items[{itemId,qty}]}` · `upgrade{requestId}` · `visit{warungId}` ·
`buy{requestId,warungId,itemId,qty}` · `directory{room?}`.
Respons `read`/aksi pemilik = snapshot pemilik (`catalog`, `levels`, `warung`, `settled`, `journal`).
`visit`/`buy` mengembalikan `visit` (warung publik tanpa Kas) + `warung` milik sendiri.
Kill switch: `WORLD_WARUNG_ENABLED=false` → 503.

## Dunia 3D (frontend)

- Interior warung adalah scene tersendiri (seperti Club): saat di dalam warung, kota tidak dirender → ringan di HP.
- Lokasi interior: area terpisah `x≈3000`, slot `z = 3000 + (warungId mod 32) × 80`. Pemain lain hanya terlihat
  jika berada di slot yang sama (aturan visibilitas di `RemotePlayers`, sama polanya dengan gunung/club).
  *Shortcut*: dua warung berbeda dengan slot sama yang dikunjungi bersamaan di channel yang sama akan saling
  melihat pengunjung — upgrade ke slot dari server bila warung aktif > 32 per channel.
- Pintu masuk: aplikasi **Warungku** di HP dalam game. Keluar → kembali ke posisi sebelum masuk.

## v1.1 — Kavling kota + kerja part-time

- **Kavling**: 15 rumah (`kind: "house"`, urutan `WARUNG_LOTS` = indeks server, `lot_count`) bisa menampilkan warung.
  Per channel, server mengisi kavling dengan warung pemilik yang sedang online (level, lalu jualan), lalu warung
  terlaris yang pemiliknya offline (papan "Dijaga NPC"). Susunan di-cache 60 detik dan lengket: warung tetap di
  kavlingnya selama masih kandidat. Rumah tetap berdiri; di depannya muncul gerobak (level 1) atau etalase + kanopi
  (level 2+), papan nama, pemilik, status, dan "Lowongan part-time". Berdiri di depan kavling → tombol **Masuk warung**.
- **Part-time**: pemilik menyalakan *Buka lowongan* di Warungku. Pemain lain di dalam warung itu bisa **Kerja part-time**
  (mini-game yang sama). Penjualan masuk Kas pemilik dikurangi upah 20% untuk pekerja. Pekerja tanpa warung menabung
  upahnya (`world_warung_savings`) dan tabungan itu ditambahkan ke modal saat membuka warung. Jeda 4 detik, maks 60
  layanan per jam per pekerja.
- API tambahan: `lots{room}`, `hire{hiring}`, `work{requestId,warungId,items}`.

## Di luar v1 (berikutnya)

Job kasir/kurir di Toko Cung untuk modal, Gang/RT bersama, Pasar Malam
mingguan, Adu Laris antar pemain, dekorasi warung (kosmetik), NPC berkarakter dengan cerita kecil,
kalender event (Ramadan, 17-an, Lebaran).
