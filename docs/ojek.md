# Ojek

Narik ojek di kota: beli motor pakai **Kas usaha** (dompet bersama warung, `world_warungs.cash`), lalu antar penumpang NPC untuk menambah Kas. Bukan World Point, bukan poin App.

## Alur pemain

1. Buka warung dulu (Kas usaha baru ada setelah warung dibuka).
2. HP → app **Ojek** → Dealer Motor → beli motor. Hanya bisa naik tier (tidak ada tukar tambah).
3. **Ambil penumpang** → server memilih titik jemput & tujuan dari daftar spot kota. Penanda (Waypoint) menunjuk titik jemput; penumpang NPC berdiri di sana.
4. Naik motor/skuter mana saja dari parkiran kota sebagai pengemudi, datang ke titik jemput (≤ 4 m) → penumpang naik, penanda pindah ke tujuan.
5. Sampai di tujuan (≤ 4 m, masih di motor) → `complete` → ongkos masuk Kas usaha.

## Aturan server (`POST /api/world/ojek`, `App\Services\World\WorldOjek`)

| action | input | aturan |
|---|---|---|
| `read` | – | snapshot; tanpa warung → `hasWarung: false` |
| `buy_motor` | `requestId`, `model` | wajib warung (409 `Buka warung terlebih dahulu.`), Kas cukup (422), hanya upgrade (409). Debit via `WarungKas::move(type MOTOR)` |
| `accept` | `requestId` | wajib motor; satu order aktif (accept lagi mengembalikan order yang sama); cap per jam (429) |
| `complete` | `requestId`, `orderId` | order milik pemain, `active`, belum kedaluwarsa (409), waktu minimum `max(min_trip_seconds, jarak / max_speed_mps)` (422), cap per jam (429). Kredit via `WarungKas::move(type OJEK)` |

- Ongkos = `round((fare_base + fare_per_meter × jarak) × fare_percent motor / 100, fare_round)`.
- Idempotent: `requestId` disimpan di `world_warung_journal` (buy/complete) atau `world_ojek_orders.request_id` (accept). Replay mengembalikan snapshot tanpa memotong/menambah Kas lagi.
- Pendapatan `OJEK` **tidak** masuk `WarungKas::SALES` → tidak dihitung di leaderboard warung (leaderboard = penjualan warung).
- Konfigurasi: `config/world-ojek.php` (motor, spot kota x/z, tarif, batas). Spot dikirim server di setiap order, frontend tidak menyimpan daftar spot.

## Frontend

- `src/game/ojek/store.ts` – store, `ojekCommand`, `ojekTick` (cek jemput/antar tiap 500 ms memakai `ownVehicle()` + `vehicleHeartbeat()`).
- `src/game/ojek/OjekPassenger.tsx` – NPC penumpang (avatar NPC yang sudah ada, tanpa lampu baru).
- `src/ui/hud/OjekPanel.tsx` – dealer + tombol Ambil penumpang (app HP `ojek`).
- Hook kecil: BFF op `ojek` (`api.functions.ts`, `contracts.ts`), waypoint `ojek-pickup`/`ojek-dropoff` (`map-destinations.ts`), sheet/app HP, mount di `GameCanvas.tsx`.

## Batasan yang disengaja

- Motor milik pemain **tidak di-spawn sebagai kendaraan sendiri**: kendaraan kota adalah pool bersama milik server (`WorldVehicles` slot per room). Pemain narik pakai motor/skuter pool; tier motor yang dibeli menentukan pengali ongkos. Spawn motor pribadi butuh perubahan `WorldMobility/WorldVehicles` (follow-up).
- Status "penumpang sudah naik" hanya di klien; server hanya memvalidasi waktu minimum, kedaluwarsa, dan cap. Validasi posisi (presence) bisa ditambah seperti `kulakan_area` warung bila ada penyalahgunaan.
- Tidak ada `cancel`; order kedaluwarsa sendiri setelah `order_expire_seconds` (240 s).
