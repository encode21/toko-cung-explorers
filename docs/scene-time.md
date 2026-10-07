# Scene time implementation

`src/game/time/scene-time.ts` owns world time. The production default is `REAL_TIME`, using UTC+7 (Jakarta/WIB), independent of the device timezone. `SceneEnvironment` advances this source at 10 Hz while the scene renders; resuming a background tab catches up to live time. HUD subscribers select the formatted minute, so frame updates do not rerender the HUD.

The store exposes `currentTime`, fractional `minutes`, `hour`, `minute`, `timeOfDay`, `dayProgress`, `normalizedDayProgress`, `isNight`, `isStoreOpen`, and `mode`. Opening metadata is 07:00–22:00 only; it does not gate access, NPCs, shopping or events.

`model.ts` defines periods, wraparound, the stylized east-to-west sun trajectory and smooth lamp curves. `lighting.ts` samples cyclic, smoothstep-interpolated color/intensity keyframes. One shared mutable lighting output feeds the dome, cloud tint, sun, hemisphere/ambient fill, fog, environment-map contribution and all fixtures. It does not rebuild scene objects when time changes. No individual fixture computes its own time.

## Visual behavior

- Dawn: muted blue/peach horizon, fading street lights.
- 08:30: pale blue gradient, warm sun, longer easterly shadows, subtly lit retail interior.
- Noon: higher neutral sunlight and shorter shadows.
- Afternoon/golden hour: reversed shadow direction and a progressively peach horizon.
- 19:00: blue evening sky, cool readable fill, warm retail/cashier/entrance and warehouse lights, mild emissive sign.
- Street lamps fade from 17:30 to 18:15. Store fixture strength fades down between 22:00 and 22:30 without closing gameplay.

The sun and moon use small unlit spheres with a disc-like appearance from every camera angle. The visible sun and directional light share the same direction. The moon is a visual marker, not another shadow-casting light. Their visibility depends on elevation; buildings can occlude them naturally, and the player may need to turn toward them.

The sky is a small gradient shader. Clouds use one instanced mesh: eight clusters / forty low-resolution puffs on desktop, four clusters / twenty puffs on mobile. A shared shader gives soft underside variation and time-dependent color. Slow bounded drift uses elapsed render time only for motion, never to determine the world clock.

## Development controls

In development, append `?timeDebug=1` to show the separate QA panel. Append `&worldTime=08:30` to start at a fixed benchmark. Without `timeDebug`, the normal HUD stays uncluttered.

```js
window.sceneTime.setWorldTime("17:30");
window.sceneTime.startDemo(); // 24 world hours in 480 seconds
window.sceneTime.startDemo(300); // accepts 300–600 seconds
window.sceneTime.setRealTime();
window.sceneTime.getState();
```

Preset buttons cover 06:00, 08:30, 12:00, 16:00, 17:30, 19:00 and 23:00. Fixed/demo controls and URL overrides are development-only. Production exposes no `window.sceneTime` control API.

## Performance and validation

One 2048px directional shadow map on desktop; existing low-quality/mobile policy disables dynamic shadows. Existing interior light locations are retained. Two useful street point lights on desktop / one on mobile plus one entrance point light are added; none casts shadows. All street lamp heads share one instanced draw and material. No new sky textures, volumetrics, reflections or per-minute scene reconstruction.

Checks: `node scripts/check-scene-time.mjs`, `node scripts/check-world-plan.mjs`, `npx tsc --noEmit`, changed-file ESLint, and `npm run build`. Browser QA covers all seven fixed times at 1440×900 and touch-emulated 390×844, sun/moon visibility, debug modes and midnight rollover, and keyboard/touch entrance traversal at night. Mobile emulation validates the low-quality rendering path; physical-device thermal/battery performance remains to be measured.

Future work: astronomically precise sun position, weather and lunar phases are intentionally absent. NPC schedules and the event engine can subscribe to the time source later; neither is implemented here. Existing map geometry, zones, NPC behavior, player controller and HUD organization are preserved.

## Files for this phase

- Added: `src/game/time/model.ts`, `scene-time.ts`, `lighting.ts`, `SceneEnvironment.tsx`, `SceneTimeDebug.tsx`, `TimedFixtures.tsx`.
- Updated: `src/game/engine/GameCanvas.tsx`, `src/game/world/SkyEnvironment.tsx`, `StoreInterior.tsx`, `TokoCung.tsx`, `building/ThreeFloorBuilding.tsx`, `props/StreetFurniture.tsx`, `src/ui/hud/WorldHeader.tsx`.
- Added: `scripts/check-scene-time.mjs`, `docs/scene-time.md`.

The repository contains pre-existing uncommitted Map V2/NPC/asset changes; those are not new changes from this phase.
