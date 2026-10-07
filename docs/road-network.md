# Connected road network implementation

The approved street centers remain: Utama at z=20, Kampung at x=-30, Taman at x=22 and Gudang at z=-32. Playable collision bounds remain ±56. Only distant visual ground, road and sidewalk continuations extend beyond these bounds into fog.

## Geometry

`outdoor-layout.ts` supplies the road rectangles, full junction footprints and graph nodes/edges. `road-geometry.ts` computes a planar union, removes internal edges and chamfers the resulting perimeter. `RoadSurface.tsx` triangulates those outlines, including holes around blocks. Asphalt is one continuous mesh, rather than overlapping boxes. Curbs follow the same perimeter with openings at driveways and crossings.

- Front-left: four-way intersection.
- Front-right: T-junction.
- Rear-left: T-junction.
- Rear-right: complete 90-degree bend with chamfered sidewalk corners and a curved dashed divider.
- Parking: driveway now reaches the customer lot.
- Pickup: connection reaches motorcycle parking.
- Loading: rear street opening joins the loading yard; the service walkway also reaches it.

Widths remain 6.4 m / 3.2 m per lane. Asphalt, sidewalk, curb heights and marking dimensions are shared. T/cross junctions remain free of lane dividers. A walkway edge that protruded into Taman was trimmed; two benches that obstructed crossing/driveway clearance were moved onto clear sidewalk space. Buildings, store interior, HUD, NPC style and controller were not redesigned.

## Routes and vehicles

The road graph connects front/rear junctions, four distant edge anchors, parking, pickup and loading. Moving routes derive their lane centers from this same segment plan. `smoothRoadPath` adds sampled quadratic fillets once at initialization. Vehicles reduce speed near junctions and interpolate the shortest heading rotation while following these paths.

Ambient routes now include the right-side/rear/left-side neighborhood route, a west-to-north turning route and a straight eastbound route. Cars retire beyond the playable neighborhood and respawn only at clear anchors beyond the fog. Delivery retains its existing incoming → loading → leaving → away workflow. An endpoint bug that immediately changed a loading truck to away is fixed.

Spawn checks cover the full car/van footprint, intersection clearance, other vehicles, local actors and remote players. The existing traffic snapshot now includes optional `active` state so followers hide retired vehicles. Large follower resets use direct placement rather than a high-speed kinematic sweep through the map.

A four-second actual-position watchdog detects stalled traffic. It first attempts a small validated forward correction. Otherwise the vehicle is hidden and disabled, then reset at the nearest clear off-world route anchor; if none is clear it waits hidden and retries. Pedestrian yielding, impact braking and intentional loading are excluded from stall recovery.

## Validation

- `node scripts/check-road-network.mjs`: all junction quadrants, graph connectivity, lot clearance, every route sampled at 0.1 m intervals with the full swept footprint, heading continuity, spawn rejection, recovery timing and heading wrap.
- Existing `check-world-plan.mjs`: passed, including NPC route and staged asset clearance checks.
- TypeScript, changed-file ESLint and production build: passed.
- Desktop browser: inspected overview, every junction, parking, pickup and loading. Advanced the actual frame/physics callbacks through 400 simulated seconds (rendering omitted during acceleration): neighborhood route completed two cycles, other ambient routes three, delivery remained loading until departure was requested, then returned to away. No visible route-reset teleports or runtime errors.
- Desktop and touch-emulated mobile: injected blocked traffic and occupied recovery anchors, verified hidden waiting and subsequent respawn; mobile store entrance traversal passed. No runtime errors.

Physical mobile hardware and multi-client network synchronization were not exercised. Traffic uses simple local yielding rather than signals or a traffic-management simulation. Parking/loading graph branches prepare future access; this phase does not add autonomous parking or delivery missions.

## Files changed in this phase

- `src/game/world/outdoor-layout.ts`
- `src/game/world/RoadNetwork.tsx`
- `src/game/world/OutdoorNeighborhood.tsx`
- `src/game/world/street-props.ts`
- `src/game/world/road-geometry.ts` (new)
- `src/game/world/road-path.ts` (new)
- `src/game/world/road-surfaces.ts` (new)
- `src/game/world/RoadSurface.tsx` (new)
- `src/game/traffic/TrafficSystem.tsx`
- `src/game/traffic/traffic-math.ts`
- `src/game/traffic/traffic-sync.ts`
- `src/game/traffic/route-safety.ts` (new)
- `scripts/check-road-network.mjs` (new)
- `docs/road-network.md` (new)

Other working-tree changes predate this road task and were preserved.
