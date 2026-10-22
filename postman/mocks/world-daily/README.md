# Local daily mission boundary

Owned mock derived from `toko-cung/app/Services/World/WorldDailyQuests.php` and the frontend `DailySnapshot` contract, updated 2026-10-22. No third-party behavior is inferred and no account secrets are used.

Start from Explorers:

```sh
postman simulation run postman/simulations/daily.sim.yaml --port 4521 --output ndjson
node scripts/check-mission-hud-browser.mjs
```

The browser executes the production World client, daily store, keyboard/touch action and HUD. Only its server-function transport is replaced by `tests/fixtures/missions/api.ts`; Vite proxies `/mission-api` to the simulation's `/world` route. The simulation serves `POST /api/world/daily-quests`; `/qa/reset`, `/qa/position`, `/qa/fail`, `/qa/event`, `/qa/state` are local scenario controls, never production APIs.

State uses `daily:state`. Fixtures seed five objective types, order/proximity validation, idempotency, a one-shot 503 and auto-pay receipts. The mock deliberately fixes fixture CP/XP and does not claim to simulate ledger locking, campaign limits, authenticated presence or real-time travel. Those belong to Laravel feature tests and the isolated real MySQL concurrency harness. Other activity UI tests use local fixture snapshots and the real activity stores.

Expected observations: no manual claim request, five receipt payments and one bonus, identical ID on retry, no stale remote action, dots clear/persist after reading, no side tracker host. Reset before each viewport case keeps runs isolated. Do not publish this QA mock or its control endpoints to production.
