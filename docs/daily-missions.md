# Daily Missions and Koko Cung

Implementation spans Explorers and the adjacent `toko-cung` Laravel application. It extends the existing `DailyMissionPanel.tsx` and `daily-missions` HUD sheet from the current repository. There is no second daily mission panel. The separate Login Harian placeholder is unchanged.

## Gameplay and authority

- One persistent set of five distinct definitions per account and Asia/Jakarta date, generated lazily. Weighted selection reduces recently completed quests and avoids an identical previous set when alternatives exist. Accepted requirements and rewards are snapshots.
- The seeded pool has more than 20 templates: routes, distinct conversations, cashier/kiosk/clue actions, ordered parcel and supplier deliveries, validated walking, and dungeon entry/objectives. Dungeon selection requires level 3 and existing campaign, story, discovery and access checks.
- Koko Cung is a canonical `world_targets` NPC with `QUEST_GIVER` metadata. Interacting opens a scripted dialogue (`QuestGiverDialogueOverlay`): talk → **Terima misi** / **Nanti**, then optional **Lihat misi** for the existing Daily Mission panel. Opening, accepting all five, and claiming require a fresh nearby server pose. Viewing and tracking (phone panel) work anywhere; accept/claim still need proximity.
- Only actions after acceptance count. Laravel validates interaction targets, ordered deliveries and proximity. Existing accepted pose samples drive visits and distance, rejecting large jumps, stale gaps and dungeon movement. Dungeon progress comes from the server's entry/completed-objective handling, never a multiplayer host completion message.
- Instances follow AVAILABLE → ACTIVE → COMPLETED → CLAIMABLE → CLAIMED. COMPLETED is recorded in server processing and telemetry before becoming claimable. Ineligible definitions are excluded. All unclaimed instances, including claimable ones, expire at midnight WIB on the next operation.
- Finishing the fifth objective records completion and the streak. A missed completion day breaks the streak. Claiming the fifth reward grants the fixed 150 bonus XP exactly once.
- Each template defaults to 20 CP plus its configured XP. CP payout is the minimum of the requested reward, remaining shared daily 10,000 CP limit, remaining campaign allocation and remaining total campaign budget. Inactive campaigns pay zero CP; XP remains full. UI receipts display actual payout.

## Services and storage

`WorldDailyCatalog` handles seeds/eligibility; `WorldDailyQuests` handles commands, generation, progress, claims and snapshots; `WorldDailyDebug` provides isolated development simulations. `WorldTargets` protects currently referenced targets and the five-quest new-player minimum.

The additive migration creates pools, definitions, player/date sets, instances, player streak records, deduplicated action/analytics events, request receipts and an immutable daily reward journal. The existing story ledger has a story-progress foreign key, so daily journal entries use their own instance foreign key while sharing the existing wallet and campaign budget. Reward history combines both journals. Disable the feature without dropping these records; migration rollback intentionally requires an archival procedure.

Authenticated `POST /api/world/daily-quests` accepts `action` (`read`, `open`, `accept`, `interact`, `claim`) and a UUID `requestId`, with NPC/instance/target/objective fields as applicable. BFF operations are `daily-quests` and `daily-debug`. Reusing a request ID with a different payload is rejected. Repeated successful claims cannot pay twice. Snapshots include server time, next reset, revision, progress, receipts, streak, wallet and progression.

Transactions acquire the account lock first, consistent with story/dungeon services, and serialize wallet/campaign expenditure. Unique instance reward keys and immutable journal triggers provide a second exactly-once boundary. Analytics persist opened, accepted, progress, completed, claimed, all-completed and streak events with deduplication keys.

The daily Zustand store is separate from HUD sheet/feed state. Runtime refreshes on focus, reconnect, visibility, polling and server-anchored reset. Account epochs discard old-account responses. Rewards are applied only from authoritative responses. Guidance priority is dungeon, explicitly tracked daily, then story. NPC markers use `?`, `!`, `✓`, otherwise none; the introduction is remembered server-side.

## Development tools

Quest Giver Debug appears only in a development frontend for authorized editors. Its backend additionally requires a local/testing environment and `WORLD_DAILY_DEBUG=true`. Inspect the real set/pool/receipts; regenerate, complete, reset progress or simulate tomorrow in isolated cache state with zero payouts. Reset preserves the simulated instances. Pool assignment uses the existing validated registry save operation. Simulations never change real player progress or wallets.

## Verification (2026-10-14)

- TypeScript, production Vite/Nitro build, daily model checks, quest action checks and quest guidance checks pass. Selected ESLint checks have no errors (the shared GamePanel retains its existing Fast Refresh export warning).
- Laravel: 53 tests pass across WorldDailyQuests, WorldTargets, WorldDungeon, WorldSecretQuest, WorldContent and WorldIntegration. Coverage includes stale/forged actions, distinct NPCs, ordered deliveries, movement rejection, midnight expiration, missed-day streak, pinned definitions, independent story progress, dungeon access and completed-objective dispatch.
- Real local MySQL: ten concurrent claims against five instances produce five receipts and one bonus; campaign ceilings and immutable journal are verified. The harness creates and drops its own random test database.
- `node scripts/check-daily-browser.mjs`: Chromium landscape checks pass at 667×375, 844×390, 932×430 and 1280×720, covering the existing panel, NPC acceptance, tracking, 44px controls, bounded scrolling, lost-response retry and bonus receipt. Mock transport; not physical-device certification.
- Remaining general-suite findings: `check-game-ui-browser.mjs` currently times out waiting for chat dismissal after an outside click, before the full suite completes. `WorldDungeonV2Test` has an independently reproduced baseline expectation mismatch (expected wallet 0, actual 1950). Neither is reported as passing.

## Rollout

1. Deploy backend code and additive migration `2026_10_14_120000_create_world_daily_quests.php` with `WORLD_DAILY_ENABLED=false`. Existing target/dungeon migrations must already be present.
2. Validate the published target registry with `WorldDailyQuests::validateTargets`, verify at least five level-1 eligible definitions in `daily_toko_cung`, and confirm the configured pool campaign (`owner-v1` by default), allocation and budget. Check the seeded Koko entrance location against the deployed world.
3. Deploy the frontend; enable `WORLD_DAILY_ENABLED=true` on Laravel and rebuild its configuration cache through the normal deployment workflow. Production keeps `WORLD_DAILY_DEBUG=false`. The frontend follows the backend enabled response.
4. Smoke-test real authenticated acceptance, progress, claim/retry, receipt history and WIB rollover. Monitor persisted analytics and journal totals. To disable, turn off the feature flag and retain all ledger/history rows.

No production migration, deployment, commit or push was performed as part of this local implementation. Random events, collectible rewards and retention dashboards remain deferred.
