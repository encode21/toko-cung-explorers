# Principal Dungeon V2

V2 extends the existing `WorldGame` Quest Engine, `WorldDungeon` lifecycle, campaign accounting, room leases, and modular HUD. It does not replace the World, player root, identity, multiplayer transport, or wallet.

## Content and exploration

The Principal lot now opens a Mission Board. Its warehouse instance has ground-floor reception, sorting/loading bay, tall storage aisles, a hidden B-07 room, a walkable ramp beneath visible stairs, a mezzanine office/archive, and a catwalk. Opaque partitions and the upper floor separate sightlines. Warehouse fittings, floor paint, shelving, windows, desks, and loading shutters distinguish the zones. Future content can reuse this building.

| Mission | Kind | Level / chapter | Repeat | Base XP |
| --- | --- | --- | --- | --- |
| Kiriman yang Hilang | Main | 3 / 1 | Once | 650 |
| Label yang Tertukar | Side | 3 / 1 | Once | 300 |
| Bawa Promo Pack | Delivery | 4 / 1 | Daily | 450 |
| Ruang B-07 | Exploration | 5 / 1 | Once | 550 |
| Pemeriksaan Distribusi | Daily | 6 / 2 | Daily | 650 |
| Arsip Sang Perintis | Secret | 5 / 1 | Once, discovery required | 700 |
| Jejak Jaringan Utama | Main | 10 / 3 | Daily | 900 |

Chapter 1 spans Lv.3–5, chapter 2 Lv.6–9, chapter 3 Lv.10+. Existing level thresholds 1–5 are unchanged; thresholds extend through level 12. Locked missions stay visible with their required level. Secret missions are filtered by the server until discovery; guessing a secret quest ID cannot read or accept it. The optional founder seal has no exact marker and adds 100 XP only when that run is completed. All new quests are initially XP-only; legacy Point rewards/history/budgets remain intact.

Main chain: coordinator → upstairs manifest → read archive note → Storage B → batch label → crate → loading dispatch → World supplier post → Toko Cung warehouse → Principal report. The next objective and its textual clue become visible progressively. `INTERACT` supports reading documents without adding a special-purpose engine opcode. `dependsOn`, `realm`, `hint`, and `hidden` are objective data, not quest-ID branches.

## Lifecycle and authority

- `resources/world/principal-quests-v2.json` owns quest definitions; `dungeon-v2.json` owns presentation, chapter/quest catalog, spawn, bounds, exit and optional discovery.
- `enter` accepts a catalog quest ID. Level, discovery, repeat, campaign, active-run and reward checks still go through WorldGame.
- A run has a pinned definition/config. Legacy V1 runs retain their V1 scene and can finish after migration; the V1 quest is retired from new boards, not disabled.
- `travel` is distinct from abandon (`exit`). Only a next objective in another realm unlocks travel, and the player must be near the correct portal with fresh server presence and an owned active room lease.
- `world_dungeon_members.realm/current_room` preserve the same instance, quest run, shared progress and carried parcel across World legs. Resume uses the member's current realm. World visitors cannot authorize the private room while their member realm is World.
- Party members may be in different realms. Objective interaction verifies the actor's realm; shared progress and individual completion rewards retain V1 behavior. The final report can be made by a teammate already inside Principal.
- One-hour run timeout, two-minute absent-party grace, safe return/fallback, cancellation, idempotent completion and the existing sweeper remain in place.
- This preserves the existing sampled speed/bounds/proximity trust model; it does not add server-side physics simulation. Existing realtime-token expiry semantics are unchanged.

## Rankings and achievements

`PrincipalLeaderboard` projects immutable server-written events, never Point balance. All categories return top 10 and the requesting player's rank even outside top 10:

- `WEEKLY_XP`: awarded Principal completion XP, weekly only.
- `QUESTS_COMPLETED`: completed Principal quest runs.
- `DUNGEON_CLEARS`: completed private instances per member. With the initial one-quest-per-instance model this can equal quests completed.
- `EASTER_EGGS`: distinct discovery keys per player within the period; repeated discovery of the same seal does not inflate this category.
- `FASTEST_CLEAR`: minimum completion duration for **the same quest and V2 version**. The initial UI compares Kiriman yang Hilang, including its World journey.

The other four categories support weekly and all-time views. Weeks are Monday 00:00 through the following Monday 00:00 Asia/Jakarta; old events are retained, so reset requires no destructive job. Ties share competition rank, with stable player-ID ordering and at most ten displayed/awarded rows.

The scheduler runs `world:principal-leaderboard-settle` Monday 00:05 WIB. It idempotently awards a permanent profile badge per top-ten entry/category/closed week using a unique DB key. No wallet/Point mutation occurs. Achievements appear on the player's profile and hub leaderboard. Operators can recover a missed settlement with:

```sh
php artisan world:principal-leaderboard-settle --week=2026-10-05
```

Only closed weeks may be settled. Keep the normal Laravel scheduler active.

## Rollout

New migration: `2026_10_11_100000_upgrade_principal_dungeon_v2.php` in **toko-cung**, after the V1 account/game, event-controls and Principal migrations. It adds realm state, discovery and achievement tables, registers V2 quests, and updates the existing campaign's config without resetting its budget or history. No new Supabase migration is required.

1. Deploy the compatible Laravel V2 code while the campaign still serves V1 config.
2. Deploy the frontend that supports both scene versions; refresh old browser clients before activating V2 content.
3. Run the new Laravel migration on the intended environment and verify the scheduler.
4. Verify actual Supabase realm handoffs and physical-phone performance in staging, then production.

No connected database migration or deployment was performed during implementation. Down migration intentionally refuses to erase progression/achievement history. To disable new entry operationally, use the existing campaign maintenance controls; do not delete completion ledgers.

For local QA, the existing guarded `world:dungeon-dev` command supports `--level=3` (or higher chapter levels) and `--quest=principal-labels-v2`. Its objective/complete helpers use pinned definitions and travel through the normal realm coordinator. Only use it with an isolated local/testing database.

## Verification

- Laravel: WorldDungeonTest + WorldDungeonV2Test + WorldIntegrationTest + WorldContentTest, 24 tests / 182 assertions. Includes all new mission routes, visible locks, hidden read/accept denial, ordered clues, realm-spoof rejection, reconnect, single reward, weekly/all-time top ten, own rank outside top ten, comparable fastest times, and idempotent non-monetary awards.
- TypeScript, changed-file ESLint, production build: passed.
- Actual React/Three + Laravel with isolated SQLite and a local BroadcastChannel realtime adapter: portrait Mission Board, locked entries, hidden quest omission, all ten main objectives, both realm transfers, completion/leaderboard/return; no browser exceptions.
- Two browser clients shared all ten clues/objectives, separated their realm presence, completed with individual 650 XP rewards, reconnected and returned successfully.
- Real touch events walked the stairs onto the mezzanine without jumping. Dungeon foot contact and camera framing support the upper floor without changing avatar-root scale.
- Screenshots: `docs/qa/principal-dungeon-v2/`. Live Supabase and physical-phone verification remain rollout checks; the local adapter does not prove production realtime connectivity.
