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
