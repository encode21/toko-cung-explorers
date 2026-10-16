# Standar Desain Game — Toko Cung Explore

Pembaruan: **16 Oktober 2026**.

Dokumen ini adalah acuan perubahan HUD dan UI pemain. Arah visual mengikuti referensi Play Together yang dipilih: warna cerah, permukaan putih/krem, bentuk membulat, ikon ekspresif, dan dunia game tetap terlihat. Gunakan data, karakter, aset, dan komponen Toko Cung yang sudah tersedia.

## 1. Prinsip utama

- **Komponen yang sama untuk fungsi yang sama.** Quest berbeda mengubah data, label, dan aksi; bentuk kartu tetap menggunakan komponen bersama.
- **Hierarki jelas:** identitas dan saldo ringkas, tujuan aktif mudah ditemukan, aksi utama mudah disentuh.
- **Ringan di atas dunia game:** hindari panel besar untuk informasi singkat. Buka detail ketika dibutuhkan.
- **Konsisten di desktop dan landscape mobile:** ukuran boleh menyesuaikan, identitas visual dan urutan informasi tetap sama.
- **Data nyata:** saldo, level, hadiah, peran, dan kepemilikan mengikuti state/server. Desain tidak menambah angka atau fitur semu.

CSS gelap bergaya glass yang masih ada pada menu lama bukan acuan desain baru. Saat menyentuh menu lama, gunakan keluarga komponen terbaru tanpa mengubah aturan gameplay yang tidak terkait.

**Jurnal petualangan** (`QuestBoard`) sudah dimigrasikan ke bahasa visual Daily Mission / Play Together (panel putih, header biru, tab kapsul, kartu membulat, tombol orange). Tetap bedakan dari tracker HUD: jurnal adalah browser quest penuh; tracker tetap `QuestTrackerCard`.

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

Periksa komponen berikut sebelum membuat varian baru.

| Area                     | Komponen                                                                                                                        | Pemilik gaya                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Landing, auth, lobby     | [LandingScreen](src/ui/entry/LandingScreen.tsx), [AuthScreen](src/ui/entry/AuthScreen.tsx), [EntryKeypad](src/ui/entry/EntryKeypad.tsx), [WorldLobby](src/ui/entry/WorldLobby.tsx), [ChannelSelector](src/ui/ChannelSelector.tsx), [AppBridge](src/lib/app-bridge.tsx) | [entry.css](src/ui/entry/entry.css) — krem/cyan/orange; 1 viewport; keypad numerik; AppBridge deep link → store |
| Identitas, saldo | [PlayerStatus](src/ui/hud/PlayerStatus.tsx), [UtilityBar](src/ui/hud/UtilityBar.tsx) | [player-status.css](src/ui/hud/player-status.css)                                                               |
| Menu samping             | [ActionDock](src/ui/hud/ActionDock.tsx), [PhoneAppArtwork](src/ui/hud/PhoneAppArtwork.tsx)                                      | [side-menus.css](src/ui/hud/side-menus.css)                                                                     |
| Kartu semua jenis quest  | [QuestTrackerCard](src/ui/hud/QuestTrackerCard.tsx)                                                                             | [quest-tracker.css](src/ui/hud/quest-tracker.css)                                                               |
| Jurnal petualangan       | [QuestBoard](src/ui/quests/QuestBoard.tsx) via [KioskOverlay](src/ui/kiosk/KioskOverlay.tsx)                                   | [quest-journal.css](src/ui/quests/quest-journal.css) — selaras Daily Mission                                    |
| Dance wheel (club)       | [DanceControls](src/ui/hud/DanceControls.tsx)                                                                                   | [dance-wheel.css](src/ui/hud/dance-wheel.css)                                                                   |
| Pertanyaan quest rahasia | [SecretDiscoveryCard](src/ui/secret/SecretDiscoveryCard.tsx)                                                                    | [secret-discovery.css](src/ui/secret/secret-discovery.css)                                                      |
| Quest selesai            | [QuestCompleteOverlay](src/ui/quests/QuestCompleteOverlay.tsx), [QuestConfetti](src/ui/quests/QuestConfetti.tsx)                | [quest-complete.css](src/ui/quests/quest-complete.css), [quest-confetti.css](src/ui/quests/quest-confetti.css)  |
| Aksi pada objek/NPC      | [WorldActionAnchor](src/ui/hud/WorldActionAnchor.tsx), [NpcQuestionIcon](src/ui/hud/NpcQuestionIcon.tsx)                        | [world-actions.css](src/ui/hud/world-actions.css)                                                               |
| Percakapan NPC           | [NpcDialogueShell](src/ui/dialogue/NpcDialogueShell.tsx), [NpcDialoguePortrait](src/ui/dialogue/NpcDialoguePortrait.tsx)        | [npc-dialogue.css](src/ui/dialogue/npc-dialogue.css)                                                            |
| Kontrol sentuh           | [MobileControls](src/ui/hud/MobileControls.tsx)                                                                                 | [mobile-controls.css](src/ui/hud/mobile-controls.css); visual ring analog masih di [styles.css](src/styles.css) |
| Pengaturan               | [GameSettingsPanel](src/ui/game-ui/GameSettingsPanel.tsx)                                                                       | [game-settings.css](src/ui/game-ui/game-settings.css)                                                           |
| Profil                   | [ProfilePage](src/ui/profile/ProfilePage.tsx), [ProfilePanel](src/ui/profile/ProfilePanel.tsx)                                  | [profile-panel.css](src/ui/profile/profile-panel.css)                                                           |
| Penampilan, lemari, toko | [AppearanceStudio](src/ui/profile/AppearanceStudio.tsx), [ExplorerWardrobe](src/ui/profile/ExplorerWardrobe.tsx), [ShopPage](src/ui/hud/ShopPage.tsx) | [appearance-studio.css](src/ui/profile/appearance-studio.css), [shop-panel.css](src/ui/hud/shop-panel.css)      |
| Aktivitas Dunia          | [ActivityFeedPanel](src/ui/hud/ActivityFeedPanel.tsx) via [HudSheet](src/ui/hud/HudSheet.tsx)                                                      | [feed-panel.css](src/ui/hud/feed-panel.css) — krem/oranye                                                      |
| Jelajah                  | [ExplorePanel](src/ui/hud/ExplorePanel.tsx) via [HudSheet](src/ui/hud/HudSheet.tsx)                                                                | [explore-panel.css](src/ui/hud/explore-panel.css) — teal/krem                                                  |
| Hentikan petunjuk        | [StopGuidanceButton](src/ui/hud/StopGuidanceButton.tsx) di menu kiri [ActionDock](src/ui/hud/ActionDock.tsx)                                                 | [side-menus.css](src/ui/hud/side-menus.css), [HudMenuArtwork](src/ui/hud/HudMenuArtwork.tsx)                                                              |
| Panduan                  | [HelpPanel](src/ui/hud/HelpPanel.tsx) via [HudSheet](src/ui/hud/HudSheet.tsx)                                                                              | [help-panel.css](src/ui/hud/help-panel.css) — peach/krem                                   |
| Arsip Rahasia            | [SecretArchivePanel](src/ui/secret/SecretArchivePanel.tsx) via [HudSheet](src/ui/hud/HudSheet.tsx)                                                         | [archive-panel.css](src/ui/secret/archive-panel.css) — ungu/krem                           |

Gunakan fondasi modal/panel yang sudah digunakan komponen acuan agar focus, Escape, penutupan, dan scroll tetap konsisten. Gaya dasar gelap pada fondasi bukan alasan mempertahankan tampilan gelap pada panel baru.

## 5. Tata letak HUD dan kontrol

- Kiri atas: kartu profil krem, avatar cyan, badge level orange. Kartu lokasi (`mmo-location`) tidak ditampilkan. Point tampil mendatar di sebelah kartu profil menggunakan SVG koin.
- Resource utama HUD hanya **Point**. Jangan mengembalikan kapsul XP atau tombol notifikasi lama. Progress XP kecil di kartu profil dan detail XP di profil/reward tetap dapat digunakan.
- Menu samping memakai artwork berwarna dengan label pendek. Ruang kosong di antara tombol tetap dapat dipakai untuk bermain.
- Seluruh tracker ditempatkan di host bersama [Hud](src/ui/hud/Hud.tsx). Offset kiri mengikuti `--side-menu-left`, `--side-menu-left-width`, dan jarak 12 px di `side-menus.css`.
- Lebar tracker saat ini maksimal 236 px, atau 220 px pada layar pendek, tetap dibatasi lebar viewport. Jangan menambahkan posisi absolut tersendiri untuk satu jenis quest.
- **Obby Proyek Langit** memakai `ObbyTracker` + `QuestTrackerCard` di host tracker yang sama, ringkas secara default dan hanya tampil saat run aktif. Area obby berupa proyek konstruksi: rangka beton/scaffolding, peti, balok baja, kontainer, crane, dan pallet gantung bergerak. Rute berisi 59 pijakan dengan 14 checkpoint hingga Finish 31,5 m, mengitari rangka terbuka di bawah crane 33,8 m; collider mengikuti ketebalan peti/kontainer dan jatuh ke lantai konstruksi kembali ke checkpoint. Start/checkpoint/Finish ditandai langsung pada pijakan; checkpoint memakai bendera bernomor dan tanda centang setelah tersimpan. Penyelesaian latihan memakai overlay bersama dengan tema `plaza-obby`, tanpa blok Point/XP karena belum ada reward server untuk aktivitas ini.
- **Lompat** memakai satu `AnimationMixer` untuk setiap rig: antisipasi 60 ms, ayunan tangan naik dengan dua ayunan pendek, keseimbangan saat turun, lalu landing 140 ms. Gait horizontal tetap aktif agar kembali ke lari tidak memulai ulang langkah. Debu kecil berupa lima puff instanced hanya pada takeoff/landing; root fisika, tinggi lompatan, dan tombol lompat tetap mengikuti sistem pemain yang sama.
- **Memancing** memakai `FishingHud` + `QuestTrackerCard` pada host tracker yang sama. Aksi Lempar/Tarik dan Batal selalu terlihat; pancing dipilih lewat select native, petunjuk dan koleksi dibuka dari detail kartu. Koleksi memakai `GameModal` terang dan hasil akun dari server (nama/tier/ukuran), tanpa angka Point tambahan. Jalur biru statis menghubungkan sisi barat Plaza ke danau di belakang obby; Jelajah memakai renderer panduan yang sama dengan titik belok untuk menghindari obby.
- **Pantai dan berenang** memakai destinasi `Pantai Cung` di Jelajah dan papan petunjuk di world. Tidak ada tombol atau region HUD tambahan: analog/WASD mengarah, tombol lompat/Spasi mengayuh, keluar melalui lereng dangkal. Clip Swim/SwimIdle memakai mixer yang sama; cipratan berupa enam partikel instanced dan satu riak, tanpa efek layar atau refleksi mahal.
- **Lari analog** dimulai pada 92% radius fisik dan berhenti di bawah 80%, terlepas dari pengaturan sensitivitas. Tetap satu analog dan satu tombol lompat. Clip Run pada rig Base/Explorer memakai mixer yang sama dengan jalan/lompat/dance, dengan ayunan tangan/kaki lebih lebar, torso condong, dan pantulan pelvis; kecepatan berjalan/lari tetap 4,2/7,4.
- **Titik tengah vertikal analog saat diam dan tombol lompat harus sejajar.** Gunakan `--mobile-control-center` dari `mobile-controls.css`; jangan menambahkan offset terpisah seperti `+100px`.
- Analog boleh mengikuti posisi sentuhan selama digunakan, lalu kembali ke posisi istirahat saat dilepas. Kesejajaran diperiksa ketika analog diam.
- Animasi dance menggunakan koreografi seluruh tubuh: perpindahan berat, lutut lentur, langkah bergantian, torso berputar, dan tangan/pergelangan dengan jeda gerak. Semua delapan dance mempunyai frasa empat ketukan yang berbeda dan loop mulus; model Base dan Explorer memakai adaptasi arah sendi masing-masing. Koreksi tinggi hanya pada pelvis visual agar telapak dekat lantai, tanpa mengubah root pemain. Slot **Sway** kini tampil sebagai **Sidrap**: gerak tangan melingkar dengan siku lentur, jeda gerak bahu–siku–pergelangan, perpindahan berat kanan-kiri, dan langkah rapat memantul dengan perpindahan tumpuan yang dihaluskan, mengikuti referensi Sidrap pengguna. ID internal `sway` tetap kompatibel dengan sinkronisasi multiplayer; nama tampilan memakai `DANCE_LABELS`. Periksa dengan `scripts/check-dance-clips.mjs` dan pratinjau `scripts/check-dance-browser.mjs`.
- Di **Cung Underground / venue club**, tombol **Dance** di posisi **jam 10** relatif pusat lompat (kiri-atas; `--dance-orbit`). Tap membuka **radial wheel** gaya Play Together (krim/cyan/orange, bukan panel gelap penuh). Opsi dance + Stop di pusat; Sync peer tampil di samping bila ada.
- Tombol **Pukul** di posisi **jam 9** (kiri lompat), ukuran sama Dance (`--dance-trigger-size` 52px). Hanya tampil saat pemain lain di dekat; tidak lagi sebagai bubble di atas karakter (ContextPanel hanya **Sapa**). Desktop tetap **G**.
- Chat, menu, dan tracker tidak boleh menutup target sentuh analog/lompat. Geometri menu dimiliki `side-menus.css`: kedua kolom memakai lebar dan gap yang sama (72 px / 10 px; compact 56 px / 6 px), kolom kiri di bawah profil dan kanan terpusat di bawah minimap dengan jarak 12 px. Tinggi tombol compact menyesuaikan viewport terukur, minimal 44 px, agar empat tombol termasuk **Hentikan Petunjuk** tampil utuh di landscape mulai tinggi 320 px. Scroll hanya sebagai fallback untuk ruang yang lebih pendek. Batas bawah kolom mengikuti area chat, bukan memotong tombol pada awal zona analog. Kontrol memakai lebar kolom yang sama untuk menyisakan minimal 12 px dari analog yang mengembang dan tombol lompat; menu berada di atas lapisan kontrol, sedangkan celah antartombol tetap meneruskan input ke dunia. Pertahankan kesejajaran analog/lompat serta dukungan dua jari.
- Gunakan viewport terukur, `--dock-clearance`, `--game-edge-*`, dan `env(safe-area-inset-*)`. Hindari mengunci layout ke ukuran satu screenshot.

## 6. Quest: desain sama, data berbeda

Quest biasa, Rahasia, Principal Dungeon, misi opsional, dan misi harian wajib memakai **`QuestTrackerCard`**. Gunakan `QuestTrackerButton` untuk aksi dan `QuestTrackerGuidance` untuk petunjuk perjalanan.

Urutan informasi kartu: badge kategori dan jumlah langkah → judul → ringkasan tujuan → progress bila tersedia → detail/aksi ketika dibuka. Error harus tetap terlihat saat kartu diciutkan. Aksi penting seperti kembali setelah dungeon selesai tidak boleh terkunci di detail tersembunyi.

State, request, dan progres tetap dimiliki adapter masing-masing (`QuestTracker`, `DungeonHud`, `MissionTracker`, `DailyMissionTracker`). Jangan menyalin markup dan CSS kartu untuk membuat tema dungeon lain. Perbedaan konten menggunakan props/children komponen bersama.

Penunjuk arah dunia menggunakan [QuestGuidance](src/game/core/QuestGuidance.tsx) dan [quest-guidance.ts](src/game/core/quest-guidance.ts). Urutannya: instance dungeon aktif → pintu Principal yang sengaja dilacak → harian yang dilacak → quest dunia aktif. Pilihan tujuan harus tersambung ke panduan, bukan hanya menampilkan kartu HUD. Jangan membuat renderer panah baru untuk setiap jenis quest.

Pertanyaan quest memakai panel putih, bagian fakta krem, opsi terpilih orange, dan tombol utama cyan. Jawaban salah, petunjuk, loading, serta aturan reward tetap mengikuti sistem quest.

Modal selesai memakai `QuestCompleteOverlay`: judul **Quest Selesai**, koin Point besar, jumlah reward aktual, detail XP/waktu lebih kecil, dan tombol **Ok** cyan. Jangan menambahkan multiplier/hadiah fiktif dari gambar referensi. Confetti berasal dari modal, melontar ke atas lalu jatuh; satu ledakan terbatas, tidak menangkap pointer, dibersihkan setelah selesai, dan menghormati reduced motion.

## 7. Objek, NPC, chat, dan fokus percakapan

- Aksi duduk, bertanya, atau berinteraksi ditambatkan pada objek/NPC melalui `WorldActionAnchor`: lingkaran putih, ikon gelap, outline gelap, dan ekor pendek menuju target.
- Posisi memakai proyeksi bersama dan mengikuti karakter/objek dengan stabil. Jangan menghitung ulang posisi dengan interval berbeda untuk tiap tombol hingga berkedip.
- Tanda tanya memakai `NpcQuestionIcon` agar pusat ikon konsisten. Saat duduk, berdiri melalui tombol lompat; tidak perlu tombol panah berdiri tambahan.
- Nama pemain menggunakan [PlayerNameBadge](src/game/net/PlayerNameBadge.tsx): kapsul berwarna, warna konsisten per pemain, nama lokal ungu dengan teks hijau terang.
- Maskot NPC memakai preset `NPC_AVATARS` yang sama di dunia dan potret dialog: Ko Asu berambut abu-abu, kacamata persegi, masker biru, dan cheongsam marun; Koko Cung berambut belah samping, kacamata hitam bulat, dan cheongsam biru gelap. Detail pakaian mengikuti tulang avatar melalui `mascot-details.ts`.
- Nama NPC menggunakan [NpcLabel](src/game/world/NpcLabel.tsx): hitam transparan (`#11110e`, opacity maksimal saat ini 0.62), teks kuning (`#ffe27a`).
- Chat dunia memakai [PlayerChatBubble](src/game/net/PlayerChatBubble.tsx): putih membulat, teks gelap, ekor pendek, dekat dengan label/karakter. Jangan menambahkan jarak vertikal besar yang membuat pengirim sulit dikenali.
- Percakapan NPC memakai `NpcDialogueShell`: portrait NPC yang sesuai di kiri, dialog krem di bawah, nama NPC di badge, pertanyaan/aksi di dalam dialog.
- Selama percakapan, sembunyikan HUD gameplay yang mengganggu—profil, Point, menu, tracker, chat dock, dan kontrol. Gunakan [GameplayHudLayer](src/ui/hud/GameplayHudLayer.tsx) serta [useNpcConversation](src/hooks/use-npc-conversation.ts) agar aturan fokus sama untuk seluruh NPC.

## 8. Pengaturan, profil, dan penampilan

### Pengaturan

- Suara dan musik berada di **Pengaturan Game**; tidak perlu menu suara terpisah.
- Panel putih dengan kelompok pengaturan krem, switch orange, dan aksi cyan.
- Kualitas grafis dan ukuran UI menggunakan pilihan tab/segmented, bukan dropdown ukuran UI.
- Lebar maksimal pengaturan saat ini 760 px, dibatasi viewport dan safe area. Konten panjang scroll di dalam panel.
- **Aktivitas Dunia** (app Handphone → Aktivitas) memakai panel `game-feed-sheet` palet **krem/oranye** (bukan biru Daily Mission): header orange, ringkasan krem, ikon lonceng filled + badge notifikasi, kartu list krem dengan badge waktu.
- **Jelajah** memakai panel `game-explore-sheet` palet **teal/krem**: header cyan, kartu destinasi putih dengan pin filled terpusat (`align-items: center`), chip sekitar toko berwarna lembut — bukan modal gelap lama. Memilih destinasi mengaktifkan **panah tanah yang sama dengan quest** (`exploreWaypointTarget` → `QuestGuidance`), plus penanda waypoint di tujuan.
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

## 9. Aturan implementasi dan perubahan

1. Baca dokumen ini dan komponen acuan area yang diubah.
2. Perluas komponen bersama terlebih dahulu. Buat komponen baru jika kebutuhan interaksinya memang berbeda, bukan karena jenis quest atau nama NPC berbeda.
3. Simpan CSS khusus di dekat komponen dan import langsung dari komponen. `player-status.css`, `mobile-controls.css`, dan `quest-tracker.css` menjadi contoh. `styles.css` tetap untuk fondasi yang benar-benar global.
4. Scope selector ke root fitur. Hindari override umum seperti `.game-panel button` atau `button` untuk memperbaiki satu layar; hindari tumpukan `!important` dan rule duplikat di akhir file.
5. Pakai mekanisme layer/portal yang sudah ada. Kartu dungeon berada dalam host tracker; world action, dialog, dan transition tetap berada di layer masing-masing. Jangan menaikkan semua `z-index` untuk menutupi masalah layout.
6. Pertahankan loading, disabled, error, empty state, label aksesibilitas, focus, dan alur penutupan. Transisi singkat sekitar 120–180 ms cukup untuk interaksi biasa; jangan membuat elemen HUD berkedip berulang.
7. Ketika standar visual sengaja berubah, perbarui komponen bersama dan dokumen ini dalam pekerjaan yang sama. Catat bagian yang masih memakai desain lama, jangan menganggap semua panel sudah dimigrasikan.

**Jika desain tampak kembali ke versi lama setelah pull:** bandingkan perubahan Git, sumber CSS, urutan/specificity selector, dan CSS hasil build. Periksa apakah halaman memuat aset lama; refresh penuh bila perlu. Jangan langsung menimpa desain baru atau menyalahkan pull tanpa bukti. Import CSS lokal membantu komponen dan gayanya dimuat bersama, tetapi cache runtime tetap perlu diperiksa.

## 10. Pemeriksaan sebelum perubahan dinyatakan selesai

- [ ] Warna, radius, font, dan ikon mengikuti komponen acuan; tidak muncul varian gelap baru tanpa kebutuhan yang disepakati.
- [ ] Semua jenis quest masih menggunakan kartu bersama; progress, error, dan aksi tetap bekerja.
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
node scripts/check-quest-trackers.mjs
node scripts/check-quest-guidance.mjs
node scripts/check-guidance-material.mjs
node scripts/check-dungeon-tracking.mjs
```

[check-game-ui-browser.mjs](scripts/check-game-ui-browser.mjs) memiliki pemeriksaan layout dan interaksi, termasuk kesejajaran kontrol. Untuk landing/auth gunakan [check-entry-browser.mjs](scripts/check-entry-browser.mjs); untuk lobby/channel (Masuk Dunia dalam 1 viewport) gunakan [check-lobby-browser.mjs](scripts/check-lobby-browser.mjs). Jalankan pengujian browser sesuai lingkungan dan izin sesi yang tersedia. Build dan tes logika tidak membuktikan hasil visual; laporkan dengan jelas jika browser belum diperiksa. Perubahan dokumentasi saja cukup diperiksa format, tautan, dan kesesuaiannya dengan implementasi.
