# Standar Desain Game — Toko Cung Explore

Pembaruan: **20 Oktober 2026**.

Dokumen ini adalah acuan perubahan HUD dan UI pemain. Arah visual mengikuti referensi Play Together yang dipilih: warna cerah, permukaan putih/krem, bentuk membulat, ikon ekspresif, dan dunia game tetap terlihat. Gunakan data, karakter, aset, dan komponen Toko Cung yang sudah tersedia.

## 1. Prinsip utama

- **Komponen yang sama untuk fungsi yang sama.** Quest berbeda mengubah data, label, dan aksi; bentuk kartu tetap menggunakan komponen bersama.
- **Hierarki jelas:** identitas dan saldo ringkas, tujuan aktif mudah ditemukan, aksi utama mudah disentuh.
- **Ringan di atas dunia game:** hindari panel besar untuk informasi singkat. Buka detail ketika dibutuhkan.
- **Konsisten di desktop dan landscape mobile:** ukuran boleh menyesuaikan, identitas visual dan urutan informasi tetap sama.
- **Data nyata:** saldo, level, hadiah, peran, dan kepemilikan mengikuti state/server. Desain tidak menambah angka atau fitur semu.

CSS gelap bergaya glass yang masih ada pada menu lama bukan acuan desain baru. Saat menyentuh menu lama, gunakan keluarga komponen terbaru tanpa mengubah aturan gameplay yang tidak terkait.

**Jurnal petualangan** (`QuestBoard`) sudah dimigrasikan ke bahasa visual Daily Mission / Play Together (panel putih, header biru, tab kapsul, kartu membulat, tombol orange). Detail quest memakai `QuestTrackerCard` di dalam jurnal. Tidak ada kartu tracker di sisi HUD.

Jika permintaan pengguna memperbarui standar ini, ikuti permintaan tersebut dan perbarui bagian yang relevan di dokumen ini.

## 2. Palet warna

Nilai berikut diambil dari implementasi terbaru. Nama fungsi di tabel menjelaskan pemakaian, bukan deklarasi token global baru.

| Fungsi                         | Warna acuan             | Pemakaian                                 |
| ------------------------------ | ----------------------- | ----------------------------------------- |
| Permukaan utama                | `#ffffff`               | Modal dan halaman profil                  |
| Kartu HUD                      | `#fbf4e9`               | Tracker quest                             |
| Kartu bagian / tombol sekunder | `#f2e7db`               | Pengaturan, panel isi, aksi sekunder      |
| Katalog penampilan             | `#f7f5e6`               | Lemari dan toko                           |
| Header katalog                 | `#e4d5a7`               | Navigasi penampilan                       |
| Latar pratinjau karakter       | `#b19a90`               | Area model di penampilan                  |
| Teks utama                     | `#79584d`               | Judul dan isi utama                       |
| Teks pendukung                 | `#8b7665`               | Deskripsi dan petunjuk                    |
| Garis pemisah                  | `#e6dacb`               | Border dan divider halus                  |
| Aksi utama                     | `#39bedc`               | Jawab, simpan, konfirmasi                 |
| Teks pada aksi cyan            | `#134e63`               | Label tombol kecil agar terbaca           |
| Aktif / dipilih                | `#ffa415`               | Switch On, pilihan aktif, badge level HUD |
| Pilihan lembut                 | `#fff0ce`               | Latar jawaban terpilih                    |
| Badge kategori quest           | `#ffe1a3` + `#895716`   | Kategori quest                            |
| Petunjuk perjalanan            | `#e1f3f3` + `#397780`   | Kotak arah/tujuan                         |
| Saldo Point HUD                | `#285965c9` + `#fffef5` | Kapsul saldo di sebelah profil            |
| Peringatan / aksi berisiko     | `#fbe4d8` + `#98573a`   | Error dan konfirmasi keluar quest         |
| Berhasil                       | `#edf4df` + `#52663b`   | Jawaban atau langkah berhasil             |

Pakai warna komponen yang sudah ada ketika memperluas komponen tersebut. Variasi yang sudah digunakan profil atau dialog NPC boleh dipertahankan; jangan menambah variasi warna hampir sama untuk setiap quest baru.

Untuk panel bertema terang, tetapkan `--world-panel`, `--world-panel-foreground`, `--world-muted`, dan `--world-outline` pada root komponennya. Jangan mengganti seluruh tema dunia untuk memperbaiki satu panel.

## 3. Tipografi, bentuk, dan ikon

| Elemen             | Patokan                                                        |
| ------------------ | -------------------------------------------------------------- |
| Font UI            | `Plus Jakarta Sans` melalui font sans proyek                   |
| Judul modal        | Umumnya 21–25 px, bobot 800; ringkas pada layar pendek         |
| Teks isi panel     | Umumnya 12–14 px, line-height 1.4–1.55                         |
| Judul tracker      | 12 px, bobot 800                                               |
| Teks tracker       | 11 px; badge/meter kecil 9–10 px                               |
| Radius modal       | 26–28 px                                                       |
| Radius kartu       | 15–19 px                                                       |
| Radius tombol      | 12 px atau kapsul, sesuai komponen induk                       |
| Jarak isi          | Mulai dari 4, 8, 12, 16, 24 px; ikuti ukuran komponen terdekat |
| Target sentuh baru | Minimal 44 × 44 px, meskipun ikon lebih kecil                  |

- Hindari font display tinggi/sempit untuk isi HUD baru. Judul cukup tebal dan mudah dibaca.
- Bayangan lembut memberi kedalaman. Outline gelap tebal khusus gelembung aksi; jangan diterapkan ke semua panel.
- Ikon Point wajib menggunakan [PointCoinIcon](src/ui/game-ui/PointCoinIcon.tsx), termasuk saldo, harga item, pembelian, profil, dan reward.
- Ikon misi/bintang menggunakan bentuk **filled**. Sidebar Penampilan/Lemari/Emote menggunakan [AppearanceSectionIcon](src/ui/profile/AppearanceSectionIcon.tsx), tanpa teks visual.
- Ikon navigasi kecil seperti tutup dan chevron boleh mengikuti ikon garis yang sudah dipakai. Jangan mengubah seluruh ikon menjadi filled tanpa mempertimbangkan fungsinya.
- Tombol tanpa teks tetap mempunyai `aria-label`. Ikon dekoratif memakai `aria-hidden`.
- Label terpilih harus terlihat lewat bentuk/background/check dan state aksesibilitas, bukan warna saja.

## 4. Peta komponen acuan

**Kamera handphone** memakai `PhotoCameraPanel` / `photo-camera.css` di atas fondasi `GameModal`.
Hanya ada dua mode: **Selfie** dan **Kamera Belakang**. Bingkai sudut putih menyisakan dunia
terlihat, area luar diredupkan, pilihan mode memakai kapsul krem/orange, dan shutter berupa
lingkaran putih besar. Geser bingkai atau gunakan tombol panah untuk mengatur sudut; setelah
jepret tampilkan pratinjau dengan **Simpan foto** cyan dan **Ambil ulang**. Sembunyikan HUD,
nama dan balon chat saat memotret; tutup kamera kembali ke handphone. Foto PNG mengikuti
area bingkai, disimpan lokal atas aksi pemain, tanpa kamera perangkat, unggahan, atau mode video.
Renderer mengambil frame WebGL setelah render; layar video eksternal berbasis iframe tidak
termasuk berkas foto. Jangan mengaktifkan `preserveDrawingBuffer` secara global. Saat tutup,
pulihkan avatar/kamera permainan dan bebaskan URL pratinjau.
Mode Selfie menampilkan tongsis dengan gagang tepat di telapak kanan dan pose lengan lokal
untuk rig Explorer maupun avatar standar. Tongsis tersembunyi di kamera belakang dan saat
kamera ditutup; pose asli dipulihkan sebelum mixer animasi berikutnya, tanpa mengubah posisi
fisika atau animasi yang dikirim ke pemain lain.

Periksa komponen berikut sebelum membuat varian baru.

| Area                         | Komponen                                                                                                                                                                                                                                                               | Pemilik gaya                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Landing, auth, lobby         | [LandingScreen](src/ui/entry/LandingScreen.tsx), [AuthScreen](src/ui/entry/AuthScreen.tsx), [EntryKeypad](src/ui/entry/EntryKeypad.tsx), [WorldLobby](src/ui/entry/WorldLobby.tsx), [ChannelSelector](src/ui/ChannelSelector.tsx), [AppBridge](src/lib/app-bridge.tsx) | [entry.css](src/ui/entry/entry.css) — krem/cyan/orange; lobby = satu kartu fokus channel; AppBridge deep link → store  |
| Identitas, saldo             | [PlayerStatus](src/ui/hud/PlayerStatus.tsx), [UtilityBar](src/ui/hud/UtilityBar.tsx)                                                                                                                                                                                   | [player-status.css](src/ui/hud/player-status.css)                                                                      |
| Menu samping                 | [ActionDock](src/ui/hud/ActionDock.tsx), [PhoneAppArtwork](src/ui/hud/PhoneAppArtwork.tsx)                                                                                                                                                                             | [side-menus.css](src/ui/hud/side-menus.css)                                                                            |
| Kartu quest (kecuali harian) | [QuestTrackerCard](src/ui/hud/QuestTrackerCard.tsx)                                                                                                                                                                                                                    | [quest-tracker.css](src/ui/hud/quest-tracker.css)                                                                      |
| Aksi misi bersama            | [ContextActionButton](src/ui/hud/ContextActionButton.tsx) — tombol dekat lompat + nama target                                                                                                                                                                          | [context-actions.css](src/ui/hud/context-actions.css)                                                                  |
| Jurnal petualangan           | [QuestBoard](src/ui/quests/QuestBoard.tsx) via [KioskOverlay](src/ui/kiosk/KioskOverlay.tsx)                                                                                                                                                                           | [quest-journal.css](src/ui/quests/quest-journal.css) — selaras Daily Mission                                           |
| Pusat Misi Principal         | [PrincipalBoard](src/ui/hud/PrincipalBoard.tsx)                                                                                                                                                                                                                        | [principal-board.css](src/ui/hud/principal-board.css) — panel terang, chapter selector, CTA cyan                       |
| Musik Underground            | [ClubMusicPanel](src/ui/hud/ClubMusicPanel.tsx), [ClubMusicControls](src/ui/hud/ClubMusicControls.tsx), [ClubMusicIcon](src/ui/hud/ClubMusicIcon.tsx)                                                                                                                  | [club-music-panel.css](src/ui/hud/club-music-panel.css), [club-music-controls.css](src/ui/hud/club-music-controls.css) |
| Dance wheel (club)           | [DanceControls](src/ui/hud/DanceControls.tsx)                                                                                                                                                                                                                          | [dance-wheel.css](src/ui/hud/dance-wheel.css)                                                                          |
| Pertanyaan quest rahasia     | [SecretDiscoveryCard](src/ui/secret/SecretDiscoveryCard.tsx)                                                                                                                                                                                                           | [secret-discovery.css](src/ui/secret/secret-discovery.css)                                                             |
| Quest selesai                | [QuestCompleteOverlay](src/ui/quests/QuestCompleteOverlay.tsx), [QuestConfetti](src/ui/quests/QuestConfetti.tsx)                                                                                                                                                       | [quest-complete.css](src/ui/quests/quest-complete.css), [quest-confetti.css](src/ui/quests/quest-confetti.css)         |
| Aksi pada objek/NPC          | [WorldActionAnchor](src/ui/hud/WorldActionAnchor.tsx), [NpcQuestionIcon](src/ui/hud/NpcQuestionIcon.tsx)                                                                                                                                                               | [world-actions.css](src/ui/hud/world-actions.css)                                                                      |
| Percakapan NPC               | [NpcDialogueShell](src/ui/dialogue/NpcDialogueShell.tsx), [NpcDialoguePortrait](src/ui/dialogue/NpcDialoguePortrait.tsx)                                                                                                                                               | [npc-dialogue.css](src/ui/dialogue/npc-dialogue.css)                                                                   |
| Kontrol sentuh               | [MobileControls](src/ui/hud/MobileControls.tsx)                                                                                                                                                                                                                        | [mobile-controls.css](src/ui/hud/mobile-controls.css); visual ring analog masih di [styles.css](src/styles.css)        |
| Prompt putar HP (portrait)   | [LandscapeOrientationGuard](src/ui/game-ui/LandscapeOrientationGuard.tsx), [FullscreenController](src/ui/game-ui/FullscreenController.tsx)                                                                                                                             | [game-ui.css](src/ui/game-ui/game-ui.css) `.game-orientation` — krem/cyan, kartu membulat, CTA Layar penuh             |
| Pengaturan                   | [GameSettingsPanel](src/ui/game-ui/GameSettingsPanel.tsx)                                                                                                                                                                                                              | [game-settings.css](src/ui/game-ui/game-settings.css)                                                                  |
| Profil                       | [ProfilePage](src/ui/profile/ProfilePage.tsx), [ProfilePanel](src/ui/profile/ProfilePanel.tsx)                                                                                                                                                                         | [profile-panel.css](src/ui/profile/profile-panel.css)                                                                  |
| Penampilan, lemari, toko     | [AppearanceStudio](src/ui/profile/AppearanceStudio.tsx), [ExplorerWardrobe](src/ui/profile/ExplorerWardrobe.tsx), [ShopPage](src/ui/hud/ShopPage.tsx)                                                                                                                  | [appearance-studio.css](src/ui/profile/appearance-studio.css), [shop-panel.css](src/ui/hud/shop-panel.css)             |
| Aktivitas Dunia              | [ActivityFeedPanel](src/ui/hud/ActivityFeedPanel.tsx) via [HudSheet](src/ui/hud/HudSheet.tsx)                                                                                                                                                                          | [feed-panel.css](src/ui/hud/feed-panel.css) — krem/oranye                                                              |
| Jelajah                      | [ExplorePanel](src/ui/hud/ExplorePanel.tsx) via [HudSheet](src/ui/hud/HudSheet.tsx)                                                                                                                                                                                    | [explore-panel.css](src/ui/hud/explore-panel.css) — teal/krem                                                          |
| Hentikan petunjuk            | [StopGuidanceButton](src/ui/hud/StopGuidanceButton.tsx) di menu kiri [ActionDock](src/ui/hud/ActionDock.tsx)                                                                                                                                                           | [side-menus.css](src/ui/hud/side-menus.css), [HudMenuArtwork](src/ui/hud/HudMenuArtwork.tsx)                           |
| Panduan                      | [HelpPanel](src/ui/hud/HelpPanel.tsx) via [HudSheet](src/ui/hud/HudSheet.tsx)                                                                                                                                                                                          | [help-panel.css](src/ui/hud/help-panel.css) — peach/krem                                                               |
| Arsip Rahasia                | [SecretArchivePanel](src/ui/secret/SecretArchivePanel.tsx) via [HudSheet](src/ui/hud/HudSheet.tsx)                                                                                                                                                                     | [archive-panel.css](src/ui/secret/archive-panel.css) — ungu/krem                                                       |

Gunakan fondasi modal/panel yang sudah digunakan komponen acuan agar focus, Escape, penutupan, dan scroll tetap konsisten. Gaya dasar gelap pada fondasi bukan alasan mempertahankan tampilan gelap pada panel baru.

## 5. Tata letak HUD dan kontrol

- Kiri atas: kartu profil krem, avatar cyan, badge level orange. Kartu lokasi (`mmo-location`) tidak ditampilkan. Point tampil mendatar di sebelah kartu profil menggunakan SVG koin.
- Resource utama HUD hanya **Point**. Jangan mengembalikan kapsul XP atau tombol notifikasi lama. Progress XP kecil di kartu profil dan detail XP di profil/reward tetap dapat digunakan.
- Menu samping memakai artwork berwarna dengan label pendek. Ruang kosong di antara tombol tetap dapat dipakai untuk bermain.
- Tidak ada tumpukan kartu samping atau bubble progres daily di HUD. Ikon menu membuka detail; pembaruan baru memakai dot merah.
- Di **dungeon**, shortcut Quest tetap terlihat untuk membuka detail dan konfirmasi keluar. Handphone dan minimap tetap tersedia.
- **Bicara** biasa ditambatkan di atas NPC; **Sapa** di atas kepala pemain target. Aksi progres quest/daily/dungeon tetap di slot kontrol samping lompat, termasuk percakapan dengan label **Lanjut Quest**. Tombol progres dan percakapan biasa dapat tampil bersamaan; F hanya menjalankan aksi utama, sedangkan klik memeriksa ulang ID serta jangkauan masing-masing aksi. Gunakan `WorldActionAnchor` dan resolver `ContextActionButton` yang sama dengan tombol F desktop. Gendong/Sync Dance berbagi baris di atas pemain agar tidak bertumpuk dengan Sapa. Jangan tampilkan prompt quest kedua untuk aksi yang sama.
- **Punch** tetap di kiri lompat ketika pemain lain berada dalam jangkauan, termasuk saat Sapa/Bicara tampil di atas target. Aksi objek lain tetap memakai slot kontrol kontekstual dan menggantikan Punch selama slot itu terpakai. Target sentuh minimal 44 px, terpisah dari joystick, chat, Spawn, dan lompat.
- **Obby Proyek Langit** memakai satu baris progres pijakan dan checkpoint dekat kontrol selama run aktif. `ObbyTracker` hanya ada dalam tab Obby di jurnal Quest. Area obby berupa proyek konstruksi: rangka beton/scaffolding, peti, balok baja, kontainer, crane, dan pallet gantung bergerak. Rute berisi 59 pijakan dengan 14 checkpoint hingga Finish 31,5 m, mengitari rangka terbuka di bawah crane 33,8 m; collider mengikuti ketebalan peti/kontainer dan jatuh ke lantai konstruksi kembali ke checkpoint. Start/checkpoint/Finish ditandai langsung pada pijakan; checkpoint memakai bendera bernomor dan tanda centang setelah tersimpan. Setelah Finish, terjun dari ketinggian membuka parasut lokal (`ObbyParachute`: kanopi cyan menghadap atas, riser hitam ke tangan) plus pose animasi `Parachute` (tangan mengangkat grip); kecepatan turun terbatas hingga mendarat — bukan free-fall. Penyelesaian latihan memakai overlay bersama dengan tema `plaza-obby`, tanpa blok Point/XP karena belum ada reward server untuk aktivitas ini.
- **Lompat** memakai satu `AnimationMixer` untuk setiap rig: antisipasi 60 ms, ayunan tangan naik dengan dua ayunan pendek, keseimbangan saat turun, lalu landing 140 ms. Gait horizontal tetap aktif agar kembali ke lari tidak memulai ulang langkah. Debu kecil berupa lima puff instanced hanya pada takeoff/landing; root fisika, tinggi lompatan, dan tombol lompat tetap mengikuti sistem pemain yang sama.
- **Memancing** memakai status singkat di atas kontrol utama, dengan indikator waktu sambaran dan tombol pengaturan minimal 44 px. Tombol lompat berubah menjadi kail; Spasi menjalankan aksi yang sama. Pengaturan menyediakan pilihan pancing, berhenti dan inventory. Coba ulang tetap memakai permintaan yang tertunda. Sambaran/getaran mengikuti reduced motion; ikan 3D dan nama/tier/ukuran tampil setelah receipt server. Handphone → Inventory menampilkan koleksi akun, rekor ukuran dan filter tier; dot tangkapan hilang setelah inventory dibuka. Jalur biru dan panduan menuju danau tetap digunakan.
- **Pantai dan berenang** berupa pesisir terbuka di sudut barat-laut kota, dengan laut hingga horizon di luar daratan kota yang terbatas. Jangan membentuk pantai sebagai kolam oval dengan tanah mengelilinginya. Minimap memakai garis pantai yang sama; props pantai berada pada tepi kering dan akses ke laut tetap landai. Pantai memakai destinasi `Pantai Cung` di Jelajah dan papan petunjuk di world. Seluruh permukaan air aktif (pantai dan danau pancing) memakai registry `WATER_BODIES`, dasar mesh/collider yang sama, dan lereng dangkal untuk keluar; dermaga tetap kering. Tidak ada tombol atau region HUD tambahan: analog/WASD mengarah, tombol lompat/Spasi mengayuh, keluar melalui lereng dangkal. Clip Swim/SwimIdle memakai mixer yang sama; cipratan berupa enam partikel instanced dan satu riak, tanpa efek layar atau refleksi mahal.
- **Lari analog** dimulai pada 92% radius fisik dan berhenti di bawah 80%, terlepas dari pengaturan sensitivitas. Tetap satu analog dan satu tombol lompat. Clip Run pada rig Base/Explorer memakai mixer yang sama dengan jalan/lompat/dance, dengan ayunan tangan/kaki lebih lebar, torso condong, dan pantulan pelvis; kecepatan berjalan/lari tetap 4,2/7,4.
- **Titik tengah vertikal analog saat diam dan tombol lompat harus sejajar.** Gunakan `--mobile-control-center` dari `mobile-controls.css`; jangan menambahkan offset terpisah seperti `+100px`.
- Analog boleh mengikuti posisi sentuhan selama digunakan, lalu kembali ke posisi istirahat saat dilepas. Kesejajaran diperiksa ketika analog diam.
- Animasi dance menggunakan koreografi seluruh tubuh: perpindahan berat, lutut lentur, langkah bergantian, torso berputar, dan tangan/pergelangan dengan jeda gerak. Semua delapan dance mempunyai frasa empat ketukan yang berbeda dan loop mulus; model Base dan Explorer memakai adaptasi arah sendi masing-masing. Koreksi tinggi hanya pada pelvis visual agar telapak dekat lantai, tanpa mengubah root pemain. Slot **Sway** kini tampil sebagai **Sidrap**: gerak tangan melingkar dengan siku lentur, jeda gerak bahu–siku–pergelangan, perpindahan berat kanan-kiri, dan langkah rapat memantul dengan perpindahan tumpuan yang dihaluskan, mengikuti referensi Sidrap pengguna. ID internal `sway` tetap kompatibel dengan sinkronisasi multiplayer; nama tampilan memakai `DANCE_LABELS`. Periksa dengan `scripts/check-dance-clips.mjs` dan pratinjau `scripts/check-dance-browser.mjs`.
- Di **Cung Underground**, dua kontrol musik tampil tepat di kiri minimap: **Mute musik** dan **Request musik**, menggunakan `ClubMusicControls`, `GameIconButton`, ikon SVG filled, lingkaran krem/pastel 44 px, gap 8 px antartombol dan 12 px dari minimap. Speaker dicoret dan berwarna coral saat mute. Mute membisukan pemutar Underground dan BGM lokal sementara selama berada di Underground, tanpa mengubah volume tersimpan, efek suara, lagu, antrean, atau suara pemain lain. BGM kembali mengikuti preferensi pemain setelah unmute atau keluar; arena konser tidak ikut dimute. Request membuka tab **Lagu** pada `ClubMusicPanel`. Kontrol mengikuti visibilitas minimap; sembunyikan saat editor, percakapan, panel terbuka, atau di luar Underground.
- Di **Cung Underground / venue club**, tombol **Dance** di kiri atas lompat (jam 10:30), di tengah busur tombol aksi. Tap membuka **radial wheel** gaya Play Together (krim/cyan/orange, bukan panel gelap penuh). Menu hanya berisi pilihan dance + Stop di pusat. **Sync Dance** memakai `DanceSyncButton` di dalam `WorldActionAnchor` milik `ContextPanel`: tampil di atas pemain terdekat yang sedang menari, sejajar dengan Sapa. Gunakan lingkaran aksi dan ikon sync/dance, bukan daftar pemain di menu dance; sembunyikan untuk diri sendiri, pemain yang berhenti menari, atau keanggotaan yang kedaluwarsa. Aksi tetap memakai perintah `sync` yang ada.
- Di area bar **Cung Underground**, tombol **Drink** memakai ikon gelas filled dan tombol lingkaran yang sama dengan Dance/Pukul (52 px; compact 48 px). Posisinya tepat di atas lompat (jam 12), pada radius busur aksi yang sama dengan Dance/Pukul, mengikuti `--mobile-control-center` dan `--mobile-jump-right`. Tampilkan hanya ketika pemain berdiri dalam jangkauan `atBar()`; sembunyikan di luar Underground, saat editor, percakapan, atau panel terbuka. Tap menggunakan `takeDrink()` agar animasi dan pemeriksaan jangkauan tetap sama.
- Tombol **Pukul** di posisi **jam 9** (kiri lompat), ukuran sama Dance (`--mobile-action-size`). Tampil saat pemain lain dekat dan slot aksi tidak sedang dipakai misi. Sapa memakai pengatur aksi bersama; ContextPanel mempertahankan Gendong/Sync Dance. Desktop tetap **G**.
- **Drink, Dance, Pukul** membentuk busur seperempat lingkaran seperti posisi skill Mobile Legends, dengan lompat sebagai pusat. Pukul di jam 9, Dance jam 10:30, Drink jam 12; slot tetap saat salah satunya tersembunyi. Geometri bersama di `mobile-controls.css`: `--mobile-action-size`, jarak minimum area tap 8 px (`--mobile-action-gap`), offset diagonal = setengah ukuran lompat + setengah ukuran aksi + gap, lalu `--mobile-action-orbit` = offset diagonal × √2. Ketiga tombol berada pada radius yang sama; area tap dan outline fokus lingkaran harus tetap terpisah. Jangan memberi ukuran responsif terpisah pada salah satu tombol.
- Chat, menu, dan tracker tidak boleh menutup target sentuh analog/lompat. Geometri menu dimiliki `side-menus.css`: kedua kolom memakai lebar dan gap yang sama (72 px / 10 px; compact 56 px / 6 px), kolom kiri di bawah profil dan kanan terpusat di bawah minimap dengan jarak 12 px. Tinggi tombol compact menyesuaikan viewport terukur, minimal 44 px, agar empat tombol termasuk **Hentikan Petunjuk** tampil utuh di landscape mulai tinggi 320 px. Scroll hanya sebagai fallback untuk ruang yang lebih pendek. Batas bawah kolom mengikuti area chat, bukan memotong tombol pada awal zona analog. Kontrol memakai lebar kolom yang sama untuk menyisakan minimal 12 px dari analog yang mengembang dan tombol lompat; menu berada di atas lapisan kontrol, sedangkan celah antartombol tetap meneruskan input ke dunia. Pertahankan kesejajaran analog/lompat serta dukungan dua jari.
- Gunakan viewport terukur, `--dock-clearance`, `--game-edge-*`, dan `env(safe-area-inset-*)`. Hindari mengunci layout ke ukuran satu screenshot.

## 6. Quest: desain sama, data berbeda

Seluruh detail quest biasa/rahasia, misi opsional, dungeon dan Obby tersedia melalui menu Quest (`ActivityJournal`). `QuestTrackerCard` hanya dipakai di dalam detail, bukan di samping HUD. Menu Daily menampilkan tujuan, progres, receipt hadiah dan pilihan pelacakan; tidak menyediakan tombol aksi atau klaim.

`context-action.ts` memilih satu aksi: tujuan dungeon aktif → tujuan dilacak → tujuan aktif lain → penerimaan → interaksi umum. Dalam prioritas sama, jarak terdekat lalu ID stabil. `ContextActionButton` dan F memakai resolver yang sama, memvalidasi ulang konteks/jarak/status dan menahan input ganda. Label singkat dan nama target harus terlihat. Setelah langkah selesai, arah dan aksi mengikuti langkah berikutnya. VISIT dan DISTANCE tetap tervalidasi otomatis.

Runtime tetap terpasang tanpa kartu: DailyRuntime, transisi/completion dungeon dan efek sambaran memancing. Detail tetap menyediakan batal/keluar dengan konfirmasi. Error ditampilkan dekat aksi dan pada detail, dapat diakses keyboard.

Daily Mission mendapat dot untuk set/receipt baru; Quest untuk quest, misi opsional dan dungeon baru/selesai; Handphone dan Inventory untuk tangkapan baru. Simpan identitas sudah dilihat per akun di localStorage, lalu hapus dot saat detail terkait dibuka. Progress biasa tidak menyalakan dot lagi.

Penanda dunia dan pulse menggunakan renderer `QuestGuidance`/`DailyObjectiveMarker` yang ada; tidak memuat tombol aksi duplikat. Lokasi rahasia mengikuti aturan discovery yang ada. Dungeon aktif menguasai panduan; di World pilihan pelacakan daily/quest/misi opsional menentukan tujuan. Jelajah yang sengaja dipilih tetap berlaku sampai aksi pelacakan baru.

**Pusat Misi Principal** memakai modal terang keluarga Jurnal/Daily Mission, bukan glass gelap. UX Papan Misi: level pemain → pilihan chapter berupa kartu → daftar misi chapter terpilih → satu CTA **Mulai Misi** per kartu. Chapter terkunci tetap dapat dipilih untuk melihat syarat dan kontennya, tetapi CTA quest mengikuti `available`, level, misi aktif, dan `busy` dari data. Reward hanya menampilkan XP/Point aktual. Leaderboard memakai chip kategori dan segmented period, baris ranking besar yang mudah disentuh/dibaca, serta kartu peringkat pemain; jangan kembali ke dropdown gelap.

Pertanyaan quest memakai panel putih, bagian fakta krem, opsi terpilih orange, dan tombol utama cyan. Jawaban salah, petunjuk, loading, serta aturan reward tetap mengikuti sistem quest.

Modal selesai memakai `QuestCompleteOverlay`: judul **Quest Selesai**, koin Point besar, jumlah reward aktual, detail XP/waktu lebih kecil, dan tombol **Ok** cyan. Jangan menambahkan multiplier/hadiah fiktif dari gambar referensi. Confetti berasal dari modal, melontar ke atas lalu jatuh; satu ledakan terbatas, tidak menangkap pointer, dibersihkan setelah selesai, dan menghormati reduced motion.

## 7. Objek, NPC, chat, dan fokus percakapan

- Aksi Bicara biasa dan Sapa ditambatkan pada NPC/pemain melalui `WorldActionAnchor`: lingkaran putih, ikon gelap, outline gelap, dan ekor pendek menuju target. Aksi objek seperti Duduk tetap mengikuti slot kontrol kontekstual pada bagian 5.
- Posisi memakai proyeksi bersama dan mengikuti karakter/objek dengan stabil. Jangan menghitung ulang posisi dengan interval berbeda untuk tiap tombol hingga berkedip.
- Tanda tanya memakai `NpcQuestionIcon` agar pusat ikon konsisten. Saat duduk, berdiri melalui tombol lompat; tidak perlu tombol panah berdiri tambahan.
- Nama pemain menggunakan [PlayerNameBadge](src/game/net/PlayerNameBadge.tsx): kapsul berwarna, warna konsisten per pemain, nama lokal ungu dengan teks hijau terang.
- Maskot NPC memakai preset `NPC_AVATARS` yang sama di dunia dan potret dialog: Ko Asu berambut abu-abu, kacamata persegi, masker biru, dan cheongsam marun; Koko Cung berambut belah samping, kacamata hitam bulat, dan cheongsam biru gelap. Detail pakaian mengikuti tulang avatar melalui `mascot-details.ts`.
- **Parasut setelah Finish Obby** memakai kanopi sayap bersegmen berwarna graphite dengan aksen cyan, dua kipas tali kiri/kanan, webbing gelap, dan pegangan orange. `ObbyParachute` membaca telapak tangan avatar Explorer maupun Base V2 yang sedang dianimasikan; jangan memakai koordinat pegangan statis. Pose `Parachute` membuka siku di samping kepala, menjaga pergelangan netral, dan menekuk kaki ringan. Geometri dan orientasi segmen ada di `parachute-visual.ts`; perubahan visual tidak mengubah syarat deploy, kecepatan turun, atau root fisika pemain.
- Saat berada di Underground/konser, label nama lokal dan pemain lain memakai `Html` billboard berukuran dunia agar tampil di atas iframe video. Di luar venue, pertahankan renderer mesh agar dunia kota/dungeon tidak menambah portal dan raycast label. Rentang layer bersama di `world-html-layers.ts`: video 0–8, nama 10–19, HUD mulai 20. Label venue mengikuti visibilitas avatar dan clipping kamera, tanpa raycast occlusion seluruh scene: mesh helper/collider yang tidak terlihat tidak boleh menghilangkan nama. Label tetap di atas video dan tidak menangkap pointer. Jangan mencoba menaikkan `renderOrder` mesh untuk mengalahkan iframe DOM.
- Nama NPC menggunakan [NpcLabel](src/game/world/NpcLabel.tsx): hitam transparan (`#11110e`, opacity maksimal saat ini 0.62), teks kuning (`#ffe27a`).
- Chat dunia memakai [PlayerChatBubble](src/game/net/PlayerChatBubble.tsx): putih membulat, teks gelap, ekor pendek, dekat dengan label/karakter. Jangan menambahkan jarak vertikal besar yang membuat pengirim sulit dikenali.
- Percakapan NPC memakai `NpcDialogueShell`: portrait NPC yang sesuai di kiri, dialog krem di bawah, nama NPC di badge, pertanyaan/aksi di dalam dialog. Pada quest dengan giliran bicara pemain, badge memakai nama profil login (bukan “Kamu”), portrait pemain berpindah ke kanan, dan ekor gelembung mengarah ke kanan. Portrait mengikuti satu `appearanceDraft`/avatar aktif dan `equippedCharacter` yang sama dengan dunia; giliran NPC kembali ke kiri. Gunakan satu portrait pembicara aktif, pertahankan urutan dialog, progress, dan aksi quest.
- Selama percakapan, sembunyikan HUD gameplay yang mengganggu—profil, Point, menu, tracker, chat dock, dan kontrol. Gunakan [GameplayHudLayer](src/ui/hud/GameplayHudLayer.tsx) serta [useNpcConversation](src/hooks/use-npc-conversation.ts) agar aturan fokus sama untuk seluruh NPC.

## 8. Pengaturan, profil, dan penampilan

### Prompt portrait (putar HP)

- Overlay portrait touch memakai palet entry/lobby: latar krem, kartu putih membulat, eyebrow cyan, ikon HP di kapsul `#fff0ce` dengan aksen orange, teks cokelat, CTA cyan **Layar penuh**.
- Jangan mengembalikan radial gelap `#284653` / emas `#f3d18b`. Sesi tetap tersambung; tidak unmount canvas.

### Lobby channel

- Satu kartu fokus di tengah viewport: daftar channel → **Masuk Dunia** + **Segarkan** (ukuran sama). Bukan dua panel dashboard berdampingan.
- Buang dari lobby: strip identitas/XP, kredit aset, ubah nama, tonton ulang cerita, paragraf panjang, footer teks di dalam kartu. **Menu utama** dan **Keluar akun** di luar kartu sebagai tombol lingkaran ikon-only 44 px (krem/pastel, outline putih, shadow 3 px) seperti mute/request musik Underground.
- Channel pertama yang masih terbuka dipilih otomatis agar CTA siap. Channel terpilih memakai highlight orange; isi kapasitas ditandai meter kecil.
- Tombol **Masuk Dunia** harus terlihat penuh dalam 1 viewport landscape (lihat `check-lobby-browser.mjs`).

### Pengaturan

- Pengaturan volume lengkap tetap di **Pengaturan Game**. Underground menyediakan pintasan mute pemutar lokal dan request musik di samping minimap.
- Panel putih dengan kelompok pengaturan krem, switch orange, dan aksi cyan.
- Kualitas grafis dan ukuran UI menggunakan pilihan tab/segmented, bukan dropdown ukuran UI.
- Lebar maksimal pengaturan saat ini 760 px, dibatasi viewport dan safe area. Konten panjang scroll di dalam panel.
- **Aktivitas Dunia** (app Handphone → Aktivitas) memakai panel `game-feed-sheet` palet **krem/oranye** (bukan biru Daily Mission): header orange, ringkasan krem, ikon lonceng filled + badge notifikasi, kartu list krem dengan badge waktu.
- **Jelajah** memakai panel `game-explore-sheet` palet **teal/krem**: header cyan, kartu destinasi putih dengan pin filled terpusat (`align-items: center`), chip sekitar toko berwarna lembut — bukan modal gelap lama. Memilih destinasi mengaktifkan **panah tanah yang sama dengan quest** (`exploreWaypointTarget` → `QuestGuidance`), plus penanda waypoint di tujuan.
- **Peta dunia** memakai `WorldMap` dengan terrain hijau pastel dari geometri dunia asli; POI berupa lingkaran cokelat dengan SVG filled putih dan nama ber-outline krem. Ikon, daftar lokasi, dan modal memakai `MapPoiIcon` yang sama. Pemain lain berupa dot hijau berbingkai putih, hanya di area yang sama; pemain lokal memakai pin teardrop simetris (`border-radius: 50% 50% 50% 0` + `rotate(-45deg)`), isi cyan `#39bedc`, outline `#fffef4`, ikon player putih — bukan pin abu miring tidak rata. Tujuan quest aktif memakai tanda seru coral pada badge putih; objective tersembunyi/rahasia tidak dipublikasikan oleh peta.
- **Minimap HUD** memakai palet canvas yang sama dengan full map (`MAP` di [Minimap.tsx](src/ui/minimap/Minimap.tsx): ground `#adc66f`, jalan krem, toko/gudang peach) — jangan mengembalikan palet abu-biru/sage lama pada mode compact.
- Ketuk POI membuka `GameModal` putih membulat: judul, pratinjau peta lokasi aktual, deskripsi, jarak, dan tombol oranye **Petunjuk Jalan**. Tombol mengaktifkan registry tujuan bersama (`map-destinations.ts`) melalui waypoint dan `QuestGuidance`, lalu menutup peta. Tujuan bangunan mengarah ke akses masuk, bukan pusat bangunan. Misi Principal aktif tetap memiliki prioritas. Jangan menambahkan teleport atau menerima quest otomatis dari klik POI.
- Peta bisa digeser dengan skala tetap, tanpa kontrol minus, plus, geolocation, atau **Semua**. POI ditambatkan langsung ke koordinat lokasi asli: tidak boleh bergeser otomatis untuk menghindari tabrakan, dijepit ke tepi layar, atau diberi garis penghubung. Saat peta digeser, terrain dan POI bergerak bersama; marker di luar viewport terpotong secara alami. Rak/kasir tetap tersedia di daftar lokasi. Drawer legenda melayang tanpa mengubah proyeksi peta. Pertahankan tab wilayah, penduduk, dan pemain; target sentuh minimal 44 px, modal scroll pada landscape pendek, dan tombol tetap dapat diakses keyboard.
- Saat petunjuk jalan aktif (panah quest di tanah **atau** waypoint Jelajah), tampilkan tombol **Hentikan Petunjuk** tepat di bawah **Quest** pada menu kiri ([StopGuidanceButton](src/ui/hud/StopGuidanceButton.tsx)): artwork panah dicoret via `HudMenuArtwork`, label dua baris. Tap menyembunyikan panah (`guidanceMuted`) dan membersihkan waypoint/track harian tanpa membatalkan quest; petunjuk muncul lagi bila tujuan berubah. Jangan duplikasi tombol clear di panel Jelajah.
- **Panduan** (`game-help-sheet`) palet peach/krem; **Arsip Rahasia** (`game-archive-sheet`) palet ungu/krem — keduanya panel terang Play Together, bukan modal gelap.
- **Handphone** header: jam besar dengan digit stabil, lima indikator sejajar (dini hari/pagi/siang/sore/malam), serta dekorasi matahari/bulan. Periode mengikuti `timeOfDay` dunia melalui `phone-time.ts`; sore memakai sunset peach, malam ungu berbintang, pagi pastel, dan siang biru muda (tanpa gelombang). Teks gelap pada langit terang dan teks putih pada malam; periode aktif ditandai kapsul krem. Kiri tetap tombol **Aktivitas/notif** dengan target minimal 44 px. Radius bingkai 32 px (26 px compact) diteruskan ke layar dalam agar footer ikut membulat; clipping hanya pada isi sehingga tab tutup di **sisi kiri** tetap terlihat.
- Menu Pengaturan lama pada grid telepon tidak ditambahkan kembali; gunakan jalur pengaturan yang sudah tersedia.

### Profil

- Profil adalah **halaman penuh**, dengan area karakter dan informasi yang seimbang; edit profil tetap berupa modal.
- Badge peran berwarna kontras di kanan nama; boleh wrap pada ruang sempit. Badge level kecil dan proporsional, tidak menutupi avatar/nama.
- Point memakai SVG koin bersama; misi memakai bintang filled. Tab Koleksi sudah tidak dipakai.
- Tampilkan data yang benar-benar tersedia. Jangan menambahkan hitungan teman, likes, rumah, atau status dummy agar menyerupai referensi.

### Penampilan dan toko

- **Shop / Toko** dari menu samping dan handphone membuka **halaman penuh** (`ShopPage`), bukan modal — sama seperti Profil.
- **Pakaian** di handphone membuka **halaman penuh** appearance (`AppearancePage`) langsung di tab **Sesuaikan** (bukan halaman Profil). **Infoku** tetap membuka Profil.
- Halaman penuh: model karakter besar di kiri, katalog di kanan, tab atas **Sesuaikan** dan **Toko**.
- Sidebar kiri katalog: **Penampilan, Lemari, Emote**, ikon filled tanpa teks visual; nama tetap tersedia bagi pembaca layar.
- Saldo Point berada di header dekat tab Toko, memakai koin yang sama dengan HUD dan kapsul bernuansa katalog.
- Lemari tidak memiliki input search. Toko tidak memiliki input search atau filter kepemilikan lama.
- Item menggunakan ukuran pratinjau dan gap yang konsisten. Swatch warna tetap bulat (`aspect-ratio: 1`) dan tidak meregang oleh isi grid.
- Ribbon **Dimiliki** hanya tampil di Toko. Tab Sesuaikan tidak menampilkan ribbon tersebut.
- Harga ditampilkan sebagai SVG Point + nominal. Aksi pembelian menggunakan SVG Point + **Beli**.
- **Sesuaikan:** aksi item (**Coba / Pakai / Lepas**) di footer katalog yang fixed. **Simpan** (commit seluruh look) di area pratinjau karakter, di bawah teks “Geser karakter untuk memutar” — jangan campur dengan CTA item.
- Reset membuka modal konfirmasi **Kembali**, penjelasan singkat, tombol **Tidak** orange dan **Iya** cyan. Reset baru dijalankan setelah konfirmasi.
- Pertahankan satu draft penampilan, preview karakter yang sama, dan validasi kepemilikan/saldo dari server.

### Musik Underground dan giliran DJ

- Gunakan **`ClubMusicPanel`** di atas `GameModal`: panel putih/krem, sidebar lavender lembut, artwork piringan hitam, teks cokelat, tombol cyan/oranye, ikon SVG filled bersama shortcut minimap. Hindari console gelap transparan atau tombol teknis yang memenuhi layar.
- Sidebar menunjukkan lagu aktif, status/waktu berjalan, mute lokal, nama DJ, dan cara ikut/batal antre DJ. Jangan membuat durasi atau progress palsu untuk video YouTube. Mute di panel dan minimap berbagi state serta perilaku yang sama.
- Tab **Lagu → Antrean → Ruang DJ** membagi alur pemain. Request memilih katalog yang memiliki audio, lalu **Kirim request**; entri mock tanpa audio tidak ditawarkan. Antrean menampilkan urutan yang disetujui DJ dan nama pengirim bila tersedia. Batas dua request menunggu dan jeda 15 detik tetap diperiksa server; jangan membuat hitung mundur dari data yang tidak tersedia.
- **Ruang DJ** memisahkan link YouTube, jeda/lanjut/berikutnya, tiga pilihan warna lampu dansa, request masuk, dan serah giliran. Hanya DJ aktif dalam jangkauan booth dapat memakai kontrol tersebut. Jika jabatan/jangkauan berubah, tampilkan penjelasan untuk kembali ke booth atau menunggu giliran. Pembatalan antrean/keluar DJ tetap tersedia saat jauh dari booth.
- Link video tidak dihapus saat gagal; sukses ditampilkan setelah snapshot room terbaru mengonfirmasi perubahan. Tahan tap berulang dan nonaktifkan aksi room saat loading, offline, atau command berlangsung. Mute dan tutup tetap bisa dipakai.
- Header/tab tetap mudah dijangkau, isi yang panjang scroll di pane masing-masing pada landscape; layar sempit memakai scroll badan panel. Target sentuh minimal 44 px, focus trap/Escape menggunakan fondasi modal bersama. Teks panjang harus wrap tanpa mendorong kontrol keluar panel.

## 9. Aturan implementasi dan perubahan

1. Baca dokumen ini dan komponen acuan area yang diubah.
2. Perluas komponen bersama terlebih dahulu. Buat komponen baru jika kebutuhan interaksinya memang berbeda, bukan karena jenis quest atau nama NPC berbeda.
3. Simpan CSS khusus di dekat komponen dan import langsung dari komponen. `player-status.css`, `mobile-controls.css`, dan `quest-tracker.css` menjadi contoh. `styles.css` tetap untuk fondasi yang benar-benar global.
4. Scope selector ke root fitur. Hindari override umum seperti `.game-panel button` atau `button` untuk memperbaiki satu layar; hindari tumpukan `!important` dan rule duplikat di akhir file.
5. Pakai mekanisme layer/portal yang sudah ada. Detail dungeon berada di jurnal; tombol aksi, dialog, dan transition tetap berada di layer masing-masing. Jangan menaikkan semua `z-index` untuk menutupi masalah layout.
6. Pertahankan loading, disabled, error, empty state, label aksesibilitas, focus, dan alur penutupan. Transisi singkat sekitar 120–180 ms cukup untuk interaksi biasa; jangan membuat elemen HUD berkedip berulang.
7. Ketika standar visual sengaja berubah, perbarui komponen bersama dan dokumen ini dalam pekerjaan yang sama. Catat bagian yang masih memakai desain lama, jangan menganggap semua panel sudah dimigrasikan.

**Jika desain tampak kembali ke versi lama setelah pull:** bandingkan perubahan Git, sumber CSS, urutan/specificity selector, dan CSS hasil build. Periksa apakah halaman memuat aset lama; refresh penuh bila perlu. Jangan langsung menimpa desain baru atau menyalahkan pull tanpa bukti. Import CSS lokal membantu komponen dan gayanya dimuat bersama, tetapi cache runtime tetap perlu diperiksa.

## 10. Pemeriksaan sebelum perubahan dinyatakan selesai

- [ ] Warna, radius, font, dan ikon mengikuti komponen acuan; tidak muncul varian gelap baru tanpa kebutuhan yang disepakati.
- [ ] Tidak ada kartu samping; detail, dot, progres, error, aksi F/sentuh, batal dan keluar tetap bekerja.
- [ ] Header Point tetap mendatar; judul panjang dan nominal besar tidak merusak layout.
- [ ] Analog diam dan lompat memiliki titik tengah vertikal yang sama; kontrol, chat, dan tracker tidak saling menutup.
- [ ] Layout diperiksa pada landscape pendek (misalnya 844 × 390), landscape lebih tinggi (misalnya 1024 × 768), safe area, dan perubahan tinggi akibat keyboard sesuai area yang diubah.
- [ ] Dialog NPC menyembunyikan HUD lain dan mengembalikannya setelah ditutup.
- [ ] Tombol penting dapat dijangkau dengan sentuhan/keyboard; state aktif dan error tidak hanya dibedakan dengan warna.
- [ ] Data/reward/kepemilikan tidak diubah oleh pekerjaan styling.
- [ ] Tidak ada CSS duplikat atau override yang merusak fitur lain.

Pilih pemeriksaan sesuai perubahan. Untuk kode UI gunakan TypeScript, ESLint pada file terkait, dan build. Untuk logika quest/panduan gunakan skrip yang relevan:

```sh
node_modules/.bin/tsc --noEmit --pretty false
npm run build
node scripts/check-mission-hud-browser.mjs # dengan simulasi Postman daily aktif
node scripts/check-quest-guidance.mjs
node scripts/check-guidance-material.mjs
node scripts/check-dungeon-tracking.mjs
node scripts/check-club-music-panel.mjs
node scripts/check-club-mute.mjs
node scripts/check-player-name-layers.mjs
```

[check-game-ui-browser.mjs](scripts/check-game-ui-browser.mjs) memiliki pemeriksaan layout dan interaksi, termasuk kesejajaran kontrol. Untuk landing/auth gunakan [check-entry-browser.mjs](scripts/check-entry-browser.mjs); untuk lobby/channel (Masuk Dunia dalam 1 viewport) gunakan [check-lobby-browser.mjs](scripts/check-lobby-browser.mjs). Jalankan pengujian browser sesuai lingkungan dan izin sesi yang tersedia. Build dan tes logika tidak membuktikan hasil visual; laporkan dengan jelas jika browser belum diperiksa. Perubahan dokumentasi saja cukup diperiksa format, tautan, dan kesesuaiannya dengan implementasi.

### Gendong dan terbang GM

- Aksi **Gendong** tampil di anchor pemain dan menu profil pemain. Undangan inline di tengah atas memakai kartu krem serta tombol Terima/Tolak; tidak membuka modal yang menghentikan penggendong. Kedua peserta selalu punya Turunkan/Turun, dan jump sentuh penumpang menjadi Turun.
- Kontrol **Terbang · GM** tampil untuk capability terbang atau izin World Editor yang sudah dikonfirmasi server. Saat capability terbang belum siap, tampilkan status pemeriksaan/koneksi dan tombol nonaktif; aktivasi tetap menunggu persetujuan endpoint mobility. Gunakan tombol naik/turun minimal 44px dengan pointer capture, reset saat pointer batal/blur, serta Space/Ctrl pada desktop. Tidak memakai role tampilan avatar untuk memberikan izin.
- Penumpang mengikuti root penggendong dengan pose duduk di punggung; collision penumpang dimatikan selama pasangan server aktif. Satu pasangan tidak dapat menjadi rantai. Progres Obby penumpang mengikuti platform yang benar-benar dipijak penggendong; menyalakan terbang mereset latihan Obby.

- Mode terbang memakai pose **FlightHover** tegak saat diam/naik/turun dan **FlightForward** horizontal dengan tangan ke depan saat bergerak tanpa input vertikal. Peralihan memakai mixer pada kedua rig, tanpa mengubah root fisika.
- Tombol aksi sentuh utama memakai anchor `data-mobile-primary-action` yang tetap terpasang saat lompat, memancing, digendong, atau terbang. Polling rutin tidak menonaktifkan tombol; hanya mutasi dari pengguna yang menandai busy. Saat koneksi gagal, tampilkan status tanpa menyembunyikan tombol GM yang sudah dikenali.

## Daily Mission — pembaruan 22 Oktober 2026

Dekati Koko dan tekan **Terima Daily** di kiri lompat. Lima misi diterima sekaligus dan tujuan pertama dilacak otomatis. Langkah interaktif tetap memerlukan input pemain; VISIT/DISTANCE/event dungeon mengikuti validasi runtime. Setelah selesai, backend langsung membayar melalui ledger dan frontend menampilkan receipt baru tepat sekali, termasuk saat refresh/reconnect. Tidak kembali ke Koko untuk klaim. Target berikutnya dan pulse berganti otomatis; menu hanya untuk detail dan pelacakan. Tidak ada bubble progres atau kartu samping.

## Pemulihan posisi dan gendong — 20 Oktober 2026

- Menu kanan dunia menyediakan **Spawn** (ikon rumah/panah kembali, target sentuh mengikuti menu lain). Tombol memulihkan pemain ke area spawn yang dicek aman oleh physics. Gendong/undangan dan terbang dihentikan melalui server lebih dahulu; jika gagal, tampilkan alasan dan izinkan retry. Venue ditutup melalui alur exit. Dungeon mempertahankan kontrol keluar miliknya karena keluar membatalkan run.
- Pasangan gendong mengikuti pose pembawa pada frame render yang sama; penumpang lokal memakai interpolasi jaringan yang sama dengan visual pembawa, dan penumpang remote mengikuti transform pembawa lokal setiap frame. Saat naik ke punggung ada transisi singkat; animasi tetap lewat mixer bersama.

## Penyempurnaan ruang bermain — 22 Oktober 2026

- Daily: header 44 px pada landscape pendek, ringkasan satu baris ringkas, satu area scroll untuk tujuan/pengantar/hasil. Area daftar tetap mayoritas tinggi panel; pesan selesai tidak dipasang sebagai footer besar.
- Jurnal aktivitas memakai shell jurnal putih/biru, tab krem/oranye, tanpa bingkai hitam atau kartu tracker ganda. Ringkasan level/saldo tidak diulang di jurnal gabungan karena sudah ada di HUD. Tab dan tombol tetap minimal 44 px.
- TALK harian memakai `NpcDialogueShell`: sapaan, jawaban pemain, balasan, pamit. NPC menghadap pemain dengan animasi Talk; menutup dialog tidak dianggap menyelesaikan tujuan.
- Misi truk memakai paket 3D, pulse tujuan, satu tombol konteks, dan status pendek. Saat mengemudi joystick menjadi gas/mundur/belok dan tombol lompat menjadi REM; desktop W/S, A/D, Space dan F. Spawn membatalkan pengiriman dan menyediakan percobaan baru.
- Tata kasir L terbalik membuka jalur tengah: Kasir 3 melintang di belakang, Kasir 1/2 di kanan (1 belakang, 2 depan). Rak kanan dipindah ke belakang. Kamera interior mencari sudut lebih tinggi yang lolos pemeriksaan tabrakan saat terdesak dinding.

- Area pengiriman berada di driveway abu-abu kanan depan, terpisah dari booth dan tempat duduk. Paket ditata di palet rendah, bay cukup diberi empat tanda sudut; pulse dan satu tombol kontekstual tetap menjadi petunjuk utama. Titik muat/naik berada di sisi lapang bak, dengan jalur kaki yang diuji bersama booth dan NPC produksi.

- Saat mengemudi, REM harus bisa ditahan bersamaan dengan joystick gas; rem mengalahkan gas sampai dilepas. Status ditekan mengikuti durasi sentuhan dan dibersihkan pada cancel/blur/keluar. Bay pengiriman tidak boleh berisi properti pickup dekoratif yang menumpuk kendaraan atau palet misi.
