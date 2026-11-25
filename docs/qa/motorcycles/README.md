# Motorcycles, dealer and driving controls — 25 November 2026

`preview.png` and the three PNGs under `public/assets/vehicles/dealer` are captures of the production `VehicleModel`, using the same geometry, materials and wheel/seat anchors as the game. Green Skupi, red PZX and graphite Kawazaki ZX20 follow the supplied photo references. Rear views are included here. Approved car bodies were not redesigned.

Verified locally:

- Backend: 50 tests across WorldMobility, WorldOjek and WorldGarasi. Names, saved ownership IDs, prices, fare percentages, summons (including old-client fallback), two public shop bikes, safe one-time slot relocation, NPC payout and player-ride completion with the sports motorcycle.
- Frontend: 10 focused vehicle/catalog/audio tests; child/adult grip test; both avatar rigs, every seat and headwear fit/grip check.
- `check-motorcycles-browser.mjs`: three production models and dealer thumbnails, no page errors.
- `QA_DEALER_ONLY=1 node scripts/check-ojek-phone-browser.mjs`: actual phone UI at 667×375, 844×390 and 1280×720; loaded thumbnails, new dealer/Motorku names, ownership/upgrade labels and no horizontal overflow.
- `QA_MOTORS_ONLY=1 WORLD_QA_BACKEND=/absolute/path/to/toko-cung node scripts/check-vehicles-browser.mjs`: actual Player/Rapier/HUD and Laravel mobility, two synthetic players. Both shop bikes accept driver + consenting passenger, drive more than 2 m out of their bays and allow party exit. The sports bike drives, steers and stops using real touch events.
- Driving controls: three-finger gas + steering + horn (actual broadcast observed); reverse + steering + horn; brake priority while gas stays held; independent release; two fingers on one pedal; touchcancel and blur reset. Gas/brake/reverse/horn/exit/gauge have non-overlapping bounds at 667×390, 844×390 and 1280×720. Numeric evidence in `driving/report.json`; parking evidence in `driving/parking.json`.
- TypeScript, focused ESLint, production build and diff whitespace checks pass. Existing chunk-size/dynamic-import and Three/Rapier deprecation warnings remain.

The browser harness uses temporary SQLite and synthetic identities, never production accounts. These checks do not certify physical iOS/Android devices or production network latency. No deployment performed. Release backend/config first, then frontend; no new migration.
