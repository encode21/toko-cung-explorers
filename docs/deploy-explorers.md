# Deploy Toko Cung Explorers — CloudPanel + Docker

World 3D (`toko-cung-explorers`) di VPS:

1. **Docker Compose** — service `explorers-web` di `127.0.0.1:8090`
2. **CloudPanel reverse proxy** — domain → port 8090
3. **Supabase / Lovable Cloud** — auth, profiles, realtime (di luar Docker)

## Deploy

```bash
cd /path/to/toko-cung-explorers
cp .env.cloudpanel.example .env
# Isi VITE_SUPABASE_* dan SUPABASE_*

docker compose up -d --build
curl -sI http://127.0.0.1:8090/
```

Rebuild setelah ganti `VITE_*` (nilai di-bake ke bundle):

```bash
docker compose up -d --build --force-recreate web
```

## CloudPanel

1. Buat site (Reverse Proxy) → `http://127.0.0.1:8090`
2. SSL Let's Encrypt
3. Opsional: sisipkan snippet dari [`cloudpanel-nginx-explorers.conf.example`](cloudpanel-nginx-explorers.conf.example) jika perlu WebSocket / long timeout untuk Realtime (biasanya cukup default Upgrade headers CloudPanel)

## Catatan

- Port **8090** dipilih agar tidak bentrok dengan Tanya (`8088`) dan nginx CloudPanel (`8080`).
- Multiplayer & auth **tidak** butuh Redis di compose ini — channel Supabase Realtime.
- NPC AI (Lovable) opsional lewat `LOVABLE_API_KEY`.

## Local hot-reload

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
# http://localhost:8080
```
