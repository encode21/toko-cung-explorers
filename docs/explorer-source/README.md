# Toko Cung — Explorer character

An original, friendly stylized 3D explorer: rounded proportions, soft adventure cap, red jacket, cream scarf, hiking boots, compass pin, and a small sage backpack with a rolled blanket. This is actual mesh geometry viewed from any angle, not a PNG billboard. Red and gold are provisional, editable colors, not an assertion of official brand guidelines.

## Included
- `toko-cung-explorer.glb`: ready-to-import binary glTF with Idle and Walk animations.
- `ExplorerCharacter.js`: editable Three.js factory, palette controls, animation API, disposal.
- `index.html` + `viewer.js`: responsive orbit viewer, animation switches, jacket color picker, GLB export.
- `explorer-preview.png`: studio render of the actual exported mesh.
- `test.mjs`, `export-glb.mjs`: geometry/animation tests and reproducible GLB export.
- A minimal vendored Three.js runtime in `node_modules/three`, pinned to 0.180.0, with its MIT license.

## Open the viewer
From this extracted folder, run `python3 -m http.server 8080`, then open http://localhost:8080 in a modern browser with WebGL 2. Double-clicking the HTML via `file://` will not work reliably for JavaScript modules. The bundled viewer does not need a CDN or a network connection. Alternatively, `npm ci` installs the full pinned dependency, and `npm start` starts the same Python server.

## Three.js integration
Install `three@0.180.0` in your app and copy `ExplorerCharacter.js` into your source folder:

```js
import { createExplorer } from './ExplorerCharacter.js';
const explorer = createExplorer({
  scale: 1,
  palette: { jacket: '#b92025', trim: '#c0a062' }
});
scene.add(explorer.root);
// Inside your existing render loop; deltaSeconds is elapsed time in seconds:
explorer.update(deltaSeconds);
// On a movement state change:
explorer.setAnimation('walk'); // or 'idle'; 0.25s transition by default
// On unmount:
explorer.dispose();
```

Use `explorer.root.position` / `.rotation` to place and steer the character. The exported walk is in-place, so your application handles world movement and collisions. For React Three Fiber, create the object once with `useMemo`, add it through `<primitive object={explorer.root} />`, call `update(delta)` from `useFrame`, and dispose on unmount. Do not create a second WebGL renderer inside an existing Three.js or R3F application.

## Load the GLB instead

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';
const gltf = await new GLTFLoader().loadAsync('/models/toko-cung-explorer.glb');
scene.add(gltf.scene);
const mixer = new AnimationMixer(gltf.scene);
mixer.clipAction(gltf.animations.find(clip => clip.name === 'Idle')).play();
// Every frame:
mixer.update(deltaSeconds);
```

## Design and customization
The model is approximately 2.45 units high. +Y is up and +Z is forward; the sole sits approximately at ground level. Configure `skin`, `hair`, `jacket`, `trim`, `shirt`, `pants`, `boots`, `pack`, and `eyes` on creation or through `setPalette`. Every part is fully dimensional. There are no texture downloads, external images, or font dependencies. Materials are standard metallic/roughness-compatible surfaces.

Rigging is a hierarchy of named rigid pivots (head, shoulders, elbows, hips, knees), not a skinned humanoid skeleton. Animation clips are baked quaternion/position tracks and survive GLB export. This is suitable for a mascot, website scene, and simple in-place motion. It is not production human anatomy, Mixamo-compatible skinning, or a facial blendshape rig. The torso and limbs are separate meshes by design.

## Performance
66 meshes, 32,942 triangles, 9 materials; the exported GLB is about 264 KiB. Geometries and materials are reused internally. The viewer caps device pixel ratio at 2. Shadows and many draw calls still cost GPU time; benchmark on your target phones, reduce shadow resolution, and consider merging non-animated parts or instancing for crowds. This asset is intended for a single hero character rather than hundreds of NPCs.

## Accessibility and motion
The viewer uses labeled native controls and keyboard focus styles. It starts static for `prefers-reduced-motion`; choosing an animation explicitly starts motion. Drag to orbit, scroll/pinch to zoom, and use Reset view to recover the framing.

## Verification
`npm test` validates finite geometry, bounds, clip validity, switching Walk/Idle, palette mutation, and input validation. `node export-glb.mjs` exports and round-trips the file through GLTFLoader, checking both animation clips. An offline Blender render inspects the exported geometry. The interactive browser viewer was not end-to-end tested in this execution environment because browser launch/local navigation was restricted. No integration into the existing Lovable project or deployment was performed.

Official API references: https://threejs.org/docs/pages/CapsuleGeometry.html and https://threejs.org/docs/pages/GLTFExporter.html . These are live documentation pages; the supplied runtime is pinned to 0.180.0.

## License
The original character geometry and project source are provided for your use and modification. Third-party Three.js code retains the included MIT license in `node_modules/three/LICENSE`.
