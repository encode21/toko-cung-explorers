# Social Avatar V3 customization — 10 November 2026

The final asset `social-avatar-v3-customizable.glb` replaces the initial face-only and then
full-body prototypes. It follows the user's supplied social-game references: small cartoon
eyes, compact ears, a fitted hair shell, clear body silhouettes and illustrated circular
editor choices. Outfit colors and all 41 wardrobe choices remain supported.

## Actual renders

- [Editor: hair](editor/hair-1280x720.png), [body](editor/body-1280x720.png), [face on mobile](editor/face-740x360.png)
- [Short hair](hair-short.png), [bob + grin](hair-bob.png), [ponytail + wink](hair-ponytail.png), [hijab + calm](hair-hijab.png)
- [Child](body-child.png), [heavy](body-heavy.png), [muscular](body-muscular.png), [slim](body-slim.png)
- [Original/current model](Idle.png), [wave](Wave.png), [run](Run.png), [jump](Jump.png), [sit](Sit.png), [swim](Swim.png), [driving](RideDrive.png), [dance](Dance_sway.png)

These are Three.js/game-component renders, not generated concept images.

## Verification

- **33 focused frontend tests passed**: `node --test tests/social-avatar-gameplay.test.mjs tests/avatar.test.mjs tests/explorer-rig.test.mjs tests/wardrobe.test.mjs tests/jump-animation.test.mjs tests/jump-remote.test.mjs tests/flight-animation.test.mjs tests/running-fishing.test.mjs`.
- The avatar checks cover all 16 combinations of gender/age/build across 44 animation clips,
  finite transforms, fixed canonical root, normalized skin weights, independent instance
  materials/skeletons/morphs, all 41 wardrobe IDs and palette/silhouette restoration.
- Hair checks cover all eight styles and raycast the scalp to catch skin intersections;
  full hats hide crown hair while a mini crown retains it. All four expressions select the
  expected mouth and eye states. Child/adult seated/swimming hip height agrees and both
  hands reach every vehicle driver's grips within the existing 0.1m fit tolerance.
- `node scripts/check-social-avatar-gameplay-browser.mjs`: **44 animations rendered without
  browser errors**, plus hair/expression/body screenshots above.
- `HUD_QA_OUTPUT=docs/qa/social-avatar-v3/editor node scripts/check-wardrobe-browser.mjs`:
  **passed at 667×375, 740×360, 844×390 and 1280×720**. Real appearance components, synthetic
  transport: hair/expression/body choices, removing a hat, save/reload persistence, reset,
  purchase ownership/retry and cancel. Circular color targets and choice buttons are 44px
  or larger; category navigation remains available while scrolling.
- Backend: `php artisan test --filter='test_avatar_body_choices_are_validated_saved_and_public|test_explorer_appearance_is_validated_persisted_and_publicly_projected'`:
  **2 passed**. All 16 combinations save and project publicly, invalid enums are rejected,
  and old profiles remain compatible. Uses the isolated SQLite test database.
- `node scripts/check-selfie-stick.mjs` and `node scripts/check-vehicle-fit.mjs`: **passed**;
  selfie grip/phone clearance/pose restoration and all vehicle seats/headwear/transitions.
- `EFFECTS_QA_OUTPUT=docs/qa/social-avatar-v3/effects node scripts/check-cartoon-effects.mjs`:
  **passed** two real player-avatar components; jump/landing puffs, splash, dry stop, bounded
  particle pool, reduced motion, mute and zero SFX. [Report](effects/effects.json).
- `SWIM_QA_OUTPUT=docs/qa/social-avatar-v3/swimming node scripts/check-swimming-browser.mjs`:
  **passed desktop/mobile landscape** with Player/Rapier/HUD; dry/shallow/deep water,
  buoyancy, paddle, pier and exits. [Report](swimming/report.json).
- TypeScript, lint of the six edited/new appearance modules and frontend build **passed**.
  Existing Vite chunk-size warnings remain. The previously recorded whitespace lint issue
  in `explorer-clips.ts` is unchanged.
- [Obby report](obby/report.json) records the preceding full-body phase; the full course
  was not rerun for the subsequent customization-only changes.

## Rollout and limits

The final GLB is 9,591,668 bytes (~9.15 MiB), without texture downloads. The new filename
avoids cached prototype models. Geometry and morph buffers are shared between instances.
Backend validation must roll out before/with the frontend; no DB migration is needed.
Body choices change visual appearance only, preserving movement speed and physics roots.
No commit, push or deployment performed. Browser emulation does not establish physical-phone
performance or production multiplayer behavior.
