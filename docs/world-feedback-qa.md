# Interaction, ambience and world feedback

The existing world geometry, NPC routes, vehicle authority, SceneTime, profile storage and multiplayer protocol are preserved. No POS Event Engine, missions, XP or rewards were added.

## Integration

- `audio-manager.ts` extends the existing shared AudioContext with master, music, ambience, SFX, NPC and vehicle buses. The original music/SFX controls remain; master mute, master volume and ambience volume use the same HUD popup. Preferences persist locally. Old SFX preferences migrate.
- `AmbientMusic.tsx` owns gesture unlock, retry after denied unlock, visibility suspension and route cleanup. Ambient callbacks never attempt autoplay themselves. Music scheduling skips hidden, suspended or master-muted playback.
- `world-acoustics.ts` reads the existing store/zone/sidewalk footprints. Outdoor, retail, cashier, warehouse and front pickup/rear loading have separate acoustic treatment. Indoor/outdoor beds crossfade over roughly a second, and SceneTime softly reduces outside activity in the evening/night.
- `world-feedback.ts` observes local state at 5 Hz. It maintains two shared-noise ambience beds, at most three nearby vehicle engines with tire layers, and one occasional nearby NPC chatter cue. Vehicle gains follow distance and fade to silence; trucks have a lower engine pitch. The traffic follow-up adds distinct motorcycle engines and audible idle alongside cars/trucks.
- Footsteps use measured grounded displacement, randomized stride/pitch and asphalt, concrete, tile or warehouse timbres. They do not follow the commanded animation speed. Zero-displacement render frames between mobile physics ticks preserve accumulated travel; actual stopping, seating, jumping and control locks stop steps.
- Cashier scan/receipt cues are rate-limited during existing WORK animation. Carton, tape and trolley cues attach to existing warehouse pick/place, packing and handover transitions. Conversation still pauses and turns the NPC through the existing behavior code.
- Existing bench anchors/Sit animation are retained. Walking/jumping are disabled while seated; F or the reachable mobile Berdiri action stands the player clear of the bench collider. Nearby actors cannot replace the seated exit prompt.
- Cart inspection and front pickup information join the existing promo, directory and loading interactions. Context buttons have subtle press feedback; cashier and NPC interactions emit a short cue. The open entrance gets a quiet arrival tone without adding a door.

## Assets and budgets

All new sounds are procedural placeholders. `sound-palette.ts` is the replacement adapter for interaction, abstract greeting, barcode, receipt, carton, tape, trolley and entrance samples. `world-feedback.ts` owns the replaceable ambience/engine loop recipes; `sfx.ts` owns footstep timbres. Replace these with licensed retail/city recordings after listening on target devices. No external audio downloads or large uncompressed assets were introduced.

New one-shots are capped at six simultaneous voices, loops at eight, and noise buffers are reused. Sources disconnect when finished, on world unmount, or when the tab becomes hidden. Existing synthesized music pads now use four bounded voices to leave room for world feedback. Audio stays local: there are no new Realtime audio events or changes to vehicle authority.

## Validation

- TypeScript `npx tsc --noEmit`, ESLint on changed source files, production build.
- `node scripts/check-world-feedback.mjs`: route zones, surface selection, distance attenuation, stationary/airborne/teleport/frame-stall footstep guards.
- Existing state protocol, road network and traffic collision checks.
- Actual world/controllers/HUD in headless Chrome, desktop and mobile touch emulation: no context before gesture, unlock, walk through entrance, moving/stopped footsteps, route zone probes using the canonical rigid body, bench sit/stand, movement blocked while seated, NPC conversation pause, mute persistence, hidden/visible audio suspension and resume. No browser exceptions.
- Actual Web Audio vehicle output measured near a moving vehicle and beyond activation range; near signal fades to silence. The measurement isolates the listener from other traffic.
- Existing two-tab local transport regression: canonical profile save/reload/remote update/reconnect, single vehicle authority, shared routes/positions, blocked recovery, despawn/respawn and stale snapshot rejection.
- Mobile layout checks at 390×844, 390×650, 844×390 and 390×400. Audio popup stacking corrected after screenshot review; scrollable in short viewports.

The browser harness substitutes authentication/database/Realtime with a local fixture. It does not verify a live Supabase deployment. Mobile checks use Chrome emulation, not physical iOS Safari/Android devices. Visibility was exercised with the visibility event/property fixture. Listening quality and a fully continuous walk through every route segment remain human device QA; route zone probes used controlled repositioning after walking through the entrance.

Local browser scripts/screenshots are under `/tmp/toko-time-qa/audio*`; the reusable pre-existing transport fixture is under `/tmp/toko-stabilization-fixture`. They are not shipped with the app.

## Device listening route

Spawn → crosswalk → entrance → retail → cashier → warehouse → front pickup → sidewalk → bench. Listen for smooth outside/inside fading and floor changes, restrained intermittent operations, a single nearby chatter cue, passing engines, and immediate interaction feedback. Verify stop/jump silence, F/tap stand, all-category mute/unmute, background/foreground and mobile controls on a real device.


## Traffic density and audible engines follow-up

- Shared fleet now has 21 cars, 11 moving motorcycles with batched helmeted riders, plus the existing delivery entity. All quality tiers use the same 33 snapshot IDs; host election and the 8 Hz snapshot channel are preserved.
- Approved route geometry is unchanged. Ambient vehicles use a shorter active window between remote ±180 m anchors, with a 250 ms recycle delay, road/spawn clearance, and local/remote observer-distance checks. Initial phases cover the full window rather than creating one convoy followed by an empty street.
- Host-only FIFO junction admission prevents opposing approaches from locking each other. Existing overlap braking remains active. Queuing/yielding is intentional and does not trigger the mechanical-stall despawn watchdog.
- Motorcycle overlap/collider dimensions match the narrower model. Existing player hit reaction remains the moderate car reaction.
- Engine harmonics now extend into the range small phone speakers reproduce; engine types use different pitch/RPM ranges. A tire-noise layer follows movement speed, idle remains quieter, and range is 36 m. The HUD has a Kendaraan slider. Brake cues are distance-attenuated and rate-limited so dense traffic does not spam global brake noise.
- `node scripts/check-traffic-fleet.mjs`: shared roster, car/motorcycle counts, shortened safe route anchors, motorcycle footprint, junction queue release and handoff clearance.
- Two actual rendered clients with the local transport fixture agreed on all 33 entities, authority and vehicle positions. Mobile rendered the same motorcycles and vehicle-volume control without browser exceptions.
- Accelerated six-minute simulation: all 32 ambient vehicles recycled, no sampled empty-front-road interval, peak 17 vehicles in the 120 m front-road span, 13 moving at the final sample, and no observed recycling pop within 160 m of the player. This is congestion with continuing flow, not an intentionally frozen traffic jam.
- Actual Web Audio near-vehicle RMS was ~0.035 and fell to zero outside range. Phone speaker listening remains a physical-device check; sounds are still procedural placeholders.

Traffic follow-up screenshots and scripts are `/tmp/toko-time-qa/dense-traffic*` and `/tmp/toko-time-qa/traffic-photo.mjs`.

## Quieter speed-based sound and exhaust refinement

The previous moving/idle volume switch is replaced by continuous speed curves in `vehicle-sound.ts`. Engine gain now ranges from 0.004 idle to 0.034 at 6.5 m/s (previous moving gain: 0.12), with a softer triangle waveform. Pitch and filter brightness track speed with 200 ms smoothing; tire gain follows speed squared and is zero when stopped. Nearby voices share a crowd gain budget so a queue does not multiply loudness. Saved volume preferences are preserved.

Measured near-car Web Audio RMS: idle ~0.0015, 4 m/s ~0.0081, 6.5 m/s ~0.0123; outside range zero. Speed-curve tests cover creeping without a volume jump, stationary tires, invalid/negative speed and upper bounds.

`VehicleExhaust.tsx` adds a single pooled point-sprite draw call, capped at 48 particles on desktop/24 on mobile and six/four nearby emitters. Soft grey puffs emerge at the modeled tailpipes, rise and fade over 1.3 seconds, and remain in world space as vehicles move away. Emission checks run about twice per second; only the small fixed particle pool updates each rendered frame. Hidden tabs clear the puffs. No changes to scene fog, traffic routes, physics or multiplayer state.

Desktop/mobile browser checks verified live particles, opacity at most 0.12, disabled depth writes and no shader/browser errors. Screenshots: `/tmp/toko-time-qa/exhaust-false.png` and `exhaust-true.png`. Audio speed measurement: `/tmp/toko-time-qa/audio-speed.mjs`. Physical phone listening remains unverified.
