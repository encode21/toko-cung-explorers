# Kalender Login Harian dan banner Hari Pahlawan

Verifikasi lokal 9 November 2026, branch `codex/world-pahlawan-quest`.

## Hasil

Kalender lama sebelum `b108e02` dipulihkan sebagai enam kartu + kartu hari ketujuh besar, dengan data klaim nyata menggantikan placeholder. Tetap 50 Point per klaim sesuai config backend, maksimal sekali per tanggal WIB. Riwayat tujuh klaim dihitung dari jurnal existing; hari terlewat tidak menghapus progres, dan siklus baru dimulai pada tanggal setelah klaim ketujuh. Tanpa migration atau perubahan rumus reward, campaign/cap/redeem.

Banner Jejak Pahlawan tampil otomatis saat event NATIONAL_DAY/pahlawan aktif dan dunia siap, menunggu popup/percakapan/aktivitas lain selesai. Login Harian memakai antrean sheet yang sama. Menutup popup menahannya untuk sesi halaman itu; menu Pahlawan membuka ulang banner. CTA menyaring daftar quest, dan event off/expired menutup banner serta menyembunyikan menunya. Periode dan nominal reward mengikuti server (fixture: 10–16 November 2026, 5.000 Point chain dan 300 Point/hari).

## Verifikasi

- Backend `vendor/bin/phpunit --filter World`: **131 tes, 1.089 assertion**, lulus. Termasuk klaim ganda, pemisahan akun, WIB, skip tanggal, tujuh klaim, siklus baru, serta regresi budget/redeem.
- Frontend `npx tsc --noEmit` dan `npm run build`: lulus. Warning ukuran chunk Vite tetap ada.
- `node scripts/check-event-popups-browser.mjs`: lulus pada **667×375, 740×360, 844×390, 932×430, 1024×768, 1280×720**. Kalender, notice dan tombol muat tanpa scroll; tombol ≥44 px; tidak ada page error atau dialog bertumpuk. Uji dua tap, respons klaim hilang dan retry, budget habis, error koneksi, serta penolakan respons dari akun sebelumnya. Uji antrean setelah Handphone, dismiss/reopen, CTA quest dan expiry event.
- Screenshot `*-daily.png`, `*-event.png`, dan `844x390-day-seven.png`. Jam browser fixture 10 Nov 2026; transport mock, komponen UI produksi. Hasil 740×360, 844×390, dan desktop diperiksa visual.
- Tes HUD umum diperbarui untuk state login nonaktif; suite HUD umum tidak dijalankan ulang, pengujian fokus di atas mencakup perubahan popup.
- Belum deploy atau uji akun production/perangkat mobile fisik. Backend harus dirilis sebelum frontend baru karena kontrak status menambahkan `days`, `currentDay`, dan `resetAt`. Ikuti runbook Kratos Brain `world-tranche-redeem` untuk aktivasi event.

## Area perubahan

- Backend: `app/Services/World/WorldDailyLogin.php`, `tests/Feature/WorldDailyLoginTest.php`.
- Game: `src/game/daily/{login.ts,DailyRuntime.tsx}`, `src/state/hud-store.ts`, `src/ui/hud/{DailyLoginPanel.tsx,daily-panels.css,PahlawanEventPanel.tsx,pahlawan-event.css,HudSheet.tsx,ActionDock.tsx}`, `src/ui/quests/QuestBoard.tsx`.
- Asset: `public/assets/events/pahlawan-2026.jpg`; panduan `style-game.md`; fixture `tests/fixtures/hud/{entry.tsx,client.ts}`; skrip popup dan ekspektasi login pada `scripts/check-game-ui-browser.mjs`.

## Artwork

Shortcut Pahlawan direvisi 9 November 2026 menjadi banner horizontal seperti referensi MLBB: artwork event merah/emas, label EVENT TERBATAS dan judul HARI PAHLAWAN, 216×60 px desktop / 184×44 px compact. Banner berada di bawah profil dan membuka popup yang sama. Kolom ikon hanya berisi menu reguler dan Hentikan Petunjuk; varian SVG Pahlawan sebelumnya dihapus karena tidak lagi dipakai. Pada tinggi di bawah 360 px, banner bergeser ke kanan kolom menu agar tombol tetap utuh.

Screenshot `844x390-menu.png` (touch), `1280x720-menu.png` dan `640x320-menu.png` memperlihatkan banner pada HUD produksi dengan transport fixture. Ketiganya diperiksa visual. TypeScript, build, dan skrip browser enam ukuran lulus; cek tambahan 640×320 memastikan banner tidak menimpa profil/menu/joystick, empat tombol menu muat tanpa scroll, dan target sentuh ≥44 px. Klik banner membuka popup; expiry menyembunyikannya. Tidak ada perubahan backend, jadwal, reward, atau alur quest. Revisi banner shortcut belum diverifikasi pada deployment/perangkat fisik.

Artwork original dibuat dengan tool imagegen, tanpa aset MLBB. PNG sumber 1672×941, dikonversi ke JPEG kualitas 85 (322 KB) untuk runtime. Output tool: `exec-29595bbc-0645-4635-92f8-6c6499e0f695.png`; asset tersimpan di `public/assets/events/pahlawan-2026.jpg`. Semua teks, reward dan tombol adalah UI HTML, bukan bagian gambar.

Prompt:

> Create a polished ORIGINAL 16:9 landscape background illustration for a mobile game's Indonesian Hari Pahlawan event popup, premium colorful 3D stylized casual adventure game art. This is artwork to integrate into an actual interface, NOT a screenshot or a complete UI. Composition: leave the left 48% mostly clear dark burgundy with a soft subtle golden sunburst, for live text added by the app; put the main characters in the RIGHT half, full upper bodies and some lower bodies visible, with faces comfortably below the top edge. On the right, a friendly adult Chinese-Indonesian shopkeeper with side-parted black hair, round dark glasses, navy blue modern cheongsam jacket and beige trousers, alongside an Indonesian young adult woman with dark hair and a red scarf, happily helping carry a cardboard box of community supplies. Heroic community spirit, no weapons, no violence. Tall flowing Indonesian red-over-white flags behind them, a distant charming Surabaya-inspired neighborhood and subtle Tugu Pahlawan silhouette, warm gold rim light, elegant crimson and ivory fabric folds, a few golden particles. Strong depth, beautiful crafted game character proportions, restrained detail so it stays crisp at phone landscape sizes. Dark red, warm gold, ivory, touches of navy. No writing, no numbers, no labels, no logos, no buttons, no borders, no watermarks. Keep lower 20% subdued enough for UI cards to overlay. High quality game event key art.
