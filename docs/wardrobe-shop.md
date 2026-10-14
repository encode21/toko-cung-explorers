# Explorer wardrobe and point shop

Implemented on `feat/explorer-kit` in the frontend and adjacent Laravel `toko-cung` repository. The current rounded Explorer face, proportions, root transform and original Idle/Walk remain intact. NPCs and collectible characters retain their existing renderer/editor. This is a working server-backed implementation, not browser-storage currency; browser QA uses a clearly isolated mock transport.

## What changed

- The active Profile customizer routes Explorer into **Penampilan / Lemari / Toko**. One large rotatable preview canvas on the left; static item thumbnails, search, category/ownership filters, status and prices on the right. Camera reset, balance and Save stay accessible. Short landscape screens use horizontal compact cards with readable names/status; opaque panels preserve contrast.
- Five real top meshes (tee, hoodie, varsity, overshirt, Explorer jacket), four bottoms and three footwear designs. Sleeves and trousers are segmented under the existing animated Arm/Elbow/Leg/Knee pivots. Original clothing is grouped by inspected node IDs before it is hidden. No shared-material hiding and no skeleton rebuild.
- Four **Set** presets equip combinations, including a separate DJ Neon palette. Sets do not stack a second costume mesh. Removing a set restores the previous draft combination, or defaults when that editor session has no previous combination. Buying a set grants its constituent items too. Bundle prices are fixed example prices, not prorated for partially owned sets; fully owned sets/parts are not charged again.
- Explicit accessory slots: headwear, hair decoration, eyewear, ears/audio, neck and back. Hats/headphones conflict; full crown hats hide hair decorations; headbands can combine with glasses, hair decorations and bags. The item detail explains automatic removals. A separate original-scarf group prevents layering two scarves.
- `avatar.explorer.version = 2`, stable IDs and validated colors. Version-1 appearances migrate in memory to the original jacket, jeans and boots while retaining existing equipment/colors. Starter items from the previous version remain free.

## Preview / purchase / equip / save

1. **Coba** updates the existing shared `appearanceDraft` and local preview/world only. No balance mutation, ownership grant or remote broadcast.
2. **Beli** opens confirmation with item, price, balance before and after. The backend price is authoritative; a changed quote is rejected for reconfirmation.
3. A successful purchase adds ownership and updates the existing World point wallet. It does not implicitly equip or save the item. **Pakai** stages an owned item; **Lepas** restores the base garment or clears the accessory slot.
4. **Simpan** submits only equipped draft items through the existing revision-checked profile endpoint. A trial that has not been equipped is not saved; the footer explains this.
5. **Batal**, closing the editor, or navigating away discards unsaved appearance edits. Completed purchases stay owned. **Reset** changes only the draft appearance; it never removes ownership, receipts or balance.

The existing account-authoritative profile refresh synchronizes saved appearances. No appearance or privilege data is trusted merely because another peer broadcasts it.

## Backend and rollout

New authenticated operations use the existing World gateway: `GET /api/world/cosmetics` and `POST /api/world/cosmetics/buy`. Purchases accept `itemId`, `requestId` and `expectedPrice`; the price is checked against server configuration, not taken as an amount to charge.

`WorldCosmetics` locks the same **users row → wallet row** ordering used by World quest/profile mutations. Wallet deduction, ownership grants and receipt insertion share one database transaction with deadlock retries. Unique account/request and account/item constraints plus receipt replay prevent double charges. A different item using the same request ID returns 409. Insufficient funds cannot make the unsigned balance negative. Profile saves verify ownership again under the account lock.

The old `world_point_ledger` has mandatory quest/campaign foreign keys and is append-only. Therefore purchase debits have an additional append-only `world_cosmetic_purchases` journal, but they deduct **the same `world_point_wallets.current_balance`**, not a second currency. Reward history and earned-today totals remain untouched. Both MySQL and SQLite journal triggers reject updates/deletes.

Before deploying the frontend, apply the new backend migration:

```sh
php artisan migrate --path=database/migrations/2026_10_13_140000_create_world_cosmetic_purchases.php
```

This migration creates `world_cosmetic_ownership` and `world_cosmetic_purchases`. It was tested against isolated SQLite fixtures; no live database migration or deployment was performed. Financial-history rollback requires deliberate archival, matching the existing World ledger convention. Existing unrelated shipping-voucher migration edits were not modified.

## Catalog / prices

All entries below have actual geometry and static PNG thumbnails rendered from that geometry. Prices are initial **example configuration**, editable in `src/identity/wardrobe-catalog.json`, then published to Laravel's `config/world-cosmetics.json`. Runtime UI prices always come from the server. Keep the compatibility starter items free; do not retroactively revoke them by changing their price without an ownership migration.

Use `node scripts/sync-wardrobe-catalog.mjs` to check parity or `--write` to publish frontend catalog changes to the adjacent backend; `WARDROBE_BACKEND_ROOT` overrides its location. Neither command contacts production.

| ID | Category | Item | Points |
| --- | --- | --- | ---: |
| `explorer-jacket` | top | Jaket Explorer | 0 |
| `tshirt` | top | Kaus Cung | 80 |
| `cat-band` | headwear | Bando kucing | 60 |
| `hoodie` | top | Hoodie | 140 |
| `varsity` | top | Varsity jacket | 180 |
| `overshirt` | top | Overshirt | 120 |
| `jeans` | bottom | Jeans | 0 |
| `cargo` | bottom | Cargo | 100 |
| `shorts` | bottom | Celana pendek | 70 |
| `skirt-leggings` | bottom | Rok & legging | 130 |
| `boots` | footwear | Boots | 0 |
| `sneakers` | footwear | Sneakers | 90 |
| `slip-on` | footwear | Slip-on | 60 |
| `explorer-cap` | headwear | Topi Explorer | 0 |
| `baseball-cap` | headwear | Topi baseball | 0 |
| `rabbit-band` | headwear | Bando kelinci | 80 |
| `bear-band` | headwear | Bando beruang | 70 |
| `star-band` | headwear | Bando bintang | 80 |
| `bucket-hat` | headwear | Bucket hat | 90 |
| `beanie` | headwear | Beanie | 75 |
| `mini-crown` | headwear | Mahkota mini | 150 |
| `hair-bow` | hairDecoration | Pita rambut | 60 |
| `star-clip` | hairDecoration | Jepit bintang | 45 |
| `flower-clip` | hairDecoration | Jepit bunga | 50 |
| `round-glasses` | eyewear | Kacamata bulat | 0 |
| `sunglasses` | eyewear | Sunglasses | 0 |
| `heart-glasses` | eyewear | Kacamata hati | 90 |
| `headphones` | audio | Headphone | 0 |
| `earrings` | audio | Anting | 55 |
| `neck-scarf` | neck | Syal pendek | 65 |
| `explorer-pack` | back | Tas Explorer | 0 |
| `urban-pack` | back | Tas urban | 0 |
| `sling-bag` | back | Sling bag | 100 |
| `mini-pack` | back | Backpack mini | 90 |
| `animal-pack` | back | Tas beruang | 140 |
| `small-wings` | back | Sayap kecil | 180 |
| `back-stars` | back | Dekorasi bintang | 150 |
| `set-explorer` | set | Set Explorer | 0 |
| `set-streetwear` | set | Set Streetwear | 270 |
| `set-dj-neon` | set | Set DJ Neon | 300 |
| `set-crew` | set | Set Crew Toko Cung | 220 |

## Files and extension points

- `src/identity/wardrobe-catalog.json`: stable collection manifest, example prices and set recipes.
- `src/identity/{wardrobe,explorer,wardrobe-store}.ts`: slots, compatibility, v1→v2 normalization, account-scoped loading and purchase state.
- `src/game/avatar/wardrobe-meshes.ts`: actual garments and accessory geometry. `explorer-rig.ts` integrates them into the cached template and manages visibility without allocation on selection.
- `src/ui/profile/{CharacterDesigner,ExplorerWardrobe}.tsx`, `src/game/avatar/AvatarPreview.tsx`, `src/ui/game-ui/game-ui.css`: active editor, preview reset and responsive layout.
- `src/services/world/{api.functions,contracts}.ts`: authenticated gateway operations.
- Laravel: `WorldCosmetics.php`, `WorldController.php`, `WorldGame.php`, `routes/world.php`, catalog config, purchase migration and `WorldIntegrationTest.php`.
- QA: `tests/wardrobe.test.mjs`, expanded avatar tests, `scripts/check-wardrobe-{browser,visuals}.mjs`, `scripts/render-wardrobe-thumbnails.mjs`, and isolated HUD fixtures.

To add clothing, register its slot/ID, author each rigid segment in `buildWardrobe` under the existing appropriate pivot, and tag the item groups using `wardrobeSlot` / `wardrobeId`. Group all original details explicitly if replacing another built-in component. Never alter animated pivot transforms or canonical player scale. For an accessory use its `Socket_*` group under Head or Body; each child name is its stable ID. Add compatibility rules and keep backend slot validation in sync. Add the ID to the controller allowlist, publish the catalog, regenerate thumbnails and extend tests. Geometry must be a real finished item before exposing a catalog card.

Thumbnails are generated offline through the **actual renderer**, not separate live canvases per card:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/render-wardrobe-thumbnails.mjs
```

Meshes merge only within an equipment group/palette/pivot, so animation attachment and independent replacement remain safe. The immutable template and geometry are shared; each player owns its hierarchy, mixer and palette materials. Disposing one player never disposes shared geometry. No additional application dependencies were installed.

## Verification and measurements

- TypeScript, targeted ESLint and production build: passed. Existing dependency deprecation/chunk warnings remain.
- 16 Node tests: legacy compatibility, schema migration, all 41 actual item/preset entries, unique IDs, real thumbnail files, five distinct top geometries, repeated equipment replacement, socket/pivot animation, material isolation, shared-resource disposal, compatibility and ownership semantics.
- 14 Laravel integration tests: first tee/cat-band flow, invalid/unowned equip, insufficient balance, stale/manipulated quote, repeated request, different request IDs for an owned item, mismatched retry payload, profile persistence, receipt count, and set component grants. An injected failure after debit verifies full transaction rollback followed by successful retry. Existing quest/role/collectible tests pass.
- Browser flow at **667×375, 740×360, 844×390 and 1280×720**: Coba does not debit; confirmation, double click, simulated lost response/retry, equip, save, page reload, Reset/Cancel, set removal restoring the earlier combination, ownership surviving cancel, and insufficient-funds disabled action passed. Browser account transport uses a mock backend; sessionStorage exists only in these test fixtures to simulate persistence across reload.
- Existing six-size HUD regression: passed, including chat bubbles, guidance depth occlusion, orientation, zoom/multitouch and nested UI.
- Real renderer captured all 14 existing pose states with five wardrobe combinations; original character features and attachments remain present. Images were inspected for obvious issues. This is not exhaustive cloth-contact certification across every possible accessory combination or every frame.

| Measurement | Before wardrobe | After wardrobe |
| --- | ---: | ---: |
| Default avatar color-pass draw calls | 35 | 37 |
| Default avatar triangles | 32,970 | 32,970 |
| Highest sampled single-item substitution | — | 39 calls / 34,054 triangles (heart glasses) |
| Base GLB bytes | 270,652 | 270,652 (unchanged) |
| New procedural geometry source | — | ~13 KB raw TypeScript |
| 41 static thumbnails combined | — | ~1.12 MB, lazy-loaded in grid |

The two additional default calls preserve independently replaceable garment/scarf groups. A desktop/headless Chrome fixture, 1280×720 at DPR 1 with one walking default avatar after exercising outfits, measured median frame interval ~16.7 ms, p95 ~17.1 ms. The renderer retained 121 cached GPU geometries after exercising five outfits/poses; reuse is intentional. Counts exclude world/shadow passes. Single-item maxima are not a bound on every multi-slot combination. These are local fixture measurements, not a 25-player mobile GPU benchmark.

## Screenshots

- [Desktop shop](wardrobe-qa/shop-1280x720.png), [desktop wardrobe](wardrobe-qa/closet-1280x720.png).
- [Mobile shop 740×360](wardrobe-qa/shop-740x360.png), [mobile wardrobe 667×375](wardrobe-qa/closet-667x375.png), [844×390](wardrobe-qa/shop-844x390.png).
- [Five outfits / Idle](wardrobe-qa/pose-Idle.png), [Walk](wardrobe-qa/pose-Walk.png), [Sit](wardrobe-qa/pose-Sit.png), [Carry](wardrobe-qa/pose-CarryBox.png), [rear view](wardrobe-qa/outfits-back.png).

## Remaining verification

No physical phone, live two-account realtime session, MySQL parallel-load test, or live migration/deployment was performed. SQLite transaction tests verify sequential retries/rollback; production lock contention still needs backend-environment testing. Full-world crowded performance and every accessory combination against benches/held props remain live QA tasks. All requested catalog entries are implemented; there are no placeholder/unbuilt items or local-demo currency in production code. No commit or push was made.

### Catalog outage and custom selectors (2026-10-13)
Category and ownership selectors now use the installed Radix Select with game styling, viewport bounds, keyboard navigation and Escape isolation. During initial API failure the bundled catalog remains previewable; balance is unknown (—), paid ownership is not inferred, buying/equipping/saving wait for server synchronization. Retry restores server catalog and balance. Small landscape main content scrolls within its bounds so the retry action cannot fall behind the footer.

Local diagnostics: cosmetics route returns the expected 401 without credentials; targeted migration status is applied (batch 116); read-only service snapshot for nonexistent ID 0 reads 41 catalog entries. This does not verify the user's authenticated session or deployed host. No production data was modified for this diagnosis.

Follow-up verification passed: four landscape browser sizes, initial catalog failure with visible previews, unknown balance, disabled purchase/save, custom dropdown Escape, successful retry restoring server balance and Save; mocked transport. Final TypeScript and production build passed.
