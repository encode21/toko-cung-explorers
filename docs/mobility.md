# Gendong dan terbang

Dekati pemain, pilih ikon Gendong (dua orang) atau menu profil → Gendong pemain. Penerima memilih Terima/Tolak. Penggendong bergerak dan melompat seperti biasa; masing-masing dapat mengakhiri lewat Turunkan/Turun. Undangan habis setelah 20 detik; pemain yang disconnect, berpindah ruangan, duduk, memancing, atau masuk editor melepaskan pasangan. Pasangan tidak memberi XP atau hadiah. Progres latihan Obby penumpang mengikuti urutan platform yang benar-benar dipijak penggendong.

Terbang memakai otorisasi `WorldTargets::canEdit` dari backend (akun admin atau izin WORLD_EDITOR). Tombol hanya tampil setelah server mengonfirmasi. WASD/analog mengatur horizontal, tahan Space/tombol naik untuk naik, Ctrl/tombol turun untuk turun; lepas untuk melayang. Akhiri terbang mengembalikan gravitasi. Menyalakan terbang mereset latihan Obby. Batas atas 80m.

Deploy backend toko-cung dengan migration `2026_10_16_190000_create_world_mobility_tables.php` sebelum frontend. Kontrak ada di backend `docs/WORLD_MOBILITY.md`. Endpoint baru `POST /api/world/mobility` memakai autentikasi akun/lease yang sama. Capability dan persetujuan divalidasi server; fisika/posisi tetap disimulasikan client seperti gerakan dunia sebelumnya, bukan sistem anti-cheat server.

Validasi:
- Backend: `vendor/bin/phpunit tests/Feature/WorldMobilityTest.php` memakai database SQLite lokal, menguji service produksi, otorisasi, lifecycle, jarak, dan penolakan spoof role.
- Frontend: jalankan `postman simulation run postman/simulations/mobility.sim.yaml --port 4511 --output ndjson`, kemudian `node scripts/check-mobility-browser.mjs`. Mock lokal dibuat dari kontrak backend milik proyek; tidak mencari mock tim lain. Script menjalankan Player/Rapier, renderer remote, HUD, store, dan worldRequest produksi. Boundary server function memakai HTTP ke simulasi; posisi antar tab memakai BroadcastChannel sebagai pengganti transport Supabase. Tidak memverifikasi autentikasi produksi atau jaringan multiplayer live.
- Screenshot/report browser di `/tmp/toko-mobility-qa`; log simulasi perlu dicek agar request benar-benar lewat HTTP. Tidak ada token atau data akun nyata di fixture.
