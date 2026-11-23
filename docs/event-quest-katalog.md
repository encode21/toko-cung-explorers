# Katalog Event, Quest & Side Quest NPC

Status per 2026-11-23. Sumber kebenaran ada di backend `toko-cung` (config + `world_quests` / `world_daily_definitions`); dokumen ini hanya peta.

## Ringkasan status

| Sistem | Status | Kontrol |
|---|---|---|
| Event **MINI_GAME** | Aktif (satu-satunya tipe event) | `/world-admin` → MINI_GAME |
| Event STORE_RUSH, WAREHOUSE_RUSH, COURIER_PICKUP, NATIONAL_DAY | **Dihapus** (FE `reactive-world/` + tipe BE) | — |
| Dungeon Principal | **Dinonaktifkan sementara** | BE `WORLD_DUNGEON_ENABLED=true` + FE `DUNGEON_ENABLED` di `src/game/dungeon/DungeonRuntime.tsx` |
| Quest utama (board) | Aktif | `world_quests` / World Editor |
| Daily quest | Ikut `WORLD_DAILY_ENABLED` | `config/world_daily.php` |
| Buku Kulakan Mbah (quest NPC) | Ikut `WORLD_STORY_ENABLED` | `config/world-story.php` |
| Misi Supir Pengiriman (truk) | Aktif, tidak bergantung event | `src/game/missions/` |

## 1. Event: Mini-game alun-alun

Dijadwalkan admin (mulai/selesai WIB), 2–8 pemain per room, hadiah badge saja (tanpa Point). Detail teknis: [minigames.md](minigames.md).

| Game | Cara main | Badge |
|---|---|---|
| `QUIZ` Benar atau Salah | Lari ke zona B (barat) / S (timur), 5 soal × 8 detik | Cermat Alun-alun |
| `SACK` Balap Karung | 12 lompatan lintasan 24 m, batas 60 detik | Lompat Juara |
| `CHICKEN` Tangkap Ayam | Dekati ayam di arena, tekan Tangkap | Sahabat Ayam |

## 2. Quest utama (Quest Board)

| ID | Judul | Ulang | Hadiah | Tujuan |
|---|---|---|---|---|
| `intro` | Kenalan dengan Toko Cung World | ONCE | 100 XP | Pintu toko → sapa Nakama Gudang → jelajah gudang → kembali ke board |
| `easter-egg` | Rahasia Dunia Toko Cung · Chapter 1 | ONCE | 200 XP + 300 Point | 7 petunjuk berurutan (depan toko, Nakama Gudang, area pickup, label tersembunyi, alur operasional, teka-teki jalanan, arsip terakhir) |
| `supplier-run` | Supplier Run · Prototipe | DAILY | 300 XP + 750 Point | Pos supplier → ambil peti → antar ke pintu gudang |
| `pahlawan-*` (5 quest) | Jejak Pahlawan | ONCE/DAILY | 100 XP + Point | Kampanye `pahlawan-2026`, berakhir 17 Nov 2026 (data tetap, quest sudah tidak aktif) |

Quest lama `store-rush` (Bantu Kasir) dan `warehouse` (Bantu Gudang) masih ada di seed karena target dunianya dipakai daily quest, tetapi **disembunyikan dari board dan tidak bisa diterima** (punya `event_type`).

Quest `principal-*` (7 quest kategori DUNGEON) disembunyikan selama dungeon dimatikan.

## 3. Daily quest (pool `daily_toko_cung`)

Dipilih acak per hari dari definisi yang targetnya aktif. Hadiah XP per quest + bonus 150 XP set lengkap.

- **Eksplorasi** (40–60 XP): Mampir ke Pintu Toko, Cek Gudang, Cek Area Kasir, Cek Kiosk, Sapa Area Supplier, Jejak di Depan Toko, Jelajah Area Pickup, Jelajah Area Arsip; rute Keliling Toko, Rute Supplier, Cari Petunjuk, Cek Sekitar.
- **Interaksi NPC** (40–50 XP): Sapa Koko Cung, Kenalan Lagi, Bantu Staff, Kenalan Sama Warga (3 NPC), Sapa Tetangga, Kabar dari Gudang, Cerita Warga.
- **Toko** (70 XP): Paket Datang, Kurir Dadakan, Antar Peti Supplier (ambil → antar).
- **Aksi** (50 XP): Bantu Kasir (scan), Periksa Papan Quest, Pemburu Rahasia; Jalan-Jalan Dulu (300 m, 40 XP).
- **Dungeon** (80 XP): Dungeon Scout / Dungeon Hunter — **tidak ditawarkan** selama dungeon dimatikan.

## 4. Side quest NPC: Buku Kulakan Mbah

Satu halaman = satu tujuan dari NPC (50 XP per halaman). Setiap bagian ditutup oleh "puncak" (target jangka panjang). Pemain memilih jalur awal: warung teras atau ojol.

### Jalanan (ojol)
Puncak: punya motor sendiri, 50 trip, rating ≥ 4,5.

| Halaman | NPC | Tujuan |
|---|---|---|
| Modal pertama | Bang Dimas | 3 trip dengan motor juragan |
| Hafal jalan | Bang Dimas | Antar ke 5 tempat berbeda |
| Bawa amanah | Mbak Sari | 10 trip berturut-turut tanpa batal |
| Motor sendiri | Juragan motor | Beli motor bebek sendiri |

### Dagang (warung)
Puncak: warung level 4 dan 1 karyawan.

| Halaman | NPC | Tujuan |
|---|---|---|
| Warung Teras | Koko Cung | Selesaikan bab Warung Teras |
| Kulakan + Ojol Kelaparan | Ci Mei | Selesaikan kedua bab |
| Tagihan pertama + Utang Bu Romlah | Pak RT Kosim | Selesaikan kedua bab |
| Naik ke Kelontong + Pelanggan Setia | Koko Cung | Selesaikan kedua bab |
| Tangan kanan | Bu Romlah | Punya satu karyawan |
| Saingan + Naik ke Toko | Koko Cung | Selesaikan kedua bab |
| Tetangga sebelah | Bu Romlah | Beli stok dari warung pemain lain |
| Jadi Agen | Koko Cung | Selesaikan bab Jadi Agen |

### Dapur (warteg)
Puncak: 7 hari memasak tanpa basi.

| Halaman | NPC | Tujuan |
|---|---|---|
| Dapur pertama | Bu Romlah | Beli unit warteg |
| Belanja secukupnya | Ci Mei | Belanja bahan warteg di Toko Cung |
| Lodeh Mbah | Bu Romlah | Masak satu batch sayur lodeh |
| Makan siang | Pak RT Kosim | Layani satu pembeli warteg |
| Belajar dari sisa | Bu Romlah | Lewati kejadian porsi basi pertama |

### Kos
Puncak: 7 hari kos penuh.

| Halaman | NPC | Tujuan |
|---|---|---|
| Denah impian | Koko Cung | Beli unit kos |
| Tempat pulang | Mbak Sari | Sambut penghuni pertama |
| Telat bukan hilang | Mbak Sari | Tanggapi telat bayar: tagih atau maafkan |
| Dengar keluhan | Pak RT Kosim | Tanggapi satu keluhan penghuni |
| Rumah yang dirawat | Mbak Sari | Renovasi kos satu kali |

## 5. Misi opsional

- **Supir Pengiriman** (`TRUCK_DELIVERY`): muat 3 paket di depan toko → kemudikan truk → bongkar di gudang belakang. Kontribusi +1, satu kali per sesi room.

## Mengaktifkan kembali dungeon Principal

1. Backend: `WORLD_DUNGEON_ENABLED=true`, lalu `php artisan config:cache`.
2. Frontend: ubah `DUNGEON_ENABLED` ke `true` di `src/game/dungeon/DungeonRuntime.tsx`, lalu build & deploy.

Saat dimatikan, pemain yang masih di instance (room `DNG-`) tetap bisa resume/keluar; pemain baru tidak bisa masuk.
