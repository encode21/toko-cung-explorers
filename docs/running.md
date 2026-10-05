# Cara menjalankan Toko Cung Explorers

## Opsi A — Docker Compose (disarankan)

### Local (hot reload)

```bash
cd toko-cung-explorers
cp .env.example .env
# Isi VITE_SUPABASE_* / SUPABASE_* dari Lovable Cloud / Supabase project

docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Service | URL |
|---|---|
| World UI | http://localhost:8080 |

### CloudPanel / VPS

Port default compose **tidak** memakai 8080/8088 host (sudah dipakai nginx / Tanya).

```bash
cp .env.cloudpanel.example .env
# Isi Supabase URL + publishable key
docker compose up -d --build
# web=127.0.0.1:8090
```

Reverse proxy: lihat [`deploy-explorers.md`](deploy-explorers.md) + [`cloudpanel-nginx-explorers.conf.example`](cloudpanel-nginx-explorers.conf.example).

### Smoke

```bash
curl -sI http://127.0.0.1:8090/
docker compose logs -f web
```

### Stop

```bash
docker compose down
```

## Opsi B — Tanpa Docker (dev lokal)

```bash
npm install
cp .env.example .env   # atau pakai .env yang sudah ada
npm run dev
```

Buka http://localhost:8080 (atau port Vite yang ditampilkan).

## Env penting

| Variable | Dipakai untuk |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Auth + Realtime di browser (bake saat build) |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | SSR / server functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Opsional, admin server saja |
| `LOVABLE_API_KEY` | Opsional, dialog NPC AI |

Auth & multiplayer tetap memakai **Supabase / Lovable Cloud** (bukan container lokal).
