# Sistem Pengantaran Warung (Delivery System)

> Spesifikasi fitur pengantaran barang berdasarkan level warung. Setiap naik level,
> armada dan mekanisme pengantaran berkembang — dari antar sendiri pakai motor sampai
> mengelola kurir NPC dan truk. Tujuan edukasi: membuka toko sembako tidak semudah
> yang dibayangkan — margin tipis, pelanggan rewel, operasional kompleks.

Status: **draft** — 28 November 2026.

---

## Konteks yang ada

| Sistem | Status | Relevansi |
|---|---|---|
| Warung sendiri (`warung-sendiri.md`) | Aktif | Kas usaha, level 1–5, kulakan, layani langsung, cerita, kavling kota |
| Ojek (`ojek.md`) | Aktif | Motor pribadi, motor umum, narik penumpang NPC/pemain, Kas masuk |
| Kendaraan (`vehicles.md`) | Aktif | Pool 11 kendaraan shared, model motor/mobil/truk, Rapier physics |
| Misi truk (`truck-mission.md`) | Aktif | Muat 3 paket → kemudi truk → bongkar di gudang |
| Warteg & Kos (`warteg-kos.md`) | Aktif | Usaha lanjutan pakai Kas yang sama |
| Reactive World (`reactive-world.md`) | Aktif | COURIER_PICKUP event |
| Buku Kulakan Mbah (`event-quest-katalog.md`) | Aktif | Side quest NPC, jalur Dagang |

### Level warung yang ada vs. yang direvisi

Dokumen `warung-sendiri.md` memakai nama: Gerobak → Kios → Warung → Toko Kelontong → Minimarket.
Permintaan user merevisi nama dan fokus:

| Level | Nama lama | **Nama baru** | Unlock delivery |
|---|---|---|---|
| 1 | Gerobak | **Warung Teras** | ❌ Belum ada delivery |
| 2 | Kios | **Warung Kelontong** | 🏍️ 1 motor, antar sendiri |
| 3 | Warung | **Toko** | 🛺 1 Viar (motor roda tiga) |
| 4 | Toko Kelontong | **Agen** | 🛺🛺 2 Viar + 🏍️🏍️ 2 motor |
| 5 | Minimarket | **Grosir** | 🚛 1 truk + kurir NPC wajib ada |

---

## Alur besar: dari pesanan sampai sampai

```
┌──────────────┐    pesanan     ┌──────────────┐    assign     ┌──────────────┐
│  NPC Pembeli │───────────────▶│  Daftar Order │───────────────▶│  Dispatch    │
│  (chat/visit)│    (otomatis/  │  (Warungku →  │   (player     │  (kirim kurir│
│              │     chat HP)   │   Pesanan)    │    pilih)     │   atau antar │
└──────────────┘               └──────────────┘               │   sendiri)   │
                                                               └──────┬───────┘
                                                                      │
                                              ┌───────────────────────┼────────────────────┐
                                              │                       │                    │
                                        ┌─────▼─────┐          ┌─────▼─────┐        ┌─────▼─────┐
                                        │  Motor    │          │  Viar     │        │  Truk     │
                                        │  (1-2 dus)│          │  (3-5 dus)│        │  (8+ dus) │
                                        │  Player/  │          │  Player/  │        │  Kurir NPC│
                                        │  NPC kurir│          │  NPC kurir│        │  / Player │
                                        └─────┬─────┘          └─────┬─────┘        └─────┬─────┘
                                              │                       │                    │
                                              └───────────────────────┼────────────────────┘
                                                                      │
                                                                ┌─────▼─────┐
                                                                │  Antar ke │
                                                                │  rumah NPC│
                                                                │  (kampung/│
                                                                │   kota)   │
                                                                └─────┬─────┘
                                                                      │
                                                              ┌───────▼───────┐
                                                              │  Selesai:     │
                                                              │  Kas masuk,   │
                                                              │  rating,      │
                                                              │  gimmick event│
                                                              └───────────────┘
```

---

## 1. Sumber pesanan: NPC pesan antar

### 1a. NPC datang langsung (sudah ada)
Pembeli NPC yang datang ke warung bisa minta *antar*. Saat layani langsung,
5% peluang pembeli bilang: *"Bisa diantar ke rumah nggak? Tambah ongkir."*
Player memilih **Antar** (masuk daftar order) atau **Ambil sendiri** (transaksi
selesai seperti biasa, tanpa ongkir).

### 1b. NPC pesan lewat chat HP (fitur baru)
App **Chat Toko** di HP dalam game. NPC mengirim pesan teks ke player:

```
Bu Romlah: "Mas, minyak goreng 2 sama beras 1 bisa diantar? 🙏"
```

Player bisa:
- **Terima** → pesanan masuk daftar order, stok dicadangkan.
- **Tolak** → NPC kecewa, reputasi warung −1 (ringan).
- **Diamkan** → 3 menit kedaluwarsa, NPC kecewa.

Mekanisme chat:
- Server generate pesan NPC berdasarkan stok warung yang tersedia dan lokasi NPC.
- Frekuensi: 1 pesan setiap 8–15 menit game (= 20–38 detik real), saat warung buka.
- NPC yang sudah punya pesanan aktif tidak memesan lagi.
- Maks 5 pesanan antar aktif bersamaan (termasuk dari kedua sumber).
- Chat hanya tampil di app HP; notifikasi bubble di ikon Chat.

### Lokasi tujuan NPC

Rumah-rumah NPC tersebar di dua area:
- **Kampung**: 15 kavling rumah yang sudah ada (`WARUNG_LOTS` / `BUILDING_LOTS` kind `house`),
  termasuk rumah Bu Romlah, Mang Ujang, Pak RT Kosim, dsb.
- **Kota (east-town)**: rumah warga di area Pasar Cung, Alun-alun, Taman Kota.
  Spot tujuan: waypoint baru `delivery-house-01` s.d. `delivery-house-20`.

Setiap NPC punya alamat tetap (posisi x/z). Server mengirim posisi bersama pesanan;
frontend menampilkan waypoint seperti ojek pickup/dropoff.

---

## 2. Armada per level

### Level 2 — Warung Kelontong: 1 Motor

**Unlock**: upgrade warung ke level 2 (biaya Rp150.000).

| Aspek | Detail |
|---|---|
| Kendaraan | Motor pribadi (bebek/matic/touring yang sudah dimiliki dari ojek, atau beli baru). Kalau belum punya motor → beli lewat Dealer di app Ojek |
| Kapasitas | 1–2 dus per trip |
| Siapa antar | **Player saja** (belum ada kurir NPC) |
| Mekanisme | Ambil paket di warung → naik motor → antar ke rumah NPC → serahkan → Kas masuk |
| Ongkir | Tarif dasar Rp500 + Rp50/meter jarak |
| Batas | 1 pesanan per trip; 1 trip aktif |

**Flow player (Level 2)**:
1. Buka **Warungku → Pesanan Antar** → lihat daftar order.
2. Pilih pesanan → **Siapkan** → paket muncul di rak khusus dekat pintu.
3. Keluar warung → mendekati paket → **Ambil Paket** (paket visual di punggung/jok).
4. Naik motor → waypoint tujuan muncul di minimap.
5. Sampai di rumah NPC (≤ 4 m) → berhenti → **Serahkan** → NPC muncul di depan rumah.
6. NPC bayar → Kas masuk (harga barang + ongkir).

### Level 3 — Toko: 1 Viar

**Unlock**: upgrade warung ke level 3 (biaya Rp400.000). Viar otomatis tersedia
di depan warung setelah upgrade (tidak perlu beli terpisah).

| Aspek | Detail |
|---|---|
| Kendaraan | 1 Viar (motor roda tiga dengan bak belakang) — model baru di `vehicles/definitions.ts` |
| Kapasitas | 3–5 dus per trip |
| Siapa antar | **Player saja** |
| Mekanisme | Muat beberapa paket ke bak Viar → antar ke beberapa rumah (rute multi-stop) |
| Ongkir | Tarif dasar Rp1.000 + Rp40/meter per pesanan |
| Batas | Maks 3 pesanan per trip (multi-drop); 1 trip aktif |

**Flow player (Level 3)**:
1. **Warungku → Pesanan Antar** → pilih hingga 3 pesanan → **Muat ke Viar**.
2. Paket muncul di bak Viar (visual 3D boxes di bak).
3. Naik Viar → waypoint pertama tampil (rute diurutkan jarak terdekat dulu).
4. Tiap titik: berhenti → **Serahkan** → NPC keluar → bayar.
5. Setelah semua selesai → kembali ke warung (opsional).

**Viar sebagai kendaraan baru**:
- Roda tiga: 1 depan (steer), 2 belakang.
- Kecepatan maks 7 m/s (lebih lambat dari motor).
- Bak belakang menampilkan dus sesuai muatan.
- Hanya pemilik warung yang bisa mengendarai Viar miliknya.
- Parkir default: depan kavling warung.

### Level 4 — Agen: 2 Viar + 2 Motor

**Unlock**: upgrade ke level 4 (biaya Rp1.000.000).

| Aspek | Detail |
|---|---|
| Kendaraan | 2 Viar + 2 motor (motor kedua = gratis, Viar kedua = gratis) |
| Kapasitas | Motor 1–2 dus, Viar 3–5 dus |
| Siapa antar | **Player ATAU Kurir NPC** (unlock kurir NPC!) |
| Kurir NPC | Bisa mempekerjakan maks 2 kurir NPC. Gaji: 20% ongkir per pengantaran |
| Mekanisme | Player sebagai dispatcher: assign pesanan ke kendaraan + kurir |
| Batas | Maks 8 pesanan aktif; 3 trip bersamaan (player + 2 kurir NPC) |

**Flow dispatcher (Level 4)**:
1. **Warungku → Pesanan Antar** → daftar order yang menumpuk.
2. **Dispatch panel**: pilih pesanan → assign ke:
   - **Antar sendiri** → flow seperti level 2/3.
   - **Kurir [nama NPC]** → pilih kendaraan (Motor 1/2 atau Viar 1/2).
3. Kurir NPC yang di-assign:
   - Muncul jalan dari warung → ambil paket → naik kendaraan.
   - Mengemudi ke tujuan secara otomatis (AI pathfinding di road network).
   - Serahkan barang → kembali ke warung → lapor selesai.
   - Waktu tempuh = `jarak / 5 m/s` + 30 detik loading.
4. Player memonitor lewat **Tracking panel** (ikon di minimap + status per kurir).

**Kurir NPC**:
- Harus digaji! Total gaji = 20% dari ongkir per trip + gaji harian Rp5.000 × level.
- Kurir bisa *ngambek* kalau terlalu banyak pesanan (> 10 trip/hari): protes via chat.
- Kurir bisa *salah antar* (2% peluang): barang sampai tapi NPC komplain → reputasi −2.
- Kurir punya nama dan karakter (Mas Budi, Bang Joko, dsb.)

### Level 5 — Grosir: Truk + Armada Lengkap

**Unlock**: upgrade ke level 5 (biaya Rp2.500.000).

| Aspek | Detail |
|---|---|
| Kendaraan | 1 truk (8–15 dus) + 2 Viar + 2 motor |
| Kapasitas total | Bisa handle 20+ pesanan/hari |
| Siapa antar | **Wajib punya minimal 1 kurir NPC untuk truk** |
| Kurir NPC | Maks 4 kurir; 1 supir truk khusus |
| Mekanisme | Full dispatch: multi-rute, multi-kendaraan, gaji, tracking |
| Batas | Maks 15 pesanan aktif; 5 trip bersamaan |

**Flow manajer (Level 5)**:
1. **Pesanan membanjir** lewat chat HP — lebih banyak NPC yang pesan antar karena
   reputasi Grosir menarik pelanggan dari area lebih luas.
2. **Dispatch board** (layar penuh di Warungku):
   - Daftar pesanan: diurutkan waktu, bisa filter area (kampung/kota).
   - Armada: status tiap kendaraan (tersedia/di jalan/rusak).
   - Kurir: status (siap/antar/istirahat), trip hari ini, mood.
3. **Assign truk**:
   - Pilih pesanan besar (5+ dus atau 3+ alamat berdekatan).
   - **Supir truk** = kurir NPC khusus (gaji lebih tinggi: 25% ongkir + Rp10.000/hari).
   - Truk keluar dari loading area warung → rute multi-drop.
4. **Player tetap bisa antar sendiri** — mengendarai motor/Viar/truk.
   Tapi jika player antar sendiri semua, warung tidak bisa layani pembeli yang datang.
5. **Trade-off**: antar sendiri = untung 100% ongkir, tapi warung kosong.
   Pakai kurir = bayar gaji, tapi bisa layani pembeli di warung.

---

## 3. Gimmick & tantangan edukasi

> Tujuan: menunjukkan bahwa bisnis toko sembako itu tidak mudah dan tidak selalu
> indah. Bukan hanya margin tipis, tapi juga masalah operasional sehari-hari.

### 3a. Pelanggan rewel (semua level)
| Gimmick | Trigger | Efek |
|---|---|---|
| *"Kok lama banget?"* | Pengantaran > 5 menit game | Rating −1, peluang cancel 30% |
| *"Barangnya kurang!"* | 3% random | Harus kembali antar sisa (tanpa ongkir tambahan) |
| *"Saya pesan X kok dapat Y?"* | 2% random | Barang dikembalikan, stok kembali, Kas tidak masuk |
| *"Bayar nanti ya"* | NPC ngutang (sudah ada) | Risiko 15% tidak dibayar |
| *"Minta diantar sampai lantai 2"* | NPC kota | Harus jalan kaki ke pintu (tidak bisa dari motor) |
| *"Tolong sekalian bawain galon"* | Add-on request | Kapasitas kendaraan bisa penuh |

### 3b. Masalah kendaraan
| Gimmick | Trigger | Efek |
|---|---|---|
| Ban bocor | 5% per trip (motor/Viar) | Harus berhenti, perbaiki 60 detik atau dorong pulang |
| Mogok | 3% per trip | Harus bayar bengkel Rp5.000–20.000 atau dorong pulang |
| Hujan deras | Event cuaca acak | Kecepatan −40%, barang bisa basah (5% peluang rusak) |
| Macet | Jam sibuk game (07–09, 17–19) | Rute kota 2× lebih lambat |
| Viar terlalu berat | Muat > kapasitas | Kecepatan −50%, ban bocor +15% |

### 3c. Masalah kurir NPC (level 4–5)
| Gimmick | Trigger | Efek |
|---|---|---|
| Kurir telat | 10% per trip | Pelanggan kecewa, rating −1 |
| Kurir minta naik gaji | Setiap 7 hari | Gaji +10% atau kurir resign |
| Kurir sakit | 5% per hari | Kurir tidak tersedia 1 hari |
| Kurir nabrak | 1% per trip | Barang rusak, ganti rugi dari Kas |
| Kurir *ngobrol kelamaan* | 8% per trip | Pengantaran +2 menit |
| Kurir resign | Mood < 30 | Harus rekrut dan training ulang |

### 3d. Masalah bisnis
| Gimmick | Trigger | Efek |
|---|---|---|
| Harga BBM naik | Event random mingguan | Ongkir naik, pelanggan protes |
| Saingan banting harga | NPC warung lain | Pesanan menurun 20% selama 2 hari |
| Retur barang rusak | Barang kadaluarsa di perjalanan | Rugi 100% harga barang |
| Tagihan parkir Viar | Per hari | Rp2.000/hari per Viar |
| Pajak kendaraan | Per 30 hari game | Motor Rp5.000, Viar Rp15.000, Truk Rp50.000 |

---

## 4. Sistem rating & reputasi delivery

Setiap pengantaran menghasilkan rating 1–5 bintang dari NPC:

| Faktor | Efek rating |
|---|---|
| Tepat waktu | +1 ⭐ |
| Barang lengkap | +1 ⭐ |
| Barang utuh | +1 ⭐ |
| Harga wajar | +1 ⭐ |
| Ramah (player antar sendiri) | +1 ⭐ |

Rating rata-rata mempengaruhi:
- Frekuensi pesanan masuk (rating tinggi → lebih banyak order).
- Harga ongkir yang diterima pelanggan (rating tinggi → bisa pasang ongkir lebih mahal).
- Unlock fitur: rating ≥ 4.0 buka area kota; rating ≥ 4.5 buka pesanan grosir besar.

---

## 5. Ekonomi delivery

### Kalkulasi ongkir

```
ongkir = tarif_dasar + (tarif_per_meter × jarak)
```

| Level | Tarif dasar | Tarif/meter | Kapasitas | Contoh (500 m) |
|---|---|---|---|---|
| 2 (Motor) | Rp500 | Rp50 | 1–2 dus | Rp25.500 |
| 3 (Viar) | Rp1.000 | Rp40 | 3–5 dus | Rp21.000 |
| 4 (Motor+Viar) | sama | sama | multi | — |
| 5 (Truk) | Rp2.000 | Rp30 | 8–15 dus | Rp17.000 |

Margin ongkir setelah dipotong:
- Antar sendiri: 100% ongkir masuk Kas.
- Kurir NPC motor: 80% (20% gaji kurir).
- Kurir NPC Viar: 78% (22% gaji kurir, kendaraan lebih besar).
- Kurir NPC truk: 75% (25% gaji supir truk).

### Biaya operasional harian (Level 5 penuh)

| Pos | Biaya/hari |
|---|---|
| Gaji 4 kurir | Rp40.000 × 4 = Rp160.000 |
| Parkir 2 Viar | Rp2.000 × 2 = Rp4.000 |
| BBM estimasi | Rp10.000 |
| Perawatan kendaraan | Rp5.000 |
| **Total opex** | **±Rp179.000** |

Supaya untung, Grosir level 5 harus handle minimal 10+ pesanan/hari dengan
total jual Rp300.000+. Ini **sengaja ketat** untuk mengedukasi bahwa biaya
operasional bisa memakan margin.

---

## 6. Backend (Laravel `toko-cung`)

### Migrasi baru

```
2026_11_28_100000_create_world_delivery_system.php
```

Tabel:
| Tabel | Tujuan |
|---|---|
| `world_delivery_orders` | Pesanan antar: warung_id, npc_id, items, alamat (x/z), status, assigned_to, vehicle, created/completed/expired |
| `world_delivery_vehicles` | Armada warung: warung_id, type (motor/viar/truk), status, condition, mileage |
| `world_delivery_couriers` | Kurir NPC: warung_id, name, mood, skill, salary, hired_at, trips_today |
| `world_delivery_ratings` | Rating per pengantaran: order_id, stars, factors |
| `world_delivery_chat` | Chat pesanan NPC: warung_id, npc_id, message, response, timestamp |

### API (endpoint tambahan di `POST /api/world/warung`)

| action | field | efek |
|---|---|---|
| `delivery_read` | – | Snapshot pesanan aktif, armada, kurir |
| `delivery_accept` | `requestId`, `chatId` | Terima pesanan dari chat → cadangkan stok |
| `delivery_reject` | `chatId` | Tolak pesanan, reputasi −1 |
| `delivery_prepare` | `requestId`, `orderId` | Siapkan paket (stok → paket) |
| `delivery_dispatch` | `requestId`, `orderId[]`, `vehicleId`, `courierId?` | Assign ke kendaraan + kurir/self |
| `delivery_pickup` | `requestId`, `orderId` | Player ambil paket (antar sendiri) |
| `delivery_complete` | `requestId`, `orderId` | Selesai antar: validasi jarak, bayar Kas |
| `delivery_courier_hire` | `requestId` | Rekrut kurir NPC (maks sesuai level) |
| `delivery_courier_fire` | `requestId`, `courierId` | Pecat kurir |
| `delivery_courier_pay` | `requestId` | Bayar gaji harian semua kurir |
| `delivery_repair` | `requestId`, `vehicleId` | Perbaiki kendaraan rusak |

Validasi server:
- Level warung menentukan armada dan kurir yang diperbolehkan.
- Stok dicadangkan saat `delivery_accept`, dikembalikan saat `delivery_reject`/expire.
- Kas divalidasi untuk gaji, perbaikan, BBM.
- Kurir NPC settle otomatis: jarak/5 m/s + 30 dtk + gimmick delay.
- Rating dihitung server berdasarkan waktu dan random event.
- `requestId` idempotent di `world_warung_journal` (tipe `DELIVERY`, `COURIER_PAY`, `REPAIR`).

---

## 7. Frontend

### File baru
- `src/game/delivery/model.ts` — tipe, konfigurasi kendaraan, rute, NPC alamat.
- `src/game/delivery/store.ts` — zustand store, `deliveryCommand`, polling kurir.
- `src/game/delivery/DeliveryVehicles.tsx` — Viar dan truk di depan warung (3D).
- `src/game/delivery/DeliveryCourier.tsx` — NPC kurir yang jalan ambil paket + naik kendaraan.
- `src/game/delivery/DeliveryParcel.tsx` — visual paket di motor/Viar/truk.
- `src/ui/hud/DeliveryPanel.tsx` — daftar pesanan, dispatch, tracking.
- `src/ui/hud/DeliveryChat.tsx` — chat app HP untuk pesanan NPC.
- `src/ui/hud/DeliveryTracking.tsx` — minimap ikon kurir + progress bar.

### Hook di file yang ada
- `Hud.tsx`: mount `DeliveryPanel`, `DeliveryChat`.
- `GameCanvas.tsx`: mount `DeliveryVehicles`, `DeliveryCourier`.
- `api.functions.ts` / `contracts.ts`: BFF op `delivery`.
- `WarungHud.tsx`: tab **Pesanan Antar** + badge jumlah pesanan.
- `map-destinations.ts`: waypoint `delivery-house-*`.
- `outdoor-layout.ts`: slot parkir Viar dan loading truk per kavling.

### Viar (kendaraan baru di `vehicles/definitions.ts`)

```ts
{
  id: 'viar',
  name: 'Viar Karya',
  type: 'trike',
  seats: 1,          // hanya pengemudi
  wheels: 3,         // 1 depan, 2 belakang
  maxSpeed: 7,       // m/s
  reverseSpeed: 2,
  length: 3.2,       // meter
  width: 1.4,
  cargo: {
    capacity: 5,     // dus
    offset: [0, 0.6, -1.2],  // posisi bak relatif
    boxSize: [0.3, 0.25, 0.4],
  },
  audio: 'motorcycle-engine',  // suara motor
}
```

Visual: bodi kuning-hitam khas Viar roda tiga Indonesia, bak terbuka di belakang,
suspensi pegas belakang, stang motor, lampu depan bundar. Dus kardus coklat bertumpuk
di bak. Kecepatan lebih rendah dari motor karena beban.

---

## 8. Flow detail per skenario

### Skenario A: Player level 2 antar paket pakai motor

```
1. NPC Bu Romlah chat: "Minyak goreng 2, beras 5 kg. Antar ya Mas?"
2. Player buka Chat Toko → Terima.
3. Server: cadangkan stok, buat order, kirim snapshot.
4. Player ke Warungku → Pesanan Antar → "Bu Romlah - 2 barang, Jl. Kampung 3".
5. Player: Siapkan → paket muncul di dekat pintu warung.
6. Player keluar, dekati paket → Ambil Paket (visual: kardus di punggung).
7. Player ke parkiran motor → Naik motor → Waypoint Bu Romlah muncul.
8. Berkendara ke rumah Bu Romlah (kampung, ~200 m).
9. ☔ Random: hujan → kecepatan turun 40%.
10. Sampai (≤ 4 m) → berhenti → Serahkan Paket.
11. NPC Bu Romlah keluar rumah, terima paket.
12. Bu Romlah: "Makasih Mas! ⭐⭐⭐⭐⭐" (tepat waktu + lengkap).
13. Kas masuk: harga barang + ongkir Rp10.500.
```

### Skenario B: Player level 4 dispatch kurir NPC

```
1. 3 pesanan masuk dari chat.
2. Player buka Dispatch panel:
   - Pesanan Bu Romlah (Kampung, 2 dus) → assign Mas Budi + Motor 1.
   - Pesanan Pak Haji (Kota, 4 dus) → assign Bang Joko + Viar 1.
   - Pesanan Ci Mei (Kampung, 1 dus) → antar sendiri + Motor 2.
3. Mas Budi:
   - Jalan ke warung → ambil paket → naik Motor 1.
   - Berkendara ke rumah Bu Romlah (AI pathfinding).
   - ⚠️ Gimmick: Mas Budi ngobrol kelamaan (+2 menit).
   - Selesai, Kas masuk (ongkir − 20% gaji).
4. Bang Joko:
   - Ambil 4 dus → muat ke bak Viar → berangkat.
   - ⚠️ Gimmick: Ban bocor! Berhenti 60 detik.
   - Selesai terlambat, rating −1.
5. Player antar sendiri paket Ci Mei → selesai cepat → ⭐⭐⭐⭐⭐.
6. Sore: Player bayar gaji harian Mas Budi + Bang Joko = Rp10.000.
```

### Skenario C: Player level 5 mengelola operasi penuh

```
1. Pagi: 8 pesanan masuk sekaligus (reputasi Grosir tinggi).
2. Dispatch board:
   - 5 pesanan kota (total 12 dus) → Supir truk Pak Karman.
   - 2 pesanan kampung (3 dus) → Kurir Mas Budi + Viar 1.
   - 1 pesanan dekat (1 dus) → antar sendiri + motor.
3. Truk Pak Karman:
   - Muat 12 dus di loading dock.
   - Rute: 5 titik kota diurutkan otomatis (nearest-neighbor TSP).
   - Total waktu: ~8 menit game.
   - ⚠️ Gimmick: Macet jam sibuk → +3 menit.
   - ⚠️ Gimmick: Pelanggan ke-4 komplain "barangnya kurang" → harus kembali.
4. Player di warung layani pembeli yang datang langsung (dual income).
5. Malam: hitung P&L:
   - Pendapatan delivery: Rp85.000.
   - Gaji 3 kurir: Rp30.000.
   - BBM + parkir: Rp16.000.
   - Net delivery: Rp39.000.
   - Pelajaran: margin delivery hanya 46% — harus diimbangi penjualan langsung.
```

---

## 9. Integrasi dengan sistem yang sudah ada

| Sistem | Integrasi |
|---|---|
| **Ojek** | Motor yang dipakai antar = motor yang sama dari dealer ojek. Kalau sedang antar paket, tidak bisa narik ojek (dan sebaliknya). |
| **Kas usaha** | Semua transaksi delivery masuk `world_warung_journal` tipe baru: `DELIVERY_INCOME`, `DELIVERY_EXPENSE`, `COURIER_PAY`, `VEHICLE_REPAIR`. Leaderboard warung **tidak** menghitung ongkir (hanya `SALES`). |
| **Misi truk** | Misi truk yang ada (`truck-mission.md`) tetap terpisah — itu misi Toko Cung, bukan warung sendiri. |
| **Buku Kulakan Mbah** | Jalur Dagang halaman 2–8 bisa include tujuan delivery sebagai sub-quest. |
| **Reactive World** | `COURIER_PICKUP` event bisa trigger bonus pesanan antar (surge demand). |
| **Jam game** | Delivery memakai jam game (`worldMinutes`); gaji kurir dan pajak per hari WIB asli. |

---

## 10. Validasi & tes

### Backend
- `WorldDeliveryTest.php`: pesanan/terima/tolak/expire, stok cadangan, dispatch, complete, gaji kurir,
  gimmick, rating, level guard, idempotent requestId, Kas balance.
- `WorldDeliveryConcurrency.php`: dua pemain dispatch ke pesanan yang sama, race condition.

### Frontend
- `check-delivery-browser.mjs`: fixture warung level 2–5, terima chat, siapkan paket,
  ambil, naik motor/Viar, antar, serahkan, dispatch kurir NPC, tracking minimap.
- `check-viar-browser.mjs`: model Viar, fisika roda tiga, kapasitas bak, visual dus,
  kontrol sentuh, batas kota, parkir.

### Manual QA setelah rilis
- Smoke test: 2 akun di 1 room, warung level 3, kirim pesanan dari chat,
  antar dengan Viar, verifikasi Kas dan stok.
- HP fisik landscape: kontrol sentuh Viar, chat bubble, dispatch panel.

---

## 11. Migrasi & rollout

1. Backend: merge kode `WorldDelivery`, jalankan migrasi delivery system.
2. Backend: seed NPC alamat delivery dan konfigurasi `config/world-delivery.php`.
3. Frontend: merge `src/game/delivery/` + `src/ui/hud/Delivery*.tsx` + hook.
4. Update `config/world-warung.php`: nama level baru, unlock delivery per level.
5. Build & deploy backend dulu, lalu frontend.
6. Rollback: frontend dulu; tabel delivery aditif, aman ditinggal.

Tidak ada Point atau XP dari delivery. Semua ekonomi memakai Kas usaha yang sudah ada.
