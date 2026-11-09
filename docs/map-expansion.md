# East-town expansion

The existing shop, three-floor interior, NPCs, dungeon entrances, beach and fishing pond keep their coordinates. The old 64 m island/coast already supported swimming out to ±180 m; this change adds dry land east of it and expands the outer play wall to ±220 m.

## Places and controls

- Pasar Cung: three neighbourhood shops at x=88/104/120, z=-6. Map entrance `(104, 0, 7)`.
- Alun-alun: public square and covered stage, map/lobby target `(104, 0, 40)`.
- Taman Kota: lake centred `(106, 88)`, trees and benches; map entrance `(106, 0, 106)`.
- Jalan Lingkar connects Jalan Utama at x=72 and x=136, with four outer corners. Walk/run/swim controls are unchanged. Select a new place from the map for a waypoint.

## Layout and streaming

`expansion-plan.ts` owns district bounds, lake and destinations. `outdoor-layout.ts` remains the shared road, lot, junction and traffic authority. Original spawn clearance remains `(0,12)` with a 3×3 m exclusion. New sidewalks extend recovery candidates; existing NPC spawn coordinates are unchanged.

Coarse ground, lake and batched road surfaces stay visible. Full buildings, stage, trees, benches and district road/ground/prop colliders mount within 45 m of the district rectangle and unload beyond 60 m. Checks run at 5 Hz with hysteresis; no per-frame React updates. The original ocean bed remains beneath the world. Raycasts prove unloaded district roads have no surface collider and restore them before arrival.

A closed 395.7 m left-hand traffic lane uses four existing ambient vehicles, keeping 32 ambient vehicles and their stable sync IDs. Its straight seam wraps continuously. Existing traffic-host sync, pose schema, delivery route and fleet size are retained. Clients must use the same map release because lane 3 is new.

## World Editor / backend rollout

1. Release the backend command first. No new migration or economy change is required for this part.
2. In the intended environment, run `php artisan world:seed-expansion`. This creates only missing `venue-market`, `venue-square`, `venue-park` targets through WorldTargets validation, revision and audit. Repeat runs preserve admin edits and every older target. This command has **not** been run on production.
3. Publish the frontend after the backend. Reconnect rooms so all clients share the same four-lane roster. Editors can select the new POIs for quests; coordinates are not embedded in quest definitions.
4. Rollback frontend before backend if needed; leaving unused additive targets is safe. Do not remove a target referenced by an active quest.

## Verification and performance

`node scripts/check-road-network.mjs`: zero lot errors; connected graph, junction coverage, spawn clearance, vehicle swept footprint and heading continuity including the ring. Backend World suite: 133 tests / 1,119 assertions, SQLite in memory with a disposable test app key. TypeScript and Vite build pass.

`QA_PHASE=before node scripts/check-map-expansion-browser.mjs` captured the original scene before implementation. The same script without QA_PHASE checks enter/exit streaming, collider counts and road/ground raycasts. Evidence is in `docs/qa/map-expansion/`.

| View, 844×390 touch DPR 1 | Before FPS / draw calls | After FPS / draw calls |
| --- | --- | --- |
| Shop | 60 / 566 | 60 / 567 |
| Market | 60 / 572 | 60 / 585 |
| Park | 60 / 573 | 60 / 589 |
| Return to shop | 60 / 566 | 60 / 567 |

Measured in local Chrome headless with SwiftShader, on the same static scene fixture (actual shop/neighbourhood/swimming components). p95 frame time ~17.3–17.6 ms. Collider count 112 → 144 near districts → 112 after leaving. These are repeatable desktop measurements, **not physical mid-range phone FPS**, full multiplayer load, thermal or live-production validation. Real-device landscape playtesting remains required before claiming the mobile target is met.

No new reward path or client-awarded Point. Position authority remains the existing client movement model; this part adds no economic trust in map coordinates.

Additional checks: traffic fleet, World Map destination/projection callbacks, original coastal lot/NPC dryness, and browser walk from plaza to beach pass. The broader pre-existing `check-world-plan.mjs` stops at its stale NPC-count assertion (expected 14, existing population 15); this change does not modify the NPC population.
