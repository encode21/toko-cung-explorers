# Shared player vehicles

Nine parked vehicles per room on the current client (six on legacy builds) use the existing mobility API and realtime channel. Ambient traffic remains NPC-owned and cannot be hijacked. There is no new dependency or economy/reward path.

## Play

Approach an empty parked vehicle and choose **Naik** or press F/E. Motor bebek and matic have one passenger seat; hatchback, MPV, pickup and angkot have three. The driver selects a nearby player and sends **Ajak bonceng / Ajak ikut**; the passenger must accept. Invitations reserve capacity for 20 seconds. Only stopped vehicles can board. Either player can leave; leaving as driver releases all passenger seats.

Keyboard: W/S accelerate/reverse, A/D steer, Space brake, F/E exit. Touch: existing joystick steers, GAS sits above REM, and Turun stays in the contextual-action slot. All driving fingers use the existing multitouch surface. Blur, UI blocking and disconnection clear held controls. Exits search for a clear position beside the vehicle; obstructed exits use the existing safe walkable recovery path.

Vehicles are limited to 10 m/s forward, 3 m/s reverse. A Rapier kinematic body sweeps its footprint before movement and stops at people, traffic, buildings, deep water and outer bounds. It never calls the NPC traffic impact/ragdoll path. Other legacy pedestrian/NPC-traffic impact behaviour is unchanged.

## Where to find a vehicle

Each room automatically receives nine vehicles on the current client after a successful mobility connection and traffic-host election; no vehicle seeder or admin event switch is needed. Models and two car locations are chosen once when the room pool is created:

| Slot | Location (world X, Z) |
| --- | --- |
| Two cars | Customer parking `(-7.75, 7.8)` / `(-5.25, 7.8)`, or market roadside `(81, 8)` / `(127, 8)` respectively |
| One motorcycle | Shop motorcycle parking `(11, 5.7)` |
| One motorcycle | City park parking `(81, 64)` |
| Two cars | City park parking `(81, 68)` and `(81, 73)` |
| Convertible (2 seats) | `(81, 79)` |
| Bajaj (3 seats) | `(81, 85)` |
| Jeepney (6 seats) | `(81, 92)` |

Only nearby vehicles render (65 m). Walk to a parking area, approach a stopped empty vehicle and use **Naik** / F / E. Moving NPC traffic is separate and cannot be boarded. Other players can move shared vehicles; empty ones return after 60 seconds idle.

## Authority and synchronization

- `WorldMobility` retains connection ownership, room lease, availability and the room transaction lock. `WorldVehicles` owns the nine-slot pool, driver claim, seat reservations, consent, capacity, release and idle return.
- The elected traffic host requests `vehicle-spawn`. The server chooses model, palette and parking/roadside alternatives; retries or competing host requests remain idempotent and capped. Followers learn the exact same pool from mobility snapshots. The public endpoint permits any valid lease to request that same capped pool; host election is an orchestration convention, not a security boundary.
- Actions: `vehicle-spawn`, `vehicle-mount`, `vehicle-invite`, `vehicle-accept`, `vehicle-decline`, `vehicle-leave`. `vehicleId` is a server pool UUID, distinct from ambient traffic IDs. Mobility `read` returns `vehicles`; optional `vehiclePose` is persisted only for the current driver.
- Membership heartbeats are 1 Hz; stale mobility members expire after 8 seconds. Inactive room leases, room changes, carry/flight conflicts and unavailability release or reject seats. A vehicle without occupants returns to its original slot after 60 seconds idle. Abandoned vehicles stop immediately.
- `vehicle_pose` uses the existing channel: `{id, room, driver, revision, seq, pose:{x,y,z,yaw,speed}}`. Driver publishes up to 10 Hz. Receivers require a matching server-confirmed driver/revision, monotonic sequence and bounded finite fields. Render interpolation uses 14/s damping, up to 200 ms extrapolation, then stops speed after 1 second without a packet. Mobility snapshots provide reconnect fallback.
- The same interpolated vehicle pose anchors every local/remote occupant. Room teardown clears input, pose packets and render state. Bodies/meshes beyond 65 m are disabled locally.

`VehicleModel` shares stylized bebek, matic, hatchback, MPV, pickup and angkot geometry between parked and NPC fleets. The existing lights and exhaust remain in use; 32 ambient vehicles and IDs stay unchanged.

## Rollout

Before building a release, verify the frontend's actual `main` includes `src/game/vehicles/PlayerVehicles.tsx` and mounts it in `OutdoorNeighborhood`. Merging a stacked PR into another feature branch does not by itself put the feature in `main`.

Deploy the backend from its merged `main` first. For the combined vehicles + mini-games frontend, both additive migrations must have run:

```sh
php artisan migrate --path=database/migrations/2026_11_09_150000_create_world_vehicles.php --force
php artisan migrate --path=database/migrations/2026_11_09_170000_create_world_minigames.php --force
```

Then rebuild/deploy the matching frontend `main` (or restart the local dev server), refresh the browser and rejoin a room. A local frontend still uses the backend configured by `TOKO_CUNG_API_URL`; pulling another backend checkout does not change that target. Mini-games additionally require an enabled, currently active `MINI_GAME` schedule in `/world-admin`; vehicles spawn automatically without an event schedule. `/api/world/mobility` should return `vehicles` (nine entries after spawn for the current client, six for legacy clients); an old response without this field means the backend is still old, and a missing `world_vehicles` table causes an API error. No vehicle seeding command is required.

Depends on the map-expansion frontend/backend PRs. Apply additive migration `2026_11_09_150000_create_world_vehicles.php` with the backend release **before** publishing this frontend. Existing clients retain their carry/flight API fields. No production migration, database command or deployment was performed here. For rollback, remove the frontend feature before rolling back backend code; keep the additive table until no release queries it.

## Local verification

- `APP_KEY=<disposable test key> php -d error_reporting=22527 vendor/bin/phpunit --filter World`: 139 tests / 1,148 assertions. Tests create their schema in setUp; no RefreshDatabase or live database.
- `npx tsc --noEmit`, `npm run build`, road-network and traffic-fleet checks pass.
- `WORLD_QA_BACKEND=/absolute/path/to/toko-cung node scripts/check-vehicles-browser.mjs`: actual Player, HUD, Rapier, mobility store and Laravel WorldMobility/WorldVehicles; two browser tabs in one room. Only transport/authentication is replaced by local synthetic identities and BroadcastChannel. PHP fixture refuses to run without APP_ENV=testing and a temporary QA SQLite path.
- Browser checks car claim, invite/accept, drive/brake, interpolated passenger, independent exits; motorcycle claim/consent, real two-finger touch gas + steering, touch brake, nonoverlapping controls, and driver disconnect ejection. Screenshots and numeric pose comparison: `docs/qa/vehicles/`.
- Physical phones, production authentication/realtime transport, high-latency recovery and room load are not verified. Part 1 desktop benchmark remains documented in map-expansion.md; these touch tests do not establish physical mobile FPS.

## Abuse limits

Seats and consent are server-owned, but driving positions and packet sender fields remain client-authoritative. A modified client can spoof motion, teleport or impersonate a pose sender; field/revision checks reduce accidental corruption, not cryptographic forgery. No World Point, cash-valued reward or race result trusts this movement. Do not attach monetary awards without server simulation/proof and budget/idempotency checks.

## Cartoon vehicle revision (2026-11-09)

`vehicles/definitions.ts` owns cabin dimensions, cushions, door access, footrests, wheel pivots and grips. Base/Explorer keep their original scale; a riding clip plus an arm IK layer reaches the same grip coordinates. The pickup is a four-seat crew cab. Player, traffic, staged and delivery vehicles share `VehicleModel`; nearby interiors and wheel spokes are culled at 20/32 m by the existing render tier.

Mobility now returns additive `serverTime` (milliseconds) and optional seat `transition: {phase, startedAt, durationMs, from, to}`. `phase` is `entering`, `seated`, or `exiting`; absence means seated. Consent remains `pending`/`active`. Door animations last 2,000 ms using server time. Seats remain reserved and driving is frozen until settled. `from` is the boarding player's physics position, `to` the checked outside-door point; the in-cabin destination comes from the model definition. `vehicleAccess` and driver `vehicleExits` are bounded visual endpoints, not rewards or movement authority. The frontend checks doorway occupancy and the approach sweep before submitting. Repeated mount/accept/leave does not restart an active transition. Teleport sends `available:false`; room/disconnect use the existing lease cleanup.

Deploy the companion backend first, then frontend and refresh active rooms. Transition state uses the existing occupants JSON: **no migration**. Older occupants and clients remain readable; do not deploy the frontend against a backend which strips the new endpoints.

Checks: `node --experimental-strip-types scripts/check-vehicle-fit.mjs` covers every model/seat, both rigs and Explorer headwear, floor/roof clearance and driver grip reach. `scripts/check-cartoon-gallery.mjs` captures front/side/rear/three-quarter views. The two-player browser harness starts on deterministic, clear city-road positions using the guarded local QA fixture, so parked NPCs cannot accidentally block its test route.


## Reference fleet revision (9 November 2026)

The user expanded the original eight-model scope to include a two-seat convertible, three-seat bajaj and six-seat jeepney. Shared geometry now uses sloped nose profiles, slanted windshields, wheel arches, detailed rims and model-specific cabins. The convertible has an open roof and purple upholstery, the bajaj a three-wheel chassis/black canopy, and the jeepney a long open cabin, blue roof and vertical chrome grille. Truck geometry supports both the delivery flatbed and the enclosed cargo box.

Every automatic traffic vehicle (including the delivery van) renders an original seated NPC with face, hands on the controls and supported legs. These are lightweight parts batched with each vehicle, with the same 20/32 m detail distance; they do not add replicated players, mixers or crowd-AI entities. Shared parked/player vehicles have no duplicate NPC driver. Ambient roster/IDs remain 32 + delivery; the new types also appear in automatic traffic.

Clients send supported `vehicleModels`; backend replies with `vehiclePoolSize` (nine for the current build, six for legacy). A host fills missing slots idempotently, so existing rooms gain the three new models without replacing old vehicles. Legacy clients do not receive unsupported model names. Seat counts, hinges, lamps and wheels come from `vehicles/definitions.ts`; HUD capacity is derived from it. Backend capacity remains authoritative and accepts up to six exit endpoints.

No migration or seeding is needed for this revision. Release the backend before the frontend, then refresh/rejoin rooms. [Visual gallery, two-player evidence and performance](qa/reference-vehicles/README.md). No production deployment or physical-phone verification was performed.

## Batas berkendara — 10 November 2026

- Tombol uji `TEST · KE FINISH` dan aksi warp dari store pemain dihapus; progres Obby tetap berurutan.
- Empat jalan yang tampak berlanjut melewati pulau diberi rambu `BATAS KOTA / PUTAR BALIK` dan marka melintang. Rambu visual tidak menambah collider atau mengubah rute NPC.
- Kendaraan memeriksa sembilan titik tapak terhadap air berkedalaman >0,5 m dan batas luar ±(OCEAN_PLAY_LIMIT−2). Posisi ditahan sebelum tapak melewati batas; gerakan yang mengurangi pelanggaran tetap boleh agar posisi lama dapat mundur. Sweep fisika mengizinkan gerak keluar dari kontak awal.
- Peringatan pada kartu kendaraan memeriksa jalur 10 m ke depan (atau ke belakang saat mundur), tetap terlihat saat berhenti menghadap batas, lalu hilang ketika menjauh. Desktop: S untuk mundur. Sentuh: lepas GAS lalu tarik joystick ke belakang; GAS dan REM mempertahankan prioritasnya.
- Verifikasi terfokus: `node scripts/check-vehicle-boundaries.mjs` memakai Player, Rapier, HUD dan kontrol sentuh asli dengan state kursi sintetis, tanpa backend/akun produksi. Bukti di `/tmp/toko-boundary-qa` secara default. Tidak memerlukan migrasi; rilis frontend dan muat ulang klien.
