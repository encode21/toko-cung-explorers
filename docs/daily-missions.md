# Daily Missions and shared mission actions

Implementation spans Explorers and the adjacent `toko-cung` Laravel application. The existing Daily Mission panel is retained for details/tracking. Login Harian is separate.

## Gameplay and authority

- One persistent set of five distinct definitions per account and Asia/Jakarta date. Weighted selection reduces repeats; accepted requirements/rewards are pinned snapshots.
- Over 20 templates cover routes, distinct NPC conversations, cashier/kiosk/clue actions, ordered deliveries, validated walking and eligible dungeon entry/objectives.
- Near Koko, the shared action button says **Terima Daily**. `open` then `accept` validate fresh server presence; all five become active. No daily menu is needed.
- Only post-acceptance actions count. Interactive steps require a button press. VISIT/DISTANCE use validated pose samples; stale samples, jumps and dungeon movement cannot earn walking progress. Dungeon progress uses server-validated entry/completed objectives.
- AVAILABLE → ACTIVE → COMPLETED → CLAIMABLE → CLAIMED. Completion and settlement normally occur in one account-locked transaction. CLAIMABLE remains for compatibility/pending settlement. Current-day legacy CLAIMABLE rows settle on the next sync; expired rows are never reopened.
- Completion of all five updates streak; settlement of the fifth gives 150 bonus XP exactly once, including multiple completions from one event. A missed completion day breaks streak.
- CP = max(0, min(requested CP, shared daily cap remaining, campaign allocation remaining, total campaign budget remaining)). Default reward remains 20 CP plus template XP; daily cap remains 10,000. Inactive campaigns pay zero CP; XP remains full. A missing campaign leaves the completed reward pending for later sync.

## HUD and controls

`context-action.ts` resolves one action for both touch and F: active dungeon objective → tracked objective → other active objective → acceptance → generic interaction. Equal priorities use distance then stable ID. Execution re-resolves target, radius, stage and state; busy guards block repeated submission. Failed daily interactions retain their request ID for retry.

All side cards and the daily progress bubble are removed. `ActivityJournal` exposes Quest/Misi/Dungeon/Obby; Quest stays reachable during dungeon runs, including confirmed exit. Daily contains objectives, progress, actual receipts and tracking only. Existing runtime subscriptions, transitions, completion effects and fishing bite feedback stay mounted.

Obby shows one line for step/checkpoint. Fishing shows compact status and bite time above the primary control, with settings for rods/stop/inventory. Touch hook and Space remain available. Controls are at least 44px and clear of chat, joystick, jump and Spawn.

Daily dots represent new sets/receipts; Quest dots represent new offers/runs/results; Phone/Inventory dots represent new catches. Seen identities and last inventory updates persist per account locally. Opening the corresponding section clears its dot; ordinary progress does not re-light it. Cross-device seen-state synchronization is not provided.

Guidance/pulses use existing world renderers and preserve secret discovery rules. The latest selected daily/quest/optional focus chooses world guidance; active dungeon takes priority. There are no duplicate world-marker action buttons.

## API and persistence

Authenticated `POST /api/world/daily-quests` accepts `read`, `open`, `accept`, `interact`, `claim` and UUID `requestId`. Response fields remain unchanged: set/time/reset/revision/progress/receipt/streak/wallet/profile. `claim` remains idempotent compatibility for older clients but no longer needs NPC proximity. New clients never need it.

`WorldDailyQuests` settles through the existing immutable daily reward ledger, wallet, campaign and profile, under account-first locking. A unique reward idempotency key protects each instance. The freshly reloaded set is used for each payment, preventing repeated fifth-mission bonus. No schema change is required for this update; existing daily migrations remain prerequisites.

Frontend replaces balances from authoritative projections, never adds rewards locally. Every response, including initial/reconnect/read, is scanned for new receipts. Persisted account/instance receipt IDs prevent repeated toasts on polls or reload. Reset is anchored to server time; account epochs discard stale responses.

## Local verification and simulation

- Backend feature tests cover daily objectives/order/replay/reset/streak/caps/pending rewards plus dungeon, fishing, secret and account integration.
- `scripts/check-world-daily-concurrency.php` in Laravel creates/drops its own random local MySQL database: competing read/legacy claim requests, five payments, one bonus, campaign ceiling and immutable journal.
- Run `postman simulation run postman/simulations/daily.sim.yaml --port 4521 --output ndjson`, then `node scripts/check-mission-hud-browser.mjs`. Provenance/limits are in `postman/mocks/world-daily/README.md`.
- Browser suite exercises the production daily client/store/HUD against that simulation at 667×320, 740×360, 932×430 and 1280×720. It covers acceptance/actions/rewards without menu, retries, priority collision, stale targets, secret discovery, dots/reload, dungeon travel/exit, optional mission controls, Obby details and fishing states/settings/inventory. Adjacent activity transports are local fixtures; daily is actual HTTP through Postman.
- `check-daily-browser.mjs` covers actual Three/Rapier interior headroom, aisle and objective pulse/reduced motion. `check-fishing-browser.mjs` covers actual Player/Rapier movement, fishing input, failed response retry, 3D catch, persistent inventory and late response cancellation.
- Run TypeScript, ESLint and production build. Simulations do not certify production credentials, realtime channel handoff, physical devices or production rollout.

## Rollout: backend before frontend

1. Deploy backend settlement code first. No new migration; confirm existing daily tables, pool/registry, campaign allocation/budget and feature flag. Keep production debug disabled.
2. Smoke-test auto-settlement, repeat/legacy claim compatibility, pending current-day sync and midnight expiry. Verify ledger/wallet/profile totals.
3. Deploy frontend with shared HUD and no claim controls only after backend settlement is verified. A frontend-first rollout against an old backend would leave rewards waiting for claim.
4. Test authenticated Koko → objectives → payment, reconnect and WIB reset; confirm old clients can still claim idempotently. Observe ledger and campaign totals. Retain history on rollback; frontend can roll back while the compatible backend remains.

Local implementation only: no production deployment, migration, commit or push.

## Percakapan daily dan menu ringkas (22 Oktober)

TALK membuka dialog naskah: sapaan NPC → jawaban pemain → balasan NPC → pamit. Hanya pamit yang mengirim `interact`; menutup/Escape lebih awal tidak memberi progres. Sebelum selesai, client memeriksa set, instance, tahap, target dan jarak lagi; server tetap memvalidasi otoritas seperti sebelumnya. NPC memakai animasi Talk dan menghadap pemain. Error dapat dicoba ulang dengan request ID yang sama.

Header Daily ringkas; pengantar Koko hanya muncul bila masih ada misi AVAILABLE, dan pengantar/hasil ikut menggulir bersama daftar. Quest memakai shell putih/biru yang sama dengan desain jurnal sebelumnya, tanpa pembungkus gelap atau tracker ganda; tab aktivitas dan filter tetap 44 px.

Perubahan posisi memerlukan dua migrasi **data** backend (tanpa skema baru): `2026_10_22_120000_move_daily_resident_off_parked_pickup` dan `2026_10_22_130000_realign_cashier_mission_target`. Keduanya hanya memperbaiki koordinat bawaan; edit pemilik dipertahankan. Kasir memakai L terbalik: 3 melintang di belakang, 1 di sisi kanan belakang, 2 di sisi kanan depan. Target scan utama berada di ruang pelanggan `[5.4,0,-1]`. Rilis backend/migrasi terlebih dahulu, baru frontend. Lihat `docs/truck-mission.md` untuk misi pengiriman manual.
