# Toko Cung world implementation

The existing React Three Fiber / Drei / Rapier scene, TanStack routes, local GLB loader,
Zustand appearance draft, shopping interactions, and HUD remain in place. No dependency
was added. This workspace has no `.git` directory; no commits or history operations were performed.

## Scene components and changed files

- `src/game/world/ChibiAvatar.tsx`: shared 1.7 m player, NPC, and remote-player rig;
  rounded anatomy, facial features, five hairstyles, role clothing, glasses/headset/scarf,
  breathing, blinking, damped walking. Root scale and live appearance draft stay canonical.
- `src/identity/avatar.ts`: backward-compatible optional pants/shoe colors; unsigned seed
  indexing prevents remote-avatar crashes. Existing role permissions are unchanged.
- `src/game/world/RetailShelf.tsx`: reusable RetailShelf, ShelfRow, ProductDisplay;
  grouped facings, packaging bands, bottle caps, instanced price labels, shelf-end signage.
- `src/game/world/RetailFixtures.tsx`: CashierCounter, Refrigerator, shared Box helper;
  POS, scanner, receipt printer, shopping bag, impulse tray, glazed chilled displays.
- `src/game/world/StoreBuilding.tsx`: Storefront, CeilingDetails, RetailDetails;
  transparent windows, open entrance/staff doors, ceiling grid, ventilation, CCTV,
  extinguisher, poster and clock.
- `src/game/world/StoreInterior.tsx`: interior composition, short browsing bays, promo island,
  basket stack, cigarette rack, ceiling lights and wall trims.
- `src/game/world/CategorySign.tsx`: reusable suspended two-sided signs.
- `src/game/world/CameraFade.tsx`: proximity fade for overhead signage.
- `src/game/world/SkyEnvironment.tsx`: vertex-colored sky and slowly drifting outdoor clouds.
- `src/game/world/Fixture.tsx`: suspense/error fallback around the existing normalized GLB loader.
- `src/game/world/TokoCung.tsx`, `Shelf.tsx`, `StoreProps.tsx`, `layout.ts`: integrate the new
  fixtures, correct shelf orientations/footprints, add two short browsing bays, reduce tile contrast.
- `src/game/world/NpcLabel.tsx`: camera-facing labels above faces, actual distance opacity fade.
- `src/game/player/Player.tsx`: near-plane sphere sweep through Rapier, immediate collision
  correction after camera smoothing, ceiling clearance, shortest-angle player turning.
- `src/game/engine/GameCanvas.tsx`: balanced daytime lighting and focused desktop shadows.
- `src/game/npc/Npc.tsx`: grounded idle, smooth turns, cashier facing customers.
- `src/game/simulation/NakamaOps.tsx`: fix an existing undefined `setClip` call on delivery return.
- `tests/avatar.test.mjs`: deterministic remote avatar and old-profile compatibility checks.

## Layout and scale

Units are meters: avatar approximately 1.7; shelving 1.7; chiller 2.1; checkout surface
1.065; ceiling 3.2. The existing entrance, cashier, shelf IDs, warehouse passage, and
operational worker paths are retained. Shelves now run along the browsing aisles instead
of across them. Two shorter bays at x ±2.2, z -8.1 fill the rear floor without blocking
the shopper lanes at x ±3.4 or warehouse route through x 6.2. Local shelf colliders match
their visible footprints. Decorative bays do not introduce new catalog categories or shopping IDs.

## Performance choices

Products, packaging bands, bottle caps and price labels are instanced per fixture.
Avatar sphere/capsule geometry is shared. The camera queries physics broadphase geometry,
not thousands of product triangles. Small overhead signs fade rather than push the camera.
No bloom, AO postprocessing, transmission, external HDR, or cloud shader was introduced.
The mobile tier keeps DPR 1, disables real-time shadows and reduces existing neighborhood
detail/NPC count. Desktop retains adaptive DPR up to 1.5 and a single 2048 shadow map focused
on the store. Floor textures are disposed when unmounted.

The inherited neighborhood and articulated avatars still contribute significant draw calls;
real mid-range phone profiling remains necessary before claiming sustained 30 FPS / desktop 60 FPS.

## GLB replacement contract

Existing assets and credits remain in `src/assets/game-assets.ts` and `public/models`.
`RetailShelf`, `CashierCounter`, and `Refrigerator` accept an optional `assetUrl`; leaving
it unset uses the procedural version. Failed/loading assets retain a procedural fallback.
Continue mapping URLs centrally in `game-assets.ts`, then pass the URL into the fixture.
Fixture physics and gameplay must stay outside the visual replacement.

Export in meters, Y up, pivot centered at the floor. Shelf/chiller length runs along Z;
their customer-facing side is +X. Shelf footprint: about 0.95 × 3.6 m; chiller 0.95 × 3.6 m;
checkout 3.45 × 1.12 m. Height normalization does not correct an incorrect aspect ratio.

Recommended later assets (all current new fixtures are procedural placeholders):

1. Original modular humanoid with garment/hair parts and idle/walk clips. Integrate through
   the existing `Character.tsx` animation loader, preserving appearance draft and ownership checks.
2. Retail shelf, end cap and chiller with the documented footprints.
3. Branded noodle packets, snack pouches, beverage bottles and cigarette packs. Replace the
   geometry/material supplied to ProductDisplay instances; avoid a loader per product facing.
4. Checkout/POS assembly, basket stack, hand trolley and store-specific signage/props.
5. Modular storefront and neighborhood assets after measuring the remaining draw-call cost.

## Verification

Run `npx tsc --noEmit`, `npm run build`, and
`node --experimental-strip-types --test tests/avatar.test.mjs` (Node 22+).
Changed TypeScript files were checked with ESLint; StoreProps retains the existing mixed
component/helper fast-refresh warning.

Browser verification uses headless Chrome at 1440×1000 and touch emulation at 390×844.
The authentication route is intercepted in the local browser test only; production auth
code is untouched. Check entry, movement, F shelf interaction, shopping overlay, each HUD
tab, touch camera turning, and joystick hiding/restoration when a sheet opens/closes.
These checks do not validate authenticated payment, inventory writes, or physical-phone FPS.
