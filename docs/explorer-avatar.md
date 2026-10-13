# Explorer avatar — first integration

> Historical first-pass record. The current wardrobe, appearance v2, purchase schema and updated measurements are documented in [Wardrobe and shop](wardrobe-shop.md).

Branch: `feat/explorer-kit` in **both** `toko-cung-explorers` and the adjacent `toko-cung` Laravel repository. No dependency additions or database migrations. Ship backend validation before/with the frontend; an older backend rejects `avatar.explorer`.

## Active integration

- `src/game/avatar/BaseAvatarV2.tsx` remains the single avatar entry point. `playerAvatar` selects Explorer for local player, remote players and the existing editor preview. NPCs, explicit model URLs, collectibles and asset-error fallbacks retain the existing renderer.
- `ExplorerAvatar.tsx`: independent rigid hierarchy/mixer, 0.28-second crossfades, locomotion hysteresis, cadence based on measured movement. Original supplied `Idle` and `Walk` are untouched. Running accelerates Walk because the ZIP contains no Run clip.
- `explorer-clips.ts`: explicit mapping of existing gameplay poses and dance clips onto supported pivots. This is a lightweight compatibility adapter, not Mixamo retargeting or a new humanoid skeleton. Carry locomotion retains the original walking legs.
- `explorer-rig.ts`: equipment manifest, sockets, starter geometry, palette isolation and cached merged geometry. +Y up/+Z forward; only the visual wrapper scales by `1.74 / 2.45`. Physics, canonical player root, network positions, camera and gameplay code are unchanged except selecting the renderer.
- `src/identity/explorer.ts` / `avatar.ts`: optional version-1 `avatar.explorer` with allowlisted item IDs and six-digit hex colors. Missing legacy data renders default Explorer without rewriting the saved legacy fields. All new items are free starter cosmetics; no ownership or role grants.
- `CharacterDesigner.tsx`: existing `appearanceDraft` drives both preview and local player. Categories provide seven palettes and four accessory slots; drag-to-rotate preview remains. Save uses the acknowledged profile endpoint; Batal discards the draft; Reset sets the Explorer defaults. Existing collectible customization remains available.
- Laravel `app/Http/Controllers/World/WorldController.php`: nested allowlist, required colors/version and compatibility enforcement. Existing revision, identity, role and collectible checks remain in `WorldGame`. Existing profile revision refresh retrieves the appearance for remote players; peer packets do not assign account privileges.

The supplied GLB is `public/assets/characters/toko-cung-explorer.glb`. Its original construction source and README/license are retained in `docs/explorer-source/`; the demo viewer and bundled Three.js are not installed.

## Registry and attachment mapping

| Slot | Stable IDs | Parent / socket |
| --- | --- | --- |
| Headwear | `explorer-cap`, `baseball-cap`, `none` | `Head / Socket_headwear` |
| Eyewear | `none`, `round-glasses`, `sunglasses` | `Head / Socket_eyewear` |
| Audio | `none`, `headphones` | `Head / Socket_audio` |
| Back | `explorer-pack`, `urban-pack`, `none` | `Body / Socket_back` |

Original cap: **CapCrown, CapBrim, Detail33, Detail34** (including both badge components).
Original backpack: **Backpack, Detail11–Detail19** (flap, pocket, strap, buckle, blanket, both shoulder straps and buckles). Equipment is moved into semantic groups before merging; shared materials never decide what gets hidden.

`Head / Socket_hair` adds scalp/rear-hair coverage. Original `Detail32` fringe is independently grouped and hidden under either cap to prevent crown penetration. Hair color does not recolor the original shoe soles. Each player owns its palette materials. Geometry and template materials remain cached; instance cleanup stops/uncaches the mixer and disposes only instance materials.

Headphones and hats share the crown: selecting headphones removes the hat; selecting a hat removes headphones. Both client normalization and server validation enforce the final compatible state. Every slot selects at most one child; `none` selects zero.

## Add another accessory

1. Add its stable free-starter ID/label to `EXPLORER_ITEMS` and Laravel's matching nested `in:` allowlist. Paid/role items require a separate authoritative ownership design; do not add them to this free registry.
2. In `explorer-rig.ts`, create one item group in the appropriate socket. Author its mesh offsets relative to `Head` or `Body`; do not alter animation targets. Reuse a palette or introduce an explicitly mapped fixed material. Geometry is built once in the cached template.
3. If replacing original equipment, inspect the actual GLB and extend the explicit semantic manifest. Keep every buckle/badge/strap in its item's group. Do not merge across pivots, item boundaries or different palette channels.
4. Add any compatibility rule to the normalizer/equip helper and backend. Extend tests for repeated replacement, no leftover parts, two-player color isolation, all views during Idle/Walk, and backend round-trip validation.
5. Increment the appearance schema version only when incompatible data semantics change, and supply an explicit migration instead of silently reinterpreting old IDs.

## Verification (2026-10-13)

- `npx tsc --noEmit` and targeted ESLint: passed.
- `npm run build`: passed. Existing chunk-size / TanStack deprecation warnings remain.
- `node --experimental-strip-types --test tests/avatar.test.mjs tests/avatar-rig.test.mjs tests/explorer-rig.test.mjs`: 13 tests, covering old rig compatibility, version/color validation, every equipment choice repeatedly, shared-geometry disposal safety, independent materials/hierarchies, animation sockets, in-place movement and pose adaptation.
- `php artisan test --filter=WorldIntegrationTest` (Laravel repo): 12 passed, including Explorer persistence/public profile projection, invalid field rejection, stale revisions, role/collectible authority. Explorer test rerun after version canonicalization passed. Installed PHP dependencies emit deprecation warnings.
- `scripts/check-explorer-browser.mjs`: real GLB rendering in Chrome, two independent avatars, poses, repeated unmount/remount, front/side/back inspections, and editor Apply/Cancel/Reset/reopen at 667×375, 844×390 and 1280×720 passed. Account transport is mocked.
- `scripts/check-game-ui-browser.mjs`: six landscape sizes (667×375 through 1280×720), nested UI, chat, guidance depth/occlusion, zoom/multitouch and orientation regression passed. Transport is mocked.
- Browser scripts use `PLAYWRIGHT_MODULE=/private/tmp/toko-hud-qa/node_modules/playwright/index.mjs` in this environment; alternatively provide an existing Playwright installation. No new application dependency.

### Measured rendering

| Configuration | Visible color-pass draw calls | Triangles |
| --- | ---: | ---: |
| Original supplied model | 66 | 32,942 |
| Integrated default Explorer | 35 | 32,970 |
| No hat / no backpack | 29 | 26,772 |

Default geometry calls fall ~47% by merging siblings of the same pivot, equipment group and palette. No instancing across independently colored players. The isolated one-avatar Chrome fixture at 960×720, DPR 1 measured median frame interval ~16.7 ms, p95 ~17 ms; this is a desktop/headless frame measurement, **not GPU timing or mobile-world performance certification**. Cached GPU geometries reached 45 after exercising multiple options and mounts; they intentionally remain reusable. Shadow passes and the surrounding world add draw calls.

### Screenshots

- Default: [front](explorer-qa/explorer-front.png), [side](explorer-qa/explorer-side.png), [back](explorer-qa/explorer-back.png).
- No hat/backpack: [front](explorer-qa/no-equipment-front.png), [side](explorer-qa/no-equipment-side.png), [back](explorer-qa/no-equipment-back.png).
- Baseball/sunglasses/urban bag: [front](explorer-qa/urban-front.png), [side](explorer-qa/urban-side.png), [back](explorer-qa/urban-back.png).
- [Two player appearances](explorer-qa/explorer-two-players.png), [mobile 667×375](explorer-qa/customizer-667x375.png), [mobile 844×390](explorer-qa/customizer-844x390.png), [desktop](explorer-qa/customizer-1280x720.png).

### Still unverified

No authenticated two-device realtime session or physical phone was used. Backend round-trip validation and mock-client rendering were tested separately, not a deployed end-to-end appearance broadcast. Full-world collision traversal, seated bench/parcel contact, every dance pose's artistic fit, and a crowded 25-player mobile frame budget still need live-world/device QA. The player collider/controller were deliberately left intact; this does not substitute for that gameplay verification. No commit, push or deployment was performed in this task.
