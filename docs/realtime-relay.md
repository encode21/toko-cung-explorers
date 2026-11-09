# Realtime relay (pengganti Supabase Realtime)

Multiplayer World (posisi pemain, presence, chat, traffic, mission, event) sekarang bisa
lewat relay WebSocket sendiri: `relay/server.mjs` (Node + `ws`). Supabase tetap jadi
cadangan selama `VITE_REALTIME_URL` kosong.

## Kenapa
Supabase Realtime menghitung kuota pesan per detik dari pesan yang **diterima** setiap
pemain. Posisi (8×/detik per pemain) plus traffic host (sampai 25×/detik) melampaui kuota
saat room ramai, lalu channel ditutup dan muncul banner "Koneksi multiplayer terputus".
Relay sendiri tidak punya kuota; batasnya hanya CPU/bandwidth VPS (±150 KB/detik untuk
10 pemain).

## Cara kerja
- Laravel tetap menandatangani token lease HS256 (`WorldChannels::signRealtimeToken`,
  berlaku 90 detik, diperpanjang tiap 25 detik). Relay memverifikasinya dengan secret yang
  sama: `WORLD_REALTIME_JWT_SECRET`.
- Client membuka `wss://<host>/realtime/ws` dan mengirim `join` berisi topic
  `world:<channel>`, presence key, dan token di pesan pertama. Token tidak ada di URL.
  Topic harus sama dengan klaim `world_channel`.
- `bc` diteruskan ke pemain lain di room (bukan ke pengirim). `track` memperbarui
  presence, dan seluruh state presence dikirim ke room setiap kali berubah.
- `auth` memperpanjang token. Token baru harus untuk room dan `connection_id` yang sama.
  Kalau token lewat `exp`, socket ditutup (kode 4002), lalu room-recovery di client
  menyambung ulang.
- Rate limit 50 pesan/detik per koneksi (burst 100). Kelebihannya dibuang tanpa
  memutus koneksi. Payload maksimal 32 KB.
- `POST /realtime/v1/api/broadcast` meniru endpoint Supabase, jadi GM chat dari
  `/world-admin/players` (`WorldChannels::sendGmChat`) tidak perlu diubah.
- `GET /health` (atau `/realtime/health` lewat nginx) untuk healthcheck.
- Client: `src/net/relay.ts` (`RelayChannel`) meniru API channel Supabase yang dipakai.
  `src/net/realtime.ts` memilih relay kalau `VITE_REALTIME_URL` diisi.

## Rollout
1. Di `.env` VPS explorers:
   - `WORLD_REALTIME_JWT_SECRET` = nilai yang **sama** dengan Laravel.
   - `VITE_REALTIME_URL=wss://world.tokocung.com/realtime/ws`.
2. Tambahkan `location /realtime/` dari `docs/cloudpanel-nginx-explorers.conf.example` ke
   vhost CloudPanel, lalu reload nginx.
3. `docker compose up -d --build`. Ini menjalankan `web` dan `realtime` (127.0.0.1:8091).
   Cek: `curl -s http://127.0.0.1:8091/health` dan
   `curl -s https://world.tokocung.com/realtime/health` (melalui nginx).
4. Laravel `.env`: `WORLD_REALTIME_URL=https://world.tokocung.com` (relay melayani
   `/realtime/v1/api/broadcast`). `WORLD_REALTIME_KEY` boleh tetap terisi, karena relay
   mengabaikan header `apikey`. Lalu `php artisan config:cache`.
5. Uji dengan 2 perangkat di channel yang sama: saling terlihat bergerak, chat, traffic
   sinkron, dan "Sapa" GM dari `/world-admin/players` muncul.

Rollback: kosongkan `VITE_REALTIME_URL`, rebuild `web`, dan kembalikan
`WORLD_REALTIME_URL` ke URL Supabase.

## Verifikasi
- `npm run test:relay`: verifikasi token (valid, kedaluwarsa, signature palsu), isolasi
  room, broadcast tidak memantul ke pengirim, presence join/leave, kick saat token
  kedaluwarsa vs tetap tersambung setelah perpanjangan, rate limit, dan endpoint GM chat.
- Satu proses relay menyimpan room di memori. Untuk lebih dari satu instance perlu pub/sub
  (mis. Redis); belum diperlukan untuk satu VPS.
