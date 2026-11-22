# Warteg & Kos-kosan (usaha lanjutan)

Dua usaha yang dibeli dan dijalankan dengan **Kas usaha** (`world_warungs.cash`, dompet warung yang sama).
Simulasi saja: tidak pernah menyentuh World Point atau loyalty App. Semua angka server-authoritative
(`toko-cung`: `app/Services/World/WorldUsaha.php`, `config/world-usaha.php`).

## API

`POST /api/world/usaha` (BFF operation `usaha`). Setiap aksi mengembalikan snapshot penuh
(`kas`, `catalog`, `warteg`, `kos`, `settled`). Semua tulis kecuali `harga`/`sewa` wajib `requestId` (uuid);
replay dengan `requestId` yang sama tidak mengubah apa pun (receipt di `world_warung_journal`).

| action | field | efek |
|---|---|---|
| `read` | – | settle offline lalu snapshot |
| `buy` | `business: warteg\|kos` | butuh warung (dompet); debit `BUKA_WARTEG` / `BUKA_KOS` |
| `belanja` | `itemId`, `qty` | beli bahan warteg (maks 50 per bahan) |
| `masak` | `recipeId`, `qty` (kali masak) | bahan → porsi menu hari ini; kapasitas dapur 60 porsi/hari WIB |
| `harga` | `recipeId`, `price` | ½×–2× harga pasar |
| `layani` | `recipeId`, `qty` 1–3 | layani langsung; cooldown 4 dtk, maks 60/jam, tip 10% bila harga ≤ pasar |
| `sewa` | `rent` (per bulan) | ½×–2× sewa pasar kualitas saat ini |
| `kamar` | – | +1 kamar (Rp300rb, maks 12) |
| `renovasi` | – | kualitas +1 (Kos AC Rp800rb, Eksklusif Rp2jt); sewa diset ke sewa pasar baru |
| `kos_event` | `choice: accept\|decline` | jawab kejadian kos |

## Harga beli (kenapa segini)

Modal awal warung Rp50rb; warung L1–L3 menghasilkan kira-kira Rp40–150rb per hari main (offline cap 8 jam).

- **Warteg Rp750rb** ≈ 1–2 minggu main warung (di atas upgrade Warung L3 Rp400rb). Untung maks ±Rp100–180rb/hari
  (60 porsi × margin ±50%), balik modal ±5–7 hari.
- **Kos Rp1,5jt** ≈ 3–4 minggu warung, atau lebih cepat setelah warteg jalan. 4 kamar × Rp600rb/bulan = Rp80rb/hari
  saat penuh, balik modal ±19 hari; pasif dan cocok untuk kembali harian.

## Warteg

- Resep (bahan → porsi, harga pasar): Nasi Telur Balado (beras, 2 telur, cabai → 4, Rp6rb), Nasi Tempe Sayur
  (→ 4, Rp6rb), Sayur Lodeh (2 sayur, santan → 6, Rp3rb), Nasi Ayam Goreng (beras, ayam → 4, Rp12rb). Modal per porsi ±50%.
- Pembeli NPC offline: 12/jam, cap 480 menit & 120 pembeli per settle; peluang beli = `clamp(1.6 − harga/pasar)`
  (sama dengan warung). Jam settle maju sebanyak waktu pembeli yang datang.
- **Basi**: saat settle pertama di hari WIB baru, penjualan dihitung sampai 00.00, lalu semua porsi sisa menjadi 0 dan
  dicatat `WARTEG_BASI` (qty = porsi, amount 0 — bahan sudah dibayar, itulah kerugiannya).

## Kos-kosan

- Per hari WIB yang lewat (maks 3 hari dihitung): kamar kosong terisi dengan peluang
  `clamp(1.6 − sewa/pasar) × reputasi/100`; sewa harian = sewa/30 per penghuni; reputasi < 40 → 1 penghuni pindah/hari;
  tanpa kejadian reputasi +1/hari.
- Kejadian (25%/hari, satu aktif): **telat bayar** — sewa penunggak tertahan; Tagih = dapat tunggakan, reputasi −3;
  Maafkan = tunggakan hilang, reputasi +3. **Keluhan** — Perbaiki = bayar Rp40rb × kualitas, reputasi +3;
  Abaikan = reputasi −10. Tidak dijawab > 2 hari: penghuninya pindah (keluhan juga −10 reputasi).

## Frontend

- `src/game/usaha/`: `model.ts` (tipe, lot, posisi ruangan), `store.ts` (zustand + `usahaCommand`), `UsahaLots.tsx`
  (papan nama di depan ruko `infill-south-1` = warteg, `infill-south-3` = kos), `UsahaScene.tsx` (ruangan instance, satu
  `StyledBatch` + collider, tanpa lampu baru).
- `src/ui/hud/UsahaHud.tsx`: prompt di depan lot (Lihat/Masuk), bar di dalam ruangan (Layani/Kelola/Keluar), panel
  `GameModal` untuk beli & kelola.
- Ruangan berada di grid slot warung (x = 3022, slot 30/31) supaya Player memperlakukannya sebagai ruangan off-grid
  (teleport tepat, tanpa snap ke trotoar). `RemotePlayers` menyembunyikan pemain lain di ruangan usaha (privat).
- Hook kecil: `GameCanvas.tsx` (render `UsahaScene` menggantikan kota, `UsahaLots` di kota), `Hud.tsx`,
  BFF `api.functions.ts` + `contracts.ts`.

## Belum

- Belum diuji di browser/HP (hanya `tsc` + eslint). Kamera ruangan memakai kamera orbit default, bukan diorama warung.
- Penjualan warteg tidak masuk `total_sales`/leaderboard warung (`WarungKas::SALES` tidak diubah).
- Belanja bahan bisa dari mana saja (tidak wajib ke Toko Cung seperti kulakan warung).
