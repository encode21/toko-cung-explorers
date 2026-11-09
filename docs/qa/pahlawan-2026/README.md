# Hari Pahlawan 2026 — QA lokal, 9 November 2026

Branch kedua repo: `codex/world-pahlawan-quest`. Backend quest dapat dirilis lebih dahulu; dekorasi berada dalam commit terpisah. Belum deploy atau mengubah database production.

## Hasil

- Backend: `vendor/bin/phpunit --filter World` → **130 tests, 1.039 assertions**, lulus.
- Frontend: `npm run build`, `npx tsc --noEmit`, `node scripts/check-reactive-world.mjs`, dan `node scripts/check-pahlawan-browser.mjs` lulus.
- Lima quest melalui `WorldContent::saveQuest`, target melalui `WorldTargets::save`; revision, audit, dan transaksi tetap digunakan. Rerun menjaga identitas/posisi registry dan memperbarui definisi quest. Rerun tanpa `--enable` menonaktifkan lima quest kembali.
- Jadwal quest: **10 November 2026 00:00 WIB ≤ waktu < 17 November 2026 00:00 WIB**. Empat quest ONCE berurutan membayar 500 + 1.500 + 1.000 + 2.000 = **5.000 Point**; daily VISIT tanpa prasyarat membayar 300 Point/hari WIB. Semua memakai `pahlawan-2026`. Formula payout, cap 10.000/hari, budget, grant/login dan redeem FEAT-107 tidak diubah.
- Validasi TRIVIA sudah ada di `WorldGame::resolveSecretObjective`. Untuk ketiga FIND, tes mengirim jawaban kosong, salah, lalu benar: hanya jawaban benar menambah progres dan 50 XP, tanpa Point tambahan. `correctAnswer` tidak dikirim dalam proyeksi publik. Tidak perlu perubahan service reward/anti-abuse.
- `NATIONAL_DAY` menerima `payload.theme = pahlawan | kemerdekaan`; form admin dapat mengaktifkan/menonaktifkan dengan revision check. Tipe ini tidak dapat dijadikan `event_type` quest. Dekorasi Pahlawan dan marker bendera mengikuti event aktif, jadwal dan lease yang sudah ada. Saat off/expired/lease habis, dekorasi di-unmount dan marker quest kembali ke tampilan biasa. Tema `kemerdekaan` diterima sebagai kontrak, tetapi tidak merender dekorasi Pahlawan.

## Target baseline

Ini hasil berdasarkan registry bawaan migration repo, **bukan pembacaan registry production**. Command mencetak pilihan aktual. Koko Cung/gudang/pos yang sudah tersedia dipakai ulang; target dengan ID sama tidak dipindahkan. ID hasil reuse dipertahankan pada rerun.

| Peran | ID | x | y | z |
| --- | --- | ---: | ---: | ---: |
| Koko Cung, NPC diam existing | `npc_daily_cung` | 2.8 | 0 | 5.5 |
| Gudang, pintu existing | `legacy_0204566ef852fded8df43c22` | 6.2 | 0 | -15 |
| Pos Jaga | `pahlawan_pos_jaga` | 17 | 0 | 11.7 |
| Bendera trotoar supplier | `pahlawan_bendera_1` | -14.5 | 0 | 14.8 |
| Bendera jalur timur toko | `pahlawan_bendera_2` | 10.4 | 0 | -9.75 |
| Bendera plaza konser | `pahlawan_bendera_3` | 41 | 0 | 10 |

Fallback jika belum ada: `npc_pahlawan_koko` di `[2.8,0,5.5]`, `pahlawan_gudang` di `[6.2,0,-15]`; nama NPC baru “Koko Cung — Pos Pahlawan”, tanpa external entity binding. Bendera pertama berjarak 2 m dari `SUPPLIER_TEMP_POST` di `landmarks.ts`; gudang memakai pintu registry/passage di `layout.ts`, bukan titik tengah meja penerimaan. Pos Jaga berada di jalur depan toko, bendera kedua di service walk, bendera ketiga di pintu plaza konser.

DELIVER berurutan setelah COLLECT. `min_seconds = max(3, ceil(jarak XZ / 4.2 × 0.7))`, mengacu WALK_SPEED 4,2 m/s; baseline **5 detik** sebagai batas bawah. Posisi hasil reuse dipakai untuk perhitungan.

## Bukti visual dan geometri

- `mobile-active.png`: 844×390, banner di depan kanopi, bendera dan umbul-umbul aktif.
- `mobile-inactive.png`: dekorasi off.
- `mobile-trivia-flag.png`: marker FIND TRIVIA berupa bendera kecil.
- `mobile-plaza.png`: dekorasi plaza dan marker bendera ketiga.
- `desktop-active.png`: 1280×720.
- `checks.json`: keenam titik lolos capsule clearance dan pencarian jalur dari spawn melalui collider statis toko, jalan, furnitur, supplier, dock, properti dan plaza asli.

Dekorasi menggunakan **34 kotak dalam satu instanced batch + satu Text**, tanpa loop animasi/lampu/collider/shadow caster baru. Marker aktif memakai satu batch tiga kotak menggantikan gem/secret prop. Jumlah collider fixture tetap **68** saat on/off. Browser tidak menghasilkan page error. Vite memberi peringatan ukuran chunk; browser memberi deprecation warning Three Clock/Rapier yang sudah berasal dari runtime.

Fixture menggunakan komponen produksi, registry baseline dan transport mock. Bukan playtest akun live; tidak menguji lalu lintas/NPC bergerak, perubahan registry production, jaringan multiplayer, atau FPS/thermal perangkat mobile fisik. Performa mobile nyata masih harus diperiksa saat playtest.

## Rollout

1. Deploy backend; pastikan migration FEAT-107 dan target registry sudah terpasang. Tidak ada migration baru untuk perubahan ini. Deploy frontend dekorasi sebelum menyimpan event `NATIONAL_DAY` pertama kali: client lama menolak jenis event keempat, termasuk baris nonaktif.
2. Jalankan `php artisan world:seed-pahlawan-2026` untuk membuat lima quest **nonaktif**.
3. Catat target yang dicetak; cek registry di World Editor dan playtest chain/daily di staging atau mode playtest. Pastikan Koko Cung existing terlihat (NPC daily mengikuti pengaturan daily) dan semua target hasil reuse tetap bisa dijangkau.
4. Jalankan `php artisan world:seed-pahlawan-2026 --enable`. Ini mengaktifkan quest sesuai jadwal WIB; tidak menambah alokasi campaign.
5. Di `/world-admin`, pilih `NATIONAL_DAY`, tema `pahlawan`, mulai **10 Nov 2026 00:00 WIB**, selesai **17 Nov 2026 00:00 WIB**, centang aktif dan simpan. Muat ulang client lama. Perubahan event mengikuti interval sinkronisasi yang sudah ada.
6. Pantau distribusi campaign dan redeem di laporan FEAT-107. Untuk mematikan dekorasi, hapus centang aktif lalu simpan. Untuk mematikan quest, jalankan ulang seed tanpa `--enable` atau ubah masing-masing melalui admin. Run yang sudah diterima mengikuti aturan snapshot reward yang sudah ada.

## File yang berubah

Backend `toko-cung`:

- `app/Console/Commands/WorldSeedPahlawan2026.php`
- `tests/Feature/WorldPahlawanSeedTest.php`
- `app/Services/World/WorldContent.php`
- `app/Http/Controllers/World/WorldAdminController.php`
- `resources/views/page/world-admin/index.blade.php`
- `tests/Feature/WorldContentTest.php`

Frontend `toko-cung-explorers`:

- `src/game/reactive-world/model.ts`
- `src/game/reactive-world/mock.ts`
- `src/game/reactive-world/NationalDayDecorations.tsx`
- `src/game/core/QuestMarkers.tsx`
- `src/game/engine/GameCanvas.tsx`
- `scripts/check-reactive-world.mjs` (termasuk resolusi alias `@/lib/id` pada loader test agar pemeriksaan runtime dapat dijalankan)
- `scripts/check-pahlawan-browser.mjs`
- `tests/fixtures/pahlawan/index.html`
- `tests/fixtures/pahlawan/entry.tsx`
- `docs/qa/pahlawan-2026/README.md`, `checks.json`, dan lima PNG di atas.

Kratos Brain: FEAT-107, runbook `world-tranche-redeem`, index Features/Runbooks, dan Daily `2026-11-09`.

## Sumber isi kuis

- [Ensiklopedia Kementerian Kebudayaan — Hotel Yamato](https://esi.kemenbud.go.id/wiki/Hotel_Yamato): perobekan bagian biru pada 19 September 1945; berbeda dari tanggal pertempuran 10 November.
- [ANRI — Pertempuran 10 November 1945](https://anri.go.id/publikasi/berita/peringati-hari-pahlawan-pameran-binar-angkat-tema-peristiwa-pertempuran-10-november-1945): peran Bung Tomo melalui Radio Pemberontakan dan seruan “Merdeka atau mati”.
- [ANRI — Insiden Perobekan Bendera](https://www.anri.go.id/publikasi/berita/pameran-binar-bulan-september-insiden-perobekan-bendera-belanda-di-surabaya): Hari Pahlawan diperingati setiap 10 November.
