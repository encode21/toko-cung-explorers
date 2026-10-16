# Fishing Spot dan lari analog

Implementasi lokal: 16 Oktober 2026. Frontend dan backend belum di-deploy; database produksi belum dimigrasikan.

## Cara bermain

1. Dari Plaza, pilih **Jelajah → Fishing Spot** atau ikuti papan dan marka biru di trotoar barat Plaza. Jalur menuju utara, berbelok ke timur di belakang obby, lalu masuk dermaga melalui ramp.
2. Berdiri pada lingkaran **MANCING DI SINI** di `(35, 0.2, -40)`. Tekan **F** di desktop atau tap bubble **Memancing** di mobile.
3. Pilih **Pancing Bambu** (waktu tarik 3 detik) atau **Pancing Sungai** (2 detik). Keduanya starter gear gratis milik akun, tanpa pembelian atau perubahan Point.
4. **Lempar kail**, tunggu **Ikan menyambar!**, lalu **Tarik ikan!**. Menarik terlalu awal atau melewati tenggat menghasilkan ikan lepas. Peluang tier tetap sama untuk kedua pancing.
5. Hasil menampilkan nama, tier, dan ukuran dalam cm. Buka detail kartu Fishing Spot, lalu **Koleksi ikan** untuk jumlah tangkapan dan ukuran terbesar per spesies.
6. **Batal**, Escape, bergerak, atau lompat menghentikan aktivitas; kontrol tidak menunggu respons server. Modal koleksi memakai fokus/penutupan modal bersama.
7. Analog mobile: tengah untuk berjalan; radius ≥92% untuk lari; kembali berjalan di bawah 80%. Keyboard Shift tetap berfungsi. Kecepatan jalan/lari tetap 4.2/7.4, impuls lompat 6.4, gravitasi -20.

## Penempatan dan arsitektur

- Danau dangkal dekoratif berada di lahan kosong timur laut, pusat `(42, -45)`, radius X/Z `11/8.5`; batas maksimum `x=53`, `z=-53.5`, masih dalam world ±56.
- Obby berakhir di `z=-30.3`; jalur danau membelok di `z=-34`. Jalan belakang berakhir di `x=22`, dan rumah belakang berada lebih barat. Jalur masuk menggunakan trotoar `x=26.2`; tidak memindahkan jalan, bangunan, NPC, spawn, atau pijakan obby.
- Dek atas `y=0.2`, ramp dan pagar memakai collider Rapier tetap. Air memakai terrain yang sudah ada, tanpa lubang tersembunyi atau sistem berenang baru.
- Papan, dermaga, batu, tanaman dan rak pancing memakai primitive/batch instanced proyek. Pancing, pelampung, dan satu segmen tali hanya aktif selama lemparan; gerak lempar singkat, pelampung mengangguk saat bite. Tidak ada shadow/light dinamis baru.
- HUD memakai `QuestTrackerCard` pada host yang sudah ada, select native, dan `GameModal` untuk koleksi. Tombol aksi/Batal minimal 44 px. Titik interaksi memakai `ContextPanel`/`WorldActionAnchor`; panduan memakai renderer `QuestGuidance` yang sama, dengan belokan menghindari obby.
- Run adalah clip runtime pada rig Base/Explorer, melalui satu AnimationMixer: torso condong, ayunan tangan/kaki, lutut, dan pelvis. Explorer kini benar-benar memilih Run berdasarkan gait, termasuk CarryRun. Jump/dance/emote tetap memakai pipeline yang sama. Pemain remote memilih gait dari kecepatan horizontal yang sudah disinkronkan.
- Status lari menggunakan radius analog sebelum pengaturan sensitivitas, dengan hysteresis 92%/80%. Tidak menambah tombol, controller karakter, atau sistem kamera.

## Persistensi dan aturan backend

Backend Laravel di repository saudara `toko-cung` menggunakan akun dan channel lease World yang sudah ada. Inventory yang sebelumnya tersedia adalah kosmetik; aktivitas ini menambahkan tabel kepemilikan starter rod serta tangkapan milik akun, tanpa memasukkan ikan ke katalog kosmetik atau inventory belanja.

- Endpoint terautentikasi `POST /api/world/fishing`, lewat BFF `worldRequest("fishing")` dan cookie/token akun yang sudah ada.
- Tabel `world_fishing_rods`, `world_fishing_casts`, `world_fishing_catches` memakai FK user. Unique cast ID membuat reel ulang idempotent.
- Kunci baris akun menserialisasi request dan tab paralel. Server memeriksa channel/connection, posisi yang sudah tervalidasi melalui heartbeat World, jarak/tinggi dermaga, kepemilikan rod, satu lemparan aktif, dan cooldown 2 detik.
- Waktu bite/expiry dibuat server. Client memakai offset clock untuk tampilan saja. Server memilih tier, spesies, dan ukuran dengan `random_int`; nama/tier/ukuran yang dikirim client tidak dipercaya.
- Konfigurasi `config/world-fishing.php`: **Basic 60%, Uncommon 25%, Rare 10%, Epic 4%, Legendary 1%**. Tidak ada pity/garansi tier tinggi. Ukuran diacak dalam rentang spesies dan disimpan dalam mm, ditampilkan cm.
- Koleksi agregat jumlah dan ukuran terbesar dibaca dari database. UI menyatakan tersimpan di akun hanya setelah menerima snapshot backend; kegagalan API menampilkan error/retry, tanpa hasil tangkapan lokal palsu.
- Response lama setelah batal/ganti akun/channel tidak membuka ulang aktivitas. Retry jaringan memakai cast ID yang sama. Tidak ada reward Point/XP atau perubahan wallet.

## Aktivasi backend

Deploy service, konfigurasi, route, dan migration dari repository backend bersama frontend. Dalam prosedur deployment backend yang normal, jalankan migrasi baru:

```sh
php artisan migrate --path=database/migrations/2026_10_16_180000_create_world_fishing_tables.php --force
php artisan config:cache
```

Jika deployment memakai route cache, bangun ulang cache route mengikuti prosedur backend yang sudah ada. Jangan rollback tabel setelah ada koleksi pemain tanpa backup; rollback menghapus data memancing.

Perintah di atas **belum dijalankan pada produksi**. Tes di bawah memakai SQLite in-memory, tanpa membaca/mengubah koleksi pemain produksi.

## Hasil pemeriksaan

| Pemeriksaan                                                                                           | Hasil                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript `tsc --noEmit`                                                                             | Lulus                                                                                                                                                                           |
| ESLint file implementasi terkait                                                                      | Lulus                                                                                                                                                                           |
| `npm run build`                                                                                       | Lulus                                                                                                                                                                           |
| `node --test tests/running-fishing.test.mjs tests/jump-animation.test.mjs tests/jump-remote.test.mjs` | 12/12 lulus; gait, rig kedua karakter, loop, root, hysteresis semua arah, timeline ikan, jump/emote/dance dan sinkronisasi jump                                                 |
| Backend `WorldFishingTest`                                                                            | 6 test / 43 assertions; collection lintas instance service, idempotensi cast/reel, early/expired/cancel, session/ownership/position, seluruh 10.000 rentang bobot tier          |
| `check-fishing-browser.mjs`                                                                           | Chromium desktop 1280×720 pada physics 60 Hz dan emulasi mobile landscape 740×360 pada 40 Hz; keduanya lulus, tanpa page error                                                  |
| Route ke dermaga                                                                                      | Gerak nyata sepanjang trotoar, belokan, dan ramp; posisi kaki stabil pada dek, bukan teleport ke interaksi                                                                      |
| Memancing browser                                                                                     | Pilih rod, cast, bite, reel, hilangnya response lalu retry menghasilkan 1 ikan, hasil/collection, buka ulang collection, batal via lompat ketika request masih berjalan         |
| Mobile                                                                                                | Input CDP touch pada analog, bubble interaksi, tombol cast/reel/Batal/lompat; target aksi ≥44 px dan tidak menutupi analog/lompat; edge-run tetap bekerja pada sensitivitas 0.5 |
| Run browser                                                                                           | Kecepatan terukur 7.4; lean serta gerak kedua rig diuji; ayunan tangan/kaki Explorer diperiksa pada scene nyata saat berlari                                                    |
| `check-obby-layout.mjs`, `check-obby-model.mjs`                                                       | Lulus; 240 lompatan Rapier pada 40/60 Hz termasuk 12 fase platform bergerak                                                                                                     |
| `check-obby-browser.mjs`                                                                              | Desktop dan mobile menyelesaikan seluruh platform dengan input nyata, rescue checkpoint, Finish, dan kontrol lama; stick mobile pada 40/44 radius untuk traversing jalan        |
| `check-intro-browser.mjs`                                                                             | Opening Chromium dan WebKit lulus                                                                                                                                               |
| `check-world-intro-gate.mjs`                                                                          | Gate intro/lobby, resume, dan replay lulus; kode cinematic tidak diubah                                                                                                         |

`report.json`, `desktop-fishing.png`, dan `mobile-landscape-fishing.png` menyimpan bukti browser. Browser memakai transport fixture untuk request backend; hasil ikan Basic pada screenshot adalah hasil test deterministik, bukan bukti distribusi probabilitas produksi. Seluruh peluang server diuji terpisah melalui PHP.

Belum diverifikasi: perangkat Android/iOS fisik dan GPU mobile, multiplayer lintas perangkat live, latency produksi, serta endpoint/migrasi pada backend produksi. Emulasi landscape dan physics 40 Hz bukan benchmark FPS perangkat nyata. PHP/vendor dan Three/Rapier menghasilkan peringatan deprecation dari dependensi yang sudah ada.

## File terkait perubahan ini

Frontend:

- `src/game/fishing/{model.ts,store.ts,FishingSpot.tsx}`
- `src/game/player/{analog-run.ts,touch-drive.ts,Player.tsx}`
- `src/game/avatar/{run-clips.ts,ExplorerAvatar.tsx,BaseAvatarV2.tsx,explorer-clips.ts}`
- `src/game/engine/GameCanvas.tsx`
- `src/game/interactions/interactables.ts`, `src/state/game-store.ts`
- `src/game/core/{QuestGuidance.tsx,use-world-guidance.ts}`, `src/game/navigation/Waypoint.tsx`
- `src/services/world/{contracts.ts,api.functions.ts}`
- `src/ui/hud/{FishingHud.tsx,fishing.css,Hud.tsx,ContextPanel.tsx,ExplorePanel.tsx}`
- `style-game.md`
- `tests/running-fishing.test.mjs`, `tests/fixtures/fishing/client.ts`, `tests/fixtures/obby/{entry.tsx,client.ts}`
- `scripts/check-fishing-browser.mjs`, `scripts/check-obby-browser.mjs`, direktori QA ini.

Backend:

- `app/Services/World/WorldFishing.php`
- `config/world-fishing.php`
- `database/migrations/2026_10_16_180000_create_world_fishing_tables.php`
- `routes/world.php`
- `tests/Feature/WorldFishingTest.php`

Perubahan obby, jump, dance, dan identitas yang sudah ada di working tree tetap dipertahankan. Tidak melakukan commit/push. Catatan vault Kratos Brain belum ditulis karena vault berada di luar workspace yang dapat ditulis; laporan ini mencatat implementasi, aturan, rollout, dan hasil uji di repository.
