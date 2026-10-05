# Toko Cung Base Avatar V2

## What changed and why

The previous live avatar was an assembly of stretched spheres/capsules, with independently rotated limb groups, no skeleton, a spherical head and short legs. The unused legacy `Character.tsx` GLB utility also used a pack-specific `2.2` scale, incompatible with the procedural avatar's scale-one contract. The CSS editor preview was yet another representation. These were architectural/shape problems, not a lack of decorative detail.

The active player, static/wandering NPCs, warehouse/packing staff, remote players and live editor now use **BaseAvatarV2**. The old `ChibiAvatar` export is only a compatibility adapter, not another body implementation. The legacy generic `Character` loader remains unused. Nothing changes server-authoritative roles, collectible ownership, the appearance draft, canonical player transforms, controller, capsule collider, network coordinates, HUD or shopping routes.

## Original model and contract

- Runtime asset: `public/assets/characters/base-avatar-v2.glb` (681,568 bytes).
- Original project-authored mesh, not a re-used Kenney/Roblox/Minecraft character. No external character asset is required to run V2.
- Deterministic authoring source: `src/game/avatar/avatar-source.ts`. It constructs closed beveled cross-section surfaces, assigns skin weights, merges compatible surfaces, creates bones and animation clips, then exports a real skinned binary glTF. No BoxGeometry/SphereGeometry avatar construction.
- Regenerate with `node --experimental-strip-types scripts/build-avatar.mjs` (Node 22+).
- Same source is the failure fallback, so asset failure does not introduce a different silhouette or rig. Initial GLB loading suspends, rather than flashing another character.
- Metres, +Y up, +Z forward, scale 1, feet-origin. Crown 1.74 m; head approximately 0.40 m; hip approximately 0.73 m. Roles never change dimensions.
- Named material slots: Skin, Top, Bottom, Shoes, Sole, Hair, Ink, Mouth, White, Accent. Roughness 0.7–0.9, metalness zero.
- Named modules: BodySkin/Top/Bottom/Shoes/Soles, Hair_*, Outfit_*, Accessory_*, Badge, flat face marks. Keep these names and the skeleton contract when replacing the asset via `modelUrl`; arbitrary third-party rigs are not automatically retargeted.

## Shared 20-joint skeleton

Root → Hips → Spine → Chest → Neck → Head. Left/Right Shoulder → UpperArm → LowerArm → Hand branch from Chest. Left/Right UpperLeg → LowerLeg → Foot branch from Hips. Torso weights blend Spine/Chest; simplified block limbs articulate at the same anatomical joints for every avatar.

## Animation and grounding

GLB contains Idle, Walk, Run, Talk, Wave, Sit, CarryBox, UsePhone, PickItem, Checkout, Hit, Fall, GetUp. Mixer cross-fades are 0.2 seconds. Idle includes tiny chest/head movement; face marks blink independently. Carry-walk/run compositions retain leg locomotion while holding the arms in the carry pose. Hit/GetUp are one-shots. Vehicle impact phases drive the skeleton instead of tipping the entire player root. Some activity clips are prepared in the viewer but are not yet wired to every possible gameplay interaction.

Player and wandering/remote NPC playback uses measured travel speed, normalized so Walk≈4.2 m/s and Run≈7.4 m/s sit near timeScale 1 (game speed is faster than real stride distance). Warehouse agents use their existing fixed movement speed. Root motion remains controller-owned. Skin-deformed sole vertices provide visual pose grounding. `grounding.ts` accounts for the existing world's visual paving above its flat physics plane, while preserving jumps/impact impulses and all canonical physics/network positions.

## Customization

Existing profiles normalize unchanged. Nine hair/head-covering modules: short, spiky, bob, buns, cap, buzz, sidepart, ponytail, hijab. Existing skin/hair/top colors, expressions, role outfit presets, glasses/headset/scarf and pants/shoe colors apply to one skeleton. Role clothes are cosmetic, not authorization. The existing Koko collectible retains its red/buns identity.

CharacterDesigner renders the exact same GLB using the profile store's live `appearanceDraft`; it does not create another draft or modify the in-world root. Small HUD profile portraits remain lightweight CSS icons, not separate 3D models.

## Developer quality gate

Run `npm run dev` and open `/dev/avatar`. This route throws not-found in production. It renders exactly one hero against neutral surroundings with orbit/zoom, front/side/back presets, all animations, hair, skin, shirt, outfits, silhouette, indoor-light and fallback switches.

Implementation sequence: inspect legacy → test one isolated hero → fix Strict Mode mixer cleanup and pose grounding → migrate only player → check gameplay-distance indoor/outdoor captures → migrate NPCs/remotes/staff/editor → repeat desktop/mobile-emulation checks.

## Performance and verification

- Geometry and GLB download are cached; meshes share geometry, materials share per-avatar slots, all meshes in an avatar share one skeleton palette.
- Faces/accessories are omitted beyond 12 m, distant animation updates run at 15 Hz beyond 24 m, dynamic shadow casting stops beyond 18 m. Fixed conservative skin bounds support frustum culling. This is detail/animation LOD, not a baked impostor or decimated body mesh.
- Simple blob shadow works on the low-quality tier. No new physics engine, per-character lights, post-processing or textures.
- Comparable indoor browser captures: roughly 926 → 565 draw calls and 350,250 → 247,974 rendered triangles during staged migration. These scene snapshots vary with NPC positions and are not FPS guarantees.
- `node --experimental-strip-types --test tests/avatar-rig.test.mjs tests/avatar.test.mjs`: source and shipped GLB skeleton, material, dimensions, weights, clip transforms, hair modules, payload budget, deterministic identity and legacy normalization checks.
- TypeScript check, targeted ESLint and production build passed. Build retains existing large-chunk/deprecation warnings.
- Headless Chrome: front/side/back, all 13 clips, fallback; world entry, shelf/shop interactions, HUD navigation; 390×844 touch-emulated joystick movement, camera rotation and sheet/joystick visibility passed without page errors. Authentication was bypassed only in the local browser fixture, never in app code.

## Remaining art work / honest limits

The shipped rigged GLB is usable now; there is no missing required base-avatar file. It is a first original authored block-avatar, not a hand-sculpted production art pack. Recommended next passes: artist review of silhouettes and skin weights in Blender, hand-keyed feet/stance polish, more distinct garment silhouettes (jackets/shorts/bags), richer expression atlas, and true decimated/impostor LOD for much larger crowds. Current hair/clothes/accessories are simple original mesh modules. Physical mid-range Android/iOS FPS, real multi-user sessions, and authenticated profile-save persistence need device/backend testing; browser emulation does not establish those results.

## Files

New: `src/game/avatar/{avatar-source.ts,BaseAvatarV2.tsx,AvatarViewer.tsx,AvatarPreview.tsx,grounding.ts}`, `scripts/build-avatar.mjs`, `public/assets/characters/base-avatar-v2.glb`, `src/routes/dev.avatar.tsx`, `tests/avatar-rig.test.mjs`, this document.

Modified: `src/game/world/ChibiAvatar.tsx`, `src/game/player/Player.tsx`, `src/game/npc/Npc.tsx`, `src/game/net/RemotePlayers.tsx`, `src/game/simulation/NakamaOps.tsx`, `src/identity/avatar.ts`, `src/ui/profile/CharacterDesigner.tsx`, generated `src/routeTree.gen.ts`.
