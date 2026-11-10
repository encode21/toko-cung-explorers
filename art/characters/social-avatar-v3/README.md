# Social Avatar V3

An original Blender character concept for Toko Cung, combining rounded social-game proportions with a casual fashion outfit. Created independently from both existing character bases; no third-party character mesh, downloaded texture, or game asset was used.

The character has a swept cocoa bob, hazel eyes, a lagoon jacket over an oat T-shirt, apricot shorts, cream sneakers, and a plum backpack. Materials, skinning, geometry, lighting, camera, and demonstration animations are editable in the Blender file.

## Open and review

- [Editable Blender project](social-avatar-v3.blend)
- [Hero preview](hero.png)
- [Front](front.png), [side](side.png), [back](back.png), [wave pose](wave.png)
- [Binary glTF export](../../../public/assets/characters/social-avatar-v3.glb)
- [Build statistics](asset-report.json)
- [Export validation](validation-report.json)

Open `social-avatar-v3.blend` in Blender. The viewport starts at the presentation camera with the rig selected. Press Space to play the active Idle action. In the Dope Sheet's Action Editor, select `Wave` to inspect the second action; its range is frames 1–60. Idle uses frames 1–90 at 30 fps. The NLA reference tracks are muted so they do not double up with the active action.

The character and studio occupy separate named collections. Mesh islands are grouped by material for fewer runtime draw calls. In Edit Mode, hover a piece and use Select Linked (`L`) to select it. Bone names and weights remain editable on those meshes.

## Scope and compatibility

This is a separate art version, not a replacement installed in the game. The build never modifies `base-avatar-v2.glb`, `toko-cung-explorer.glb`, either live avatar component, profile data, wardrobe ownership, or player transforms.

- Blender coordinates: metres, Z up, facing −Y, soles approximately z=0.001.
- Export coordinates: metres, Y up, facing +Z, scale 1, crown approximately 1.738 m.
- Twenty humanoid bones, normalized skin weights, separately named materials.
- Included clips: `Idle` and `Wave`, with no root motion.
- The GLB contains only the character, rig, materials, and animation. Presentation floor, plinth, lights, and camera stay in the `.blend`.

This rig has its own bind pose and bone axes. Matching the V2 bone names does not make it a drop-in replacement. Connecting it to the game requires a separate renderer and animation/wardrobe adaptation. The current deliverable is a reviewable rigged concept: it does not include locomotion clips, facial blend shapes, a texture atlas, production UV layout, or crowd LODs. Existing primitive UVs are not a finished paint layout. Geometry and material counts are recorded in the reports rather than presented as a mobile performance guarantee.

## Full-body gameplay adaptation — 10 November 2026

The active player loads `social-avatar-v3-customizable.glb`, built separately with:

```sh
node art/characters/social-avatar-v3/build-explorer.mjs
```

This replaces the earlier face-only adaptation. The authored V3 face, torso, hands,
shoes and skinned sleeves are fitted to a narrower body with longer legs. Continuous
skinned trousers, a rounded navy/gold cap, fringe, collar and buttons complete the
selected outfit. The existing 41 wardrobe IDs, palette, silhouette choices and profile
storage remain usable; source concept colors/hair do not overwrite saved appearance.

`full-body.mjs` converts Explorer pivots to bones and fits the complete wardrobe. It
retains the 44 gameplay clips' local joint rotations, then samples body height at 60 Hz
to preserve foot support, or hip height for seated/swimming/flying poses. Rebuild the
asset whenever gameplay clips or wardrobe generation changes, because this GLB contains
those fitted clips and garments. The canonical root, controller, physics and effects
continue through the existing components.

`EXPLORER_URL` selects the full-body asset for local/remote players, the appearance
editor and portrait sheet. NPCs and equipped special characters retain their renderer.
Instances share geometry but own their cloned materials and skeletons. The export is
approximately 9.15 MiB, with no texture downloads. Its new filename avoids reusing the
earlier face-only cached GLB. Mobile-browser functional checks are not a physical-device
performance guarantee; no database migration is needed.

See [gameplay QA](../../../docs/qa/social-avatar-v3/README.md) for actual renders and checks.
Rollback changes only `EXPLORER_URL` back to `/assets/characters/toko-cung-explorer.glb`.
The original V3 GLB and Blender project remain editable concept sources.

## Character customization — 10 November 2026

The final gameplay asset follows the user's social-game references with smaller cartoon eyes,
compact ears and a fitted scalp surface. `customization.mjs` adds eight hair styles, four
expressions and garment morphs for slim/heavy/muscular builds and feminine proportions.
The underlying head and wardrobe remain original project geometry.

`AvatarConfig.hair` and `expression` are reused, preserving previous saved choices.
`ExplorerAppearance` version 2 adds optional-compatible gender (`male`/`female`), age
(`child`/`adult`) and build (`regular`/`slim`/`heavy`/`muscular`). Old profiles default to
male/adult/regular. These are visual character presets, not account demographics.
All hairstyles and garments are independent of gender. Selecting hair removes covering
headwear; headwear can be equipped again. A mini crown keeps the scalp visible.

`explorer-look.ts` applies morph weights independently per instance. Children use an internal
0.8 visual scale and a proportionally larger head; physics/network roots remain unchanged.
The pose update keeps sitting/swimming hip height and moves child drivers forward on the
seat to preserve steering reach. Call it after the animation mixer, before ride/selfie IK.

The editor groups illustrated circular choices into Tubuh/Rambut/Wajah/Warna, with one
live profile draft, confirmed save and reset. Backend `WorldController` must be deployed
before or together with the frontend because it now accepts the three added enum fields.
No database migration is required. Deploying only the frontend to an old backend makes
profile save reject the added fields. Rebuild the GLB after editing the generator.

## Rebuild

From the repository root, using the installed Blender application:

```sh
/Applications/Blender.app/Contents/MacOS/Blender \
  --background --factory-startup \
  --python art/characters/social-avatar-v3/build.py \
  -- --render all --samples 48

node scripts/check-social-avatar-v3.mjs \
  > art/characters/social-avatar-v3/validation-report.json
```

Use `--render none` to rebuild the source and export without images, or `--render hero` for the hero view alone. Rebuilding overwrites only this version's generated files. For hand edits, save a separate copy before rebuilding.

The standalone validator loads the exported GLB with Three.js and checks finite positions/normals/transforms, valid triangles and skin indices, normalized weights, expected bones, dimensions, studio exclusion, and nine deformation samples per animation. It also checks that the root's position, rotation, and scale remain unchanged during playback. No live-game files are imported by this check.

## Hair restyle and hats — 10 November 2026

`hair.mjs` replaces the helmet-like shells: each of the eight styles is a thin fitted cap plus
chunky tapered locks sampled on the head surface. Every style exports three meshes: the cap
(always visible, so no hat exposes skin), the full locks (hidden under covering hats) and the
locks that fit below a brim (shown only under covering hats). Covering hats are `CROWN_HATS`
except `mini-crown`. Seven accessories were added (catalog 48); the backend enum lists in
`WorldController.php` must deploy first. Visual QA: `node scripts/check-hair-browser.mjs`
writes sheets to `docs/qa/social-avatar-v3/hair/`; `WARDROBE_THUMBS=id,id` also writes shop
thumbnails.
