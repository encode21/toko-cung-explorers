# Story intro and mobile rendering

The opening follows page 18 of **Toko Cung World Storyline**: Mampang 1965, generations of trust, evolution, and the player's arrival. The historical setting is an artistic interpretation. This work does not add the PDF's proposed quests or rewards.

## Assets and reproduction

`public/assets/intro/` contains four H.264/AAC MP4 clips (1280×720, 30 fps, 10 seconds each), JPEG posters, and `toko-cung-story.mp4`, a subtitled combined review copy. The four playback files total approximately 5.04 MiB. Runtime Indonesian captions are in `src/ui/intro/story.ts`.

The deterministic Three.js stage reuses the project's character, food, furniture, and city GLBs, with custom storefront sets. Original synthesized arpeggios use no sampled music. Existing asset credits still apply. The render stage has no account or multiplayer connection.

```sh
npm ci
npx playwright install chromium webkit
npm run render:intro
```

The render script uses `ffmpeg-static` and Playwright. `INTRO_FONT_PATH` can override the default macOS Arial font for Linux/other hosts. `FFMPEG_PATH`, `PLAYWRIGHT_MODULE`, and `INTRO_RENDER_TEMP` allow local tooling overrides. `INTRO_POSTERS_ONLY=1 npm run render:intro` previews four frames before a full render.

## Account behavior and rollout

Every account, including existing accounts, starts with an unseen intro. The `/world` entry gate prevents lobby, channel/game mounting, and dungeon resume until completion or explicit skip. The intro accepts portrait and landscape; gameplay retains its existing orientation policy. Replay is available in the lobby.

Backend: deploy `2026_10_13_160000_add_world_intro_seen_at.php` and the authenticated `POST /api/world/intro/complete` endpoint in **toko-cung** before releasing the Explorers frontend. Run the normal backend migration workflow. The endpoint derives the user from the session, stores server time once, and leaves profile revisions, roles, ownership and progression untouched. `introSeenAt` is only returned in the private session, not public profiles.

Completion/skip continues immediately. Failed writes are queued under a per-public-account browser key and retried every 15 seconds while the account is active or after reconnect. Cross-device suppression begins after server acknowledgement. Closing a partially watched intro restarts it next time. Replay does not mutate completion.

Rollback: release the previous frontend first; the nullable column and endpoint may remain. Do not drop the column while the new endpoint/frontend remains active. No production migration, push or deployment is performed by the local verification scripts.

## Viewport and render policy

- Dark document background and theme color avoid white exposed canvas edges. The shared viewport tracks visual viewport size/offset, pageshow, visibility and rotation; unchanged measurements do not rewrite styles. Safe-area padding belongs to controls, not the canvas.
- AUTO starts at MEDIUM on mobile. LOW/MEDIUM/HIGH cap DPR at 1/1.25/1.5 and sun shadows at disabled/1024/2048. Antialias remains enabled. Manual selections use the same visual budget.
- Two consecutive six-second windows below 30 FPS trigger a downgrade, with a 20-second cooldown. More than 57 FPS sustained for at least 45 seconds permits an upgrade. Hidden pages, long loading hitches and viewport changes reset the sample.
- Canvas/physics pause while hidden. Interior visuals and distant shadows are culled without removing collision or quest entities. Night fill improves visibility without new point lights.
- Traffic authority selection is cached by roster/connection state. Repeated remote-profile notifications are coalesced into one in-flight request and a latest read. GPU instance buffers and cloned skeletons are disposed without disposing shared GLB assets.
- Event revision history remains intact to preserve stale-event rejection; a growing history alone is not treated as proof of a memory leak.

## Verification commands

```sh
npx tsc --noEmit
npm run build
npm run test:intro
node scripts/check-world-intro-gate.mjs
node scripts/check-render-policy.mjs
npm run test:profile-sync
node scripts/check-entry-browser.mjs
node scripts/check-reactive-world.mjs
node scripts/check-traffic-fleet.mjs
node scripts/check-state-protocol.mjs
node scripts/check-scene-time.mjs
npm run test:mobile-soak
```

Backend: `php vendor/bin/phpunit --filter WorldIntegrationTest` (isolated SQLite).

The soak fixture uses real world geometry, NPCs, traffic, physics and a repeated camera route, with isolated transport. It uses installed Google Chrome and a mobile viewport. It does **not** represent a physical iPhone, actual player movement, live multiplayer, or real channel/dungeon switching. Ten visual-world unmount/remount cycles follow the 30-minute run. Baseline and final comparison use minutes 5–10 and 25–30; the first five minutes are warm-up.

Browser fixtures cover portrait/landscape, size/keyboard-like resizing, restoration, media error, all four clips, skip, replay, account isolation and offline persistence. Actual `/world` component coverage verifies that intro blocks lobby/game mounting and dungeon resume.

## Verification results

- TypeScript and production build passed.
- Chromium and WebKit intro/viewport checks passed, including a screenshot pixel check for visible portrait captions. WebKit required explicit video bounds and composited overlay backfaces to prevent captions from disappearing.
- Real GPU day/night LOW/MEDIUM/HIGH checks passed: DPR 1/1.25/1.5 and ten tier changes without recreating the canvas. Run `node scripts/check-render-tiers.mjs` while the isolated soak fixture serves port 4241.
- Real `/world` gate test passed, including expired-session redirect.
- Existing game UI/HUD browser regression passed: panels, profile/designer, inventory, dialogue, rewards, club, multitouch, orientation and chat.
- Changed-source lint: zero errors and three warnings (Fast Refresh exports and an existing Model memo dependency).
- Entry layout regression passed at 640×360, 740×360, 844×390, 932×430, 1024×768 and 1280×720.
- Profile coalescing, reactive-world, traffic, snapshot protocol and scene-time checks passed.
- Backend integration: 15 tests, 130 assertions passed. Existing PHP vendor deprecation notices are emitted on the host PHP version.
- Broader backend World suite: 66 tests / 406 assertions, one pre-existing failure in `WorldDungeonV2Test::test_discovery_unlocks_secret_and_all_data_driven_routes_complete` (expected 0, actual 1950). Reproduced with the original HEAD `WorldGame.php`; dungeon reward behavior was not changed.
- Combined MP4 decoded successfully, with H.264 video and AAC audio.
- 30-minute soak (Chrome, Apple M3 Pro, MEDIUM, mobile viewport): median 60 FPS in both minutes 5–10 and 25–30; 0% degradation, no browser errors. After warm-up: 459–460 geometries, 21 textures, 31 programs, heap 95–129 MB with garbage collection. Raw evidence: `intro-mobile-qa/soak-30min.json`. This run predates the subsequent unmount-only avatar shadow cleanup.
- Remount investigation: fixed-camera measurement identified 11 leaked CircleGeometry resources per mount. `BaseAvatarV2` had disabled disposal on the entire root, including its locally owned contact shadow. Disposal protection now applies only to the shared rig primitive, allowing the shadow geometry/material to be released. After the fix, ten fixed-camera cycles remained at 445 geometries and 18 textures; programs settled at 32, with zero orphan geometries and zero browser errors (`intro-mobile-qa/remount-after-fix.json`). Before-fix evidence is retained alongside it. TypeScript/build passed again after this cleanup.
- Screenshots and browser/tier reports are retained under `docs/intro-mobile-qa/`.

Physical iPhone Chrome/Safari testing (including browser-toolbar animation, thermal throttling and actual keyboard safe areas), live multiplayer/channel/dungeon cycles, backend migration and deployment remain unverified. A desktop GPU result must not be reported as iPhone FPS.


## Playback fix — 2026-10-14

Reproduced the user's endless “Menyiapkan cerita…” screen with React StrictMode (the TanStack development client uses it): effect cleanup removed the video's source, but the repeated setup did not restore it. Observed `src=null`, `readyState=0`, and `currentTime=0`; the MP4 endpoint itself returned valid 200/206 responses. The original browser fixture had omitted StrictMode.

The media effect now owns both assigning and releasing the source, including retry. Loading that remains pending for 15 seconds exposes Retry/Skip. Chromium and WebKit regression checks now use StrictMode and require actual playback time to advance on initial entry, replay and retry; a simulated pending play promise verifies timeout and recovery. Four-clip completion and account tests still pass. The physical device from the screenshot was not available.
