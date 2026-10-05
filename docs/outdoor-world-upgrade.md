# Outdoor world upgrade

The old outdoor scene placed independent roads, houses, partner GLBs and vans without a shared spatial model. That is why a house could occupy a road: neither renderer had a road bound nor did placement run an intersection test. Vehicle motion also only changed a group’s X coordinate, so it had no lane, braking, collider, or player feedback.

The outdoor renderer now consumes `src/game/world/outdoor-layout.ts`:

- Four shared road segments define the main street, west residential lane, park lane and rear delivery road.
- Sidewalks are generated from road edges and cut around driveways; parking, pedestrian aprons, green space and crosswalks are explicit zones.
- `BUILDING_LOTS` contains all exterior parcels. `buildingBounds` includes a detail setback and `validateLots()` rejects roads, sidewalks, reserved zones, spawn clearance and other buildings. The current 18-lot plan validates with zero errors.
- `RoadNetwork` renders asphalt, lane dashes, curbs, parking stripes, crosswalks and delivery markings. `BuildingLot` renders shared stylized houses, ruko, café/laundry/workshop facades with simple colliders.
- `OutdoorNeighborhood` replaces the old independent neighborhood in `GameCanvas`; Toko Cung’s existing interior remains unchanged. Furniture, trees, lamps, distant skyline and the existing sky stay lightweight and batched.

`TrafficSystem` follows named `TrafficLane` point paths. Vehicles use simple kinematic Rapier colliders, slow at intersections, crosswalks, merges and the Toko frontage, stop behind other vehicles and brake for registered pedestrians. The delivery vehicle follows the existing operations truck phase through the delivery driveway. `traffic-runtime.ts` is a small registry for future signals/audio without coupling the scene to an audio engine.

The player and outdoor pedestrians register with the traffic system. A valid impact applies direction-aware, clamped knockback, a short fall lean, subtle camera shake and “Waduh!” star VFX. Controls lock for 1.25 seconds and collision groups provide 2.4 seconds of invulnerability. A nearest-sidewalk recovery runs only when the player remains in a vehicle or world-bound collision. Pedestrians stop at the main crosswalk and use the same lightweight reaction.

The minimap now draws the same roads, sidewalks, parking and crosswalk zones used by the 3D renderer. Add `?worldDebug=1` in development to show road, sidewalk and parking debug slabs.

Validation run: `npx tsc --noEmit`, the avatar and outdoor layout Node tests, production `npm run build`, ESLint on changed files, and the existing headless desktop/mobile world check. The browser pass confirmed shelf interaction, Belanja, all HUD tabs, touch movement/camera, joystick hide/restore and no page errors. Physical-device FPS and real audio remain future profiling work; vehicles and props are procedural placeholders until branded GLBs are available.
