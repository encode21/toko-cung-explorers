# Toko Cung: three-floor commerce world

## Scene layout

The supplied storefront photo informs the gray rectangular frame, two broad red vertical accents, slim center accent, stacked dark window bays, pale canopy, and prominent TOKO CUNG signage. Geometry is deliberately simplified; dimensions are gameplay proportions, not measured survey data. The surrounding street remains compact; the pedestrian bridge in the additional street photo is not reproduced.

Coordinates are meters, Y up, with the storefront facing +Z.

| Area                | Footprint / elevation               | Current behavior                                                                |
| ------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| Floor 1 retail      | X −9…9, Z −13…3, Y 0                | Existing entrance, shelves, promo island, cashier, browsing and customer routes |
| Ground warehouse    | X −9…9, Z −22…−13                   | Existing stock/packing workflows; new 3.2 m rear loading opening                |
| Floor 2             | Same building footprint, base Y 3.4 | Reserved service/community floor with simple desk modules                       |
| Floor 3             | Same building footprint, base Y 6.8 | Reserved stock floor with pallet blocks and packing worktop                     |
| Canopy              | X −9.4…9.4, Z 2.75…6.55             | Covered storefront; columns clear of entrance and parking                       |
| Customer parking    | X −14…−4, Z 4.6…11                  | Existing marked parking; pedestrian approach centered on X 0                    |
| Motor parking       | X 10…15, Z 4.2…7.2                  | Existing small vehicle spaces                                                   |
| Front road          | Z 16.8…23.2                         | Existing traffic, crossings and curb gaps retained                              |
| Loading             | Z −28…−23.5                         | Two marked delivery bays, central pedestrian strip to rear entrance             |
| Rear vehicle access | X 11.5…16.5, Z −30.5…−21.5          | Connects rear road to loading yard                                              |

Floors 2 and 3 are **prepared, closed zones**, not currently navigable floors. A collidable lift core at (7, 0, −20) and interactive lift notice clearly communicate this. An inexpensive sealed upper collider prevents entry into unfinished space. The upper shell and canopy hide inside, matching the existing ground-floor third-person camera convention. No extra dynamic lights, textures or model downloads were introduced.

## Modules and interactions

- `src/game/world/building/plan.ts`: floors, lift location, interaction metadata, disabled future event volumes.
- `ThreeFloorBuilding.tsx`: instanced facade, window bays, floor plates, roof, canopy, reserved interior kits and structural colliders.
- `CommerceAccess.tsx`: directory, lift portal, loading paint, rear signage and static interaction rings.
- `TokoCung.tsx`: composes building modules with existing playable retail and warehouse fixtures.
- `outdoor-layout.ts` / `RoadNetwork.tsx`: shared terrain, road, sidewalk, parking and crossing plan; landmark height updated.

Directory, lift, loading and featured-product markers use the existing F/touch interaction system and show informational messages. Shopping still uses existing shelf and cashier actions. Interaction proximity now checks vertical separation, preparing against accidental cross-floor interactions.

## Asset organization and expansion

Keep procedural modules under `src/game/world/building/`. If replacing them with authored assets, use:

```
public/models/world/toko-cung/
  structure/       # floor slab, wall bay, column, roof
  facade/          # red panel, window bay, sign backing
  circulation/     # canopy, lift portal, landing
  interiors/       # service desk, packing table, stock pallet
  frontage/        # bollard, loading sign, parked delivery van
```

Export each module in meters with its pivot at floor level, +Y up and +Z facing outward. Share materials and repeated geometry; bake sign textures when exporting (Drei text is runtime geometry). Existing instanced batches are the rendering source, not delivered GLB files. Keep collision and trigger definitions separate from exported visuals.

To open floor 2, replace the sealed volume with per-floor slabs/walls and add authoritative lift travel, arrival clearance, floor-aware camera cutaways and floor labels/minimap navigation. Then enable the disabled `community-event` volume and add services or scheduled events.

For floor 3, expand pallet/packing modules, add bounded NPC routes, and connect the disabled `stock-event` volume to operational events. Any restricted stock actions or staff access must be checked on the server. Do not enable the stored trigger flags alone and assume permissions or travel are implemented.

## Verification

Run `node scripts/check-world-plan.mjs`, `npx tsc --noEmit`, and `npm run build`. Browser acceptance should cover spawn-to-entry, all shelf interactions, checkout, warehouse passage, rear loading exit, lift notice, and touch interaction at both quality settings. Upper-floor traversal is intentionally unavailable.

## Implemented Map V2 population

The runtime now mounts exactly seven local NPCs on both quality settings: two aisle customers, cashier, front pickup courier, sidewalk warga, and the existing stock/packing workers. `src/game/npc/population.ts` owns static placements and simple patrol endpoints. The owner, extra frontage staff, extra courier and their unused owner interaction are removed from this scene. Customer and warga patrols pause at endpoints; all moving workers pause for conversation. Existing order-driven packing remains; the automatic demo-order timer has been removed. No new event engine was added.

The warga route stays on the sidewalk at X −11…−7, Z 11.7. The entrance and rear door remain free of standing NPCs. Worker routes retain the retail/warehouse passage. Upstairs has no NPCs.

## Implementation verification and replacement points

`GameCanvas.tsx` composes the existing scene. `WorldZones.tsx` exposes all eight semantic zones as named groups with metadata from `zones.ts`. `props/StreetFurniture.tsx` owns replaceable benches, trees and lamps. `props/CommercialFrontage.tsx` owns parked vehicle slots and frontage details, using the existing `VehicleModel` and separate colliders. Existing shelves remain in `Shelf.tsx` / `RetailShelf.tsx`, and moving vehicles remain under `game/traffic`.

The customer court and side service path are paved in the shared outdoor layout. A parked customer car and rear delivery van ground the parking/loading spaces without introducing new model downloads. The outdoor camera frames the taller facade; indoor camera distance remains unchanged. The cashier interaction point is now on the customer side of the counter, and the warehouse passage matches its 3.2 m intended opening.

Validation completed for this implementation:

- Production build and TypeScript check pass.
- ESLint passes for all changed application files and the layout-check script; full-repository lint still reports existing issues in unrelated files.
- Layout checks validate three floor levels, seven NPCs, all eight zones, non-traffic ambient routes, entrance clearance and disabled future volumes.
- Headless Chrome rendered the actual `GameCanvas` through a temporary local harness, with no runtime exceptions. Keyboard walkthrough passed entrance, shelf interaction, cashier interaction, exit, directory, side service path, rear warehouse entrance and lift information.
- Mobile emulation confirmed low-quality rendering and touch-drive entry. The harness was removed afterward. These checks exercise the scene/controller; they do not exercise authenticated account or payment backend flows.

## Population and ambient-life follow-up (current implementation)

This follow-up supersedes the seven-NPC baseline above. It preserves the approved main building, floor plan, roads, crossings, parking, zones, HUD, player controller and base avatar. Those files were checked against a before-work hash snapshot.

- Ten NPCs: three customers, one cashier, one retail staff member, two warehouse workers, one courier and two residents. No upstairs actors or optional owner.
- `npc/population.ts` owns eight ambient actor configurations; `npc/behavior.ts` provides seeded 2–8 second pauses, smooth turning and conversation recovery. Existing warehouse workers remain in `NakamaOps.tsx`, with routes confined to the warehouse. Existing order handling is retained; new ambient actors do not dispatch orders or events.
- Movement pauses only for the active conversation, rather than merely being nearby. Actors face the player, wait 1.5 seconds after dialogue closes, then continue without teleporting. Ambient walkers yield to nearby players/actors. Retail staff use the existing uniform and carry a small carton; scanning, browsing and phone activities reuse the base rig's animations.
- Thirteen replaceable prop slots: shopping cart, checkout bag, warehouse crates/parcels/trolley/tape, pickup parcels/trolley/cone, front bin, two wheel stops and utility box. Procedural visuals share one instanced batch; simple colliders remain separate. Existing baskets, POS accessories and instanced shelf products are retained.
- Six existing neighbor lots receive photo-inspired office/shopfront skins: pale tiled panels, blue glazing, restrained canopies and utility details. Lot positions, dimensions, heights and collision footprints are unchanged. These are stylized interpretations, not exact replicas of photographed businesses.

Changed for this follow-up: `GameCanvas.tsx`, `interactions/interactables.ts`, `npc/Npc.tsx`, `npc/population.ts`, `npc/behavior.ts`, `simulation/NakamaOps.tsx`, `world/OutdoorNeighborhood.tsx`, `world/ReferenceNeighbors.tsx`, `world/neighbor-skins.ts`, `world/props/ActivityProps.tsx`, `world/props/activity-props.ts`, `src/identity/characters.ts`, `scripts/check-world-plan.mjs`, and this implementation note (paths under `src/game` unless otherwise shown).

Browser verification: entrance, browsing, checkout, exit, directory, service path, rear door and lift interaction passed with ten actors and no page errors. Conversation checks confirmed stationary TALK, smooth facing, a delayed RETURN, and continuous WALK afterward. Mobile emulation passed low-quality rendering and touch entry. A desktop Chrome sample measured roughly 16.7 ms median frame time (about 60 FPS), 806 draw calls and 286k triangles in the full existing scene; this is a local sample, not a device-wide performance guarantee. Added props use instancing, and no new texture downloads, lights, independent rigs or event engine were introduced.

Placeholders remain the small procedural props and photo-inspired neighboring facades. Detailed GLBs, advanced vehicle behavior, checkout queue simulation and upstairs population remain later work.

## Vehicle, prop and environment asset-quality pass

The approved map and NPC logic remain intact. `TokoCung.tsx` changes only three warehouse visual slots to fixed-width stock racks, eliminating oversized bookcases near the rear doorway. No building shell, road, zone, HUD, player, NPC or traffic-controller redesign is included.

- `src/game/assets/parts.ts` and `StyledBatch.tsx` provide reusable beveled boxes, cylinders, tapered cones, rings and helmet domes, grouped by geometry/material for instanced rendering. Shared finishes cover painted metal, plastic, glass, cardboard, wood, rubber, concrete and fabric. No new textures or lights.
- `assets/vehicles.ts` defines five visual types and six staged slots: customer car, red/white branded Toko Cung van, two motorcycles with delivery boxes/helmets, small pickup, and supplier box truck. Existing car/van placements are retained; additional vehicles use free parking/loading slots. The supplier truck sits slightly deeper in its bay to retain the existing rear pedestrian approach. `traffic/VehicleModel.tsx` keeps the existing +Z orientation and car/van API; traffic motion is unchanged.
- `props/activity-props.ts` now builds open-frame carts/cages, ribbed crates, slatted pallets, labeled cartons, wheeled trolleys, pallet jack, tapered cones, ring-shaped tape, shopping bags, vented utility boxes and bins. `ActivityProps.tsx` batches their visuals while retaining separate colliders and optional GLB slots. A rear cage and pallet jack occupy clear staging space.
- `RetailAccessories.tsx` replaces solid basket blocks with nested open baskets at the same anchor. `RetailFixtures.tsx` softens cashier/POS/scanner/printer shapes with shared geometry; interaction colliders remain unchanged. `RetailShelf.tsx` varies existing instanced package heights and widths without adding per-product meshes.
- `WarehouseRack.tsx` supplies bounded metal stock racks with mixed carton sizes. Existing packing furniture and other suitable local GLBs remain reused. `StreetFurniture.tsx` upgrades slatted benches, cylindrical posts and softened, muted tree crowns without moving them. `ReferenceNeighbors.tsx` adds window frames, sill shadows, door handles and rooftop details within existing footprints.

Validation: desktop keyboard walkthrough passed entrance, shelf browsing, cashier, exit, pickup, side service path, rear loading entry and lift notice. Ten NPCs and conversation pause/return/resume remain working. Mobile emulation passed low-quality rendering and touch entry. No application page errors were observed in final runs. Registry checks cover vehicle types, vehicle separation, NPC-route clearance, road clearance and the rear pedestrian approach. Temporary browser harness files were removed.

Local final render sample: desktop approximately 16.7 ms median frame time, 845 draw calls, 393,144 triangles; mobile emulation approximately 16.7 ms, 508 calls, 292,740 triangles. The earlier desktop population sample was 806 calls and 286,232 triangles, so visual detail increases geometry cost while the sampled frame rate remains about 60 FPS. Mobile emulation is not a physical-phone performance guarantee.

Remaining generic assets: some legacy interior furniture/carton GLBs, distant skyline and generic product labels. New vehicles/props are procedural stylized assets, with registry-based GLB replacement supported for staged vehicles and activity props. No vehicle gameplay, new NPC behavior, or POS event engine was added.
