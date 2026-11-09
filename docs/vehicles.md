# Shared player vehicles

Six parked vehicles per room use the existing mobility API and realtime channel. Ambient traffic remains NPC-owned and cannot be hijacked. There is no new dependency or economy/reward path.

## Play

Approach an empty parked vehicle and choose **Naik** or press F/E. Motor bebek and matic have one passenger seat; hatchback, MPV, pickup and angkot have three. The driver selects a nearby player and sends **Ajak bonceng / Ajak ikut**; the passenger must accept. Invitations reserve capacity for 20 seconds. Only stopped vehicles can board. Either player can leave; leaving as driver releases all passenger seats.

Keyboard: W/S accelerate/reverse, A/D steer, Space brake, F/E exit. Touch: existing joystick steers, GAS sits above REM, and Turun stays in the contextual-action slot. All driving fingers use the existing multitouch surface. Blur, UI blocking and disconnection clear held controls. Exits search for a clear position beside the vehicle; obstructed exits use the existing safe walkable recovery path.

Vehicles are limited to 10 m/s forward, 3 m/s reverse. A Rapier kinematic body sweeps its footprint before movement and stops at people, traffic, buildings, deep water and outer bounds. It never calls the NPC traffic impact/ragdoll path. Other legacy pedestrian/NPC-traffic impact behaviour is unchanged.

## Authority and synchronization

- `WorldMobility` retains connection ownership, room lease, availability and the room transaction lock. `WorldVehicles` owns the six-slot pool, driver claim, seat reservations, consent, capacity, release and idle return.
- The elected traffic host requests `vehicle-spawn`. The server chooses model, palette and parking/roadside alternatives; retries or competing host requests remain idempotent and capped. Followers learn the exact same pool from mobility snapshots. The public endpoint permits any valid lease to request that same capped pool; host election is an orchestration convention, not a security boundary.
- Actions: `vehicle-spawn`, `vehicle-mount`, `vehicle-invite`, `vehicle-accept`, `vehicle-decline`, `vehicle-leave`. `vehicleId` is a server pool UUID, distinct from ambient traffic IDs. Mobility `read` returns `vehicles`; optional `vehiclePose` is persisted only for the current driver.
- Membership heartbeats are 1 Hz; stale mobility members expire after 8 seconds. Inactive room leases, room changes, carry/flight conflicts and unavailability release or reject seats. A vehicle without occupants returns to its original slot after 60 seconds idle. Abandoned vehicles stop immediately.
- `vehicle_pose` uses the existing channel: `{id, room, driver, revision, seq, pose:{x,y,z,yaw,speed}}`. Driver publishes up to 10 Hz. Receivers require a matching server-confirmed driver/revision, monotonic sequence and bounded finite fields. Render interpolation uses 14/s damping, up to 200 ms extrapolation, then stops speed after 1 second without a packet. Mobility snapshots provide reconnect fallback.
- The same interpolated vehicle pose anchors every local/remote occupant. Room teardown clears input, pose packets and render state. Bodies/meshes beyond 65 m are disabled locally.

`VehicleModel` shares stylized bebek, matic, hatchback, MPV, pickup and angkot geometry between parked and NPC fleets. The existing lights and exhaust remain in use; 32 ambient vehicles and IDs stay unchanged.

## Rollout

Depends on the map-expansion frontend/backend PRs. Apply additive migration `2026_11_09_150000_create_world_vehicles.php` with the backend release **before** publishing this frontend. Existing clients retain their carry/flight API fields. No production migration, database command or deployment was performed here. For rollback, remove the frontend feature before rolling back backend code; keep the additive table until no release queries it.

## Local verification

- `APP_KEY=<disposable test key> php -d error_reporting=22527 vendor/bin/phpunit --filter World`: 139 tests / 1,148 assertions. Tests create their schema in setUp; no RefreshDatabase or live database.
- `npx tsc --noEmit`, `npm run build`, road-network and traffic-fleet checks pass.
- `WORLD_QA_BACKEND=/absolute/path/to/toko-cung node scripts/check-vehicles-browser.mjs`: actual Player, HUD, Rapier, mobility store and Laravel WorldMobility/WorldVehicles; two browser tabs in one room. Only transport/authentication is replaced by local synthetic identities and BroadcastChannel. PHP fixture refuses to run without APP_ENV=testing and a temporary QA SQLite path.
- Browser checks car claim, invite/accept, drive/brake, interpolated passenger, independent exits; motorcycle claim/consent, real two-finger touch gas + steering, touch brake, nonoverlapping controls, and driver disconnect ejection. Screenshots and numeric pose comparison: `docs/qa/vehicles/`.
- Physical phones, production authentication/realtime transport, high-latency recovery and room load are not verified. Part 1 desktop benchmark remains documented in map-expansion.md; these touch tests do not establish physical mobile FPS.

## Abuse limits

Seats and consent are server-owned, but driving positions and packet sender fields remain client-authoritative. A modified client can spoof motion, teleport or impersonate a pose sender; field/revision checks reduce accidental corruption, not cryptographic forgery. No World Point, cash-valued reward or race result trusts this movement. Do not attach monetary awards without server simulation/proof and budget/idempotency checks.
