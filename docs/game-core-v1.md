# Game Core V1

> Historical V1 implementation notes. The active account, profile, quest and wallet authority has moved to Laravel. Follow [Shared account integration](shared-account-integration.md) for current setup, financial ownership and migration/cutover. Supabase SQL and local dev scripts below are retained for legacy audit/testing, not the active game API.

World is a game. Product browsing, cart, checkout, payment, orders, and commerce reward redemption belong to the existing Toko Cung App.

## Ownership and compatibility

- `src/routes/index.tsx`: game landing page, four pillars, quest previews, future principal district, XP/Point rules, App bridge. No debug API or fabricated live player/business statistics.
- `src/game/core`: private authenticated API, snapshot store, runtime, generic objective markers, shared types.
- `src/ui/quests/QuestBoard.tsx`: kiosk replacement, acceptance/cancellation, history and personal ledger.
- `src/ui/hud/QuestTracker.tsx`, `GameProgress.tsx`: one tracked quest, XP, level, title and wallet. Expanded daily allowance and completion count also appear in the existing profile panel.
- Existing profiles, avatars, identity roles, ownership checks and the shared appearance draft are untouched. Progression has its own rows keyed by the same `auth.users.id`.
- Existing map, three floors, NPC simulation, vehicles, time, sky, audio, mobile navigation and multiplayer synchronization remain in place.
- Existing peer-host reactive missions remain optional contribution activities. They do not mint Point. Game Core's reactive sample quests reuse the event types and cashier/parcel/packing locations, but own their server-side progress independently.
- Wallets, history, ledger, and private progression are never placed in multiplayer broadcasts or presence. Other clients receive no financial state.

## Database and deployment

Apply `supabase/migrations/20261010120000_game_core_v1.sql` after the existing profile migrations using the normal deployment process. This is an additive transactional migration; it does not alter profile data. Existing authenticated users initialize lazily with level 1, 0 XP and 0 Point. The treasury seed is accounting configuration, not a transfer of money.

Tables:

| Table | Purpose |
| --- | --- |
| `game_levels` | Configurable XP thresholds and level titles |
| `player_game_profile` | XP, level, title, completed count, lifetime Points, area unlocks |
| `point_wallet` | Current balance, WIB day, earned today, lifetime earned |
| `point_ledger` | Append-only reward entries, completion ID, resulting balance |
| `game_campaigns` | Private principal/campaign treasury, budget, allocation, distribution, redemption and remaining |
| `game_quests` | Definitions, prerequisites, repeat policy, event/window restrictions, objective/reward configuration |
| `player_quest_progress` | Persistent run IDs, objectives, revision, status, timing, awarded amounts, history |
| `game_action_receipts` | Idempotency and per-player mutation rate accounting |
| `game_player_presence` | Private server-timed pose telemetry for proximity/speed checks |

Initial curve: 0 / 500 / 1,200 / 2,100 / 3,200 XP, levels 1–5. Titles: Pendatang, Warga Cung, Nakama, Penjelajah, Juragan. Additional levels belong in `game_levels`, not UI components. Level 5 currently displays MAX while XP can keep increasing.

The server requires the existing `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY`. Regenerate generated Supabase types after deployment; the new RPC currently has an explicit versioned contract at its call site.

Set `VITE_TOKO_CUNG_APP_URL` to the official HTTPS universal link when supplied. Without it the bridge is explanatory copy, not a guessed destination. The previous shopping UI modules and integrations remain in the repository, but GameUi does not mount them; shelf/cashier/legacy UI calls cannot open checkout.

`REACTIVE_WORLD_URL` and `REACTIVE_WORLD_TOKEN` authorize reactive rewards through the trusted server feed. It must return a fresh validated snapshot (existing Reactive World format). Without this source, Intro, Easter Egg and Supplier Run remain usable; financial Store/Warehouse offers fail closed. Browser demo events still animate the world and existing contribution missions but do not authorize Point.

## Reward transaction

`gameCommand` validates input and authenticated identity; the player cannot submit an account ID, reward amount, trusted event list or clock. A server-only Supabase RPC performs all state changes atomically:

1. Lock the player, initialize state, reset the daily counter by `Asia/Jakarta` calendar day, expire runs.
2. Check the action receipt, request rate, run ownership and revision.
3. Validate objective order, required counts, nearby recent pose, action cadence and minimum completion duration.
4. On completion, lock wallet and campaign; truncate Point to the daily remaining allowance and available allocated treasury.
5. Append a uniquely keyed ledger row, update wallet and campaign, add XP, derive level/title, persist completion and actual reward.
6. Return only the caller's authoritative snapshot.

Maximum 10,000 earned Point per user per calendar day WIB. 1 Point = Rp1. Partial rewards are discarded, not deferred. Cap/treasury exhaustion does not stop XP or quest completion. XP has no monetary value and is never spent. A completed run returns its existing result on replay; a new ONCE/DAILY run is rejected according to policy. A unique active-run index limits tracking to one primary quest.

All game tables enable RLS and revoke browser-role access. Only the authenticated server gateway can execute the command RPC; helper RPCs are not browser-callable. Ledger updates/deletes are rejected by a trigger. Normal players cannot query campaign budgets. Service-role access is privileged administration and must stay server-only.

## Quest configuration

Categories: WORLD, DAILY, SUPPLIER, PRINCIPAL, DUNGEON, EASTER_EGG, REACTIVE.

Objective primitives: TALK, VISIT, INTERACT, FIND, COLLECT, DELIVER, SCAN, EXPLORE. Each has a target ID, label, position, radius and required count. The generic engine evaluates the selected objective, never arbitrary client counters. Ordered quests enforce previous objectives; collection/delivery chains encode possession through ordered steps. V1 objective actions are explicit tracker interactions at the target, including visit and talk; they do not require combat.

Prerequisites support minimum level, completed quest and unlocked area. Repeat policies are ONCE, DAILY (completion's WIB day), REPEATABLE and CAMPAIGN_LIMITED. Availability is derived; accepted/active/completed/cancelled/expired/failed are modeled. Accepted runs expire in 30 minutes. No V1 sample actively produces FAILED yet.

| Sample | Objectives | Reward | Policy |
| --- | --- | --- | --- |
| Intro | Entrance, Nakama, warehouse, board | 100 XP / 0 P | Once |
| Store Rush | Scan 5 items at cashier, verified event required | 150 XP / up to 250 P | Daily |
| Warehouse | 3 ordered pickup/delivery pairs, verified event required | 200 XP / up to 350 P | Daily |
| Easter Egg | 3 separated outdoor clues after Intro | 250 XP / up to 500 P | Once |
| Supplier Run prototype | Visit temporary supplier, collect crate, deliver to warehouse after Intro | 300 XP / up to 750 P | Daily |

## Development and verification

`scripts/check-game-core.mjs` executes the migration and behavior against PostgreSQL via PGlite. Install PGlite in a disposable tools directory or supply `GAME_CORE_PGLITE=/absolute/path/to/@electric-sql/pglite/dist/index.js`. It is a test dependency, not shipped in the app.

`scripts/game-core-dev.mjs` is a local-only CLI with a persistent PGlite database in the OS temporary directory. It does not read Supabase credentials or call production APIs. Supported commands: `inspect`, `grant-xp N`, `set-xp N`, `grant-point N`, `reset-daily`, `force-available QUEST`, `accept QUEST`, `complete-objective INDEX`, `force-complete`. Test Point grants still go through the ledger/cap/treasury reward path. No debug grant endpoint exists in the production bundle.

The migration test covers XP/level up, ledger writes, 9,500 + 1,000 → 500 Point, XP at cap, duplicate completion/action, one-time/repeat policy, next WIB day, partial treasury exhaustion, proximity/order/speed/revision checks, private accounts, denied client RPC/table writes, and immutable ledger.

## Principal Dungeon and remaining boundaries

Quest/campaign definitions already carry principal ID, campaign ID, building ID, instance ID, theme and quest-chain metadata. Future dungeon work must implement instance entry/exit and return transforms, interior loading, instance-specific evidence, quest-chain orchestration, collectible ownership grants, additional objectives (sequence/puzzle/escort), and sponsored-content administration. V1 has no dungeon instance runtime or combat.

App account linking and redemption need an agreed backend contract. This release creates no withdrawal, debit, checkout or redemption flow. Authenticated World IDs are preserved for that mapping; no anonymous wallets are created.

Anti-abuse is basic validation, not authoritative physics: pose telemetry is still supplied by the client. Server timing, speed, proximity, order, rate limits and unique reward IDs raise the cost of abuse but cannot prove actual movement against a modified client. Durations and fast-completion signals are retained without automatic bans. Stronger action attestation is needed before broader monetary campaigns. Operation receipt retention and financial audit/admin tooling remain future operational work.

## Validation performed for this implementation

TypeScript, changed-file ESLint, production build, and `git diff --check` passed. PostgreSQL/PGlite tests also apply the preceding profile migrations and verify an existing profile is unchanged. Existing reactive mission, reactive world, state protocol, SceneTime, world-plan, and road-network checks passed.

Chrome QA passed for the actual homepage at 1440×1000 and 390×844. A separate disposable World fixture ran the real scene/UI and the actual SQL engine, with local auth/realtime transport: two-player presence, private quest progress, objective submission, refresh persistence, cancellation, reactive mission coexistence, and mobile board/tracker bounds passed. It is not a live Supabase end-to-end deployment test.

At implementation time this checkout has publishable Supabase configuration but no service-role key or database migration connection. The hosted migration has therefore not been applied and live reward activation has not been verified. Apply the migration, configure the server-only key and trusted reactive feed, then smoke-test with a real authenticated account before announcing live rewards.
