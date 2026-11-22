# Ojek

Narik ojek di kota: beli motor pakai **Kas usaha** (dompet bersama warung, `world_warungs.cash`), lalu antar penumpang NPC untuk menambah Kas. Bukan World Point, bukan poin App.

## Alur pemain

1. Buka warung dulu (Kas usaha baru ada setelah warung dibuka).
2. HP → app **Ojek** → Dealer Motor → beli motor. Hanya bisa naik tier (tidak ada tukar tambah).
3. **Ambil penumpang** → server memilih titik jemput & tujuan dari daftar spot kota. Penanda (Waypoint) menunjuk titik jemput; penumpang NPC berdiri di sana.
4. Naik motor/skuter mana saja dari parkiran kota sebagai pengemudi, datang ke titik jemput (≤ 4 m) dan **berhenti** (< 0,6 m/s). Penumpang berjalan ke jok belakang (1,8 s); kalau motor jalan sebelum selesai, naiknya batal dan penumpang protes. Setelah naik, penumpang duduk di jok belakang dan penanda pindah ke tujuan.
5. Selama perjalanan penumpang berkomentar sesuai tipenya (`src/game/ojek/passenger.ts`, tes `tests/ojek.test.mjs`):
   - **Buru-buru**: protes kalau < 6 m/s selama 4 s.
   - **Penakut**: protes kalau rem/gas mendadak (> 11 m/s²) atau belok tajam saat kencang.
   - **Cerewet**: protes dua-duanya dengan ambang menengah.
   - **Santai**: hanya protes kalau sangat ngawur.
   Jeda antar-komentar 6 detik. Komentar hanya kosmetik, tidak mengubah ongkos.
6. Berhenti di tujuan (≤ 4 m) → `complete` → ongkos masuk Kas usaha.

### Pesan ojek ke pemain lain

1. Penumpang (wajib punya warung): app Ojek → Pesan Ojek → pilih tujuan → **Pesan**. Server memakai posisi heartbeat mobility (`world_mobility_connections`) sebagai titik jemput dan channel-nya. Ongkos (tarif dasar 100%) **ditahan** dari Kas usaha (`OJEK_PAY`).
2. Driver (punya motor, channel yang sama): daftar "Order dari pemain" → **Ambil** (`claim_ride`). Penanda menunjuk lokasi penumpang.
3. Driver berhenti di dekat penumpang → tombol **Ajak bonceng** yang sudah ada → penumpang menekan Terima.
4. Driver berhenti di tujuan → `complete_ride`. Server membayar hanya jika `world_vehicles` menunjukkan driver di jok 0 dan penumpang aktif di jok lain pada motor/skuter yang sama, dengan pose motor ≤ 8 m dari tujuan, waktu minimum terpenuhi, dan cap per jam belum habis. Ongkos masuk Kas driver (`OJEK`, counterparty = warung penumpang).
5. Batal (`cancel_ride`) atau tidak ada driver dalam 300 s, atau driver tidak sampai dalam 420 s → ongkos dikembalikan (`OJEK_REFUND`, dihitung saat penumpang memanggil API berikutnya; penumpang polling tiap 4 s).

## Aturan server (`POST /api/world/ojek`, `App\Services\World\WorldOjek`)

| action | input | aturan |
|---|---|---|
| `read` | – | snapshot; tanpa warung → `hasWarung: false` |
| `buy_motor` | `requestId`, `model` | wajib warung (409 `Buka warung terlebih dahulu.`), Kas cukup (422), hanya upgrade (409). Debit via `WarungKas::move(type MOTOR)` |
| `accept` | `requestId` | wajib motor; satu order aktif (accept lagi mengembalikan order yang sama); cap per jam (429) |
| `complete` | `requestId`, `orderId` | order milik pemain, `active`, belum kedaluwarsa (409), waktu minimum `max(min_trip_seconds, jarak / max_speed_mps)` (422), cap per jam (429). Kredit via `WarungKas::move(type OJEK)` |
| `order_ride` | `requestId`, `dropoff` | penumpang; satu pesanan aktif; jarak ≥ 15 m; Kas ditahan |
| `cancel_ride` | `requestId`, `rideId` | penumpang; refund |
| `rides` | – | driver; pesanan terbuka di channel yang sama (maks 10) |
| `claim_ride` | `rideId` | driver punya motor, satu job aktif, bukan pesanan sendiri, channel sama |
| `complete_ride` | `requestId`, `rideId` | lihat validasi `world_vehicles` di atas |

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

- Order NPC: status "penumpang sudah naik" hanya di klien; server hanya memvalidasi waktu minimum, kedaluwarsa, dan cap. (Pesanan pemain divalidasi lewat `world_vehicles`.)
- NPC penumpang hanya terlihat oleh driver itu sendiri (lokal, tidak disinkronkan ke pemain lain). Validasi posisi (presence) bisa ditambah seperti `kulakan_area` warung bila ada penyalahgunaan.
- Tidak ada `cancel`; order kedaluwarsa sendiri setelah `order_expire_seconds` (240 s).

## Opsi A — setoran & motor sendiri

Motor/mobil umum tetap gratis untuk jalan-jalan. Narik ojek wajib **sedang mengemudikan motor** (dicek server
dari kursi pengemudi di pool kendaraan room, saat terima order dan saat antar):

- Motor umum = motor juragan: **setoran 40%** dipotong dari ongkos (`public_setoran_percent`).
- Motor sendiri (beli pakai Kas usaha): tanpa setoran + bonus tier (`fare_percent`), dan bisa
  **Panggil motorku** (aksi mobility `vehicle-summon`) di dekat pemain. Motor pribadi masuk pool room
  (pemain lain melihatnya), hanya pemilik yang bisa jadi pengemudi, satu per pemain, hilang setelah 60 dtk
  tidak dipakai. Snapshot kendaraan memberi `personal` / `mine`, bukan id pemilik.
- Pesanan pemain: `claim_ride` juga wajib sedang mengemudi motor. Motor sendiri menerima seluruh ongkos yang dibayar penumpang (tanpa bonus tier, supaya tidak mencetak Kas); motor umum dipotong setoran.
- Migrasi aditif: `2026_11_24_100000_add_ojek_personal_motor_and_setoran`.

## Narik tanpa warung (modal awal)

Belum punya warung tetap bisa narik ojek NPC atau mengambil pesanan pemain dengan **motor umum** (setoran 40%). Hasilnya masuk `world_warung_savings` (sama seperti gaji part-time) dan menjadi modal tambahan saat warung dibuka. Pesan ojek dan beli motor tetap butuh warung (Kas usaha). Idempotensi tanpa jurnal: `complete_request_id` di `world_ojek_orders` / `world_ojek_rides` (migrasi `2026_11_25_120000_create_world_ojek_rides`, yang juga membuat tabel pesanan pemain — migrasi ojek awal sudah di `main`, jadi tidak diubah).
