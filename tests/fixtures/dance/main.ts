import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createExplorerRig, EXPLORER_SCALE } from "../../../src/game/avatar/explorer-rig";
import { DEFAULT_EXPLORER } from "../../../src/identity/explorer";
import { createDanceClips } from "../../../src/game/club/dance-clips";
import { DANCES, DANCE_LABELS, type DanceId } from "../../../src/game/club/model";
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.append(renderer.domElement);
const scene = new T.Scene();
scene.background = new T.Color("#171b29");
const camera = new T.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 100);
camera.position.set(3, 2.6, 6);
camera.lookAt(0, 0.9, 0);
scene.add(new T.HemisphereLight("#eff4ff", "#59607c", 2.7));
const light = new T.DirectionalLight("#ffe5c2", 3);
light.position.set(1, 5, 4);
scene.add(light);
scene.add(new T.GridHelper(12, 24, "#8b6dcd", "#38364c"));
const loader = new GLTFLoader();
const [baseAsset, explorerAsset] = await Promise.all([
  loader.loadAsync("/assets/characters/base-avatar-v2.glb"),
  loader.loadAsync("/assets/characters/toko-cung-explorer.glb"),
]);
const base = baseAsset.scene;
base.traverse((o) => {
  if (o instanceof T.Mesh) {
    if (o.name.startsWith("Hair_")) o.visible = o.name === "Hair_sidepart";
    else if (
      /^(Outfit_|Accessory_|Cosmetic_)/.test(o.name) ||
      ["Badge", "TalkMouth", "Teeth", "BlinkLeft", "BlinkRight"].includes(o.name)
    )
      o.visible = false;
  }
});
const rigid = createExplorerRig(explorerAsset.scene, []);
rigid.apply({ ...DEFAULT_EXPLORER, headwear: "none", back: "none" });
const roots = [base, rigid.scene];
roots.forEach((root, i) => {
  const placement = new T.Group();
  placement.position.x = i === 0 ? -0.8 : 0.8;
  if (i === 1) placement.scale.setScalar(EXPLORER_SCALE);
  placement.add(root);
  scene.add(placement);
});
const mixers = roots.map((root) => new T.AnimationMixer(root));
let selected: DanceId = "bounce";
let paused = false;
function select(id: DanceId) {
  selected = id;
  mixers.forEach((m, i) => {
    m.stopAllAction();
    m.clipAction(createDanceClips(i === 1).find((c) => c.name === "Dance_" + id)!).play();
  });
  document.getElementById("label")!.textContent = DANCE_LABELS[id] + " · Base / Explorer";
}
for (const id of DANCES) {
  const b = document.createElement("button");
  b.textContent = DANCE_LABELS[id];
  b.onclick = () => select(id);
  document.getElementById("buttons")!.append(b);
}
select(selected);
Object.assign(window, {
  dancePreview: {
    select,
    seek: (t: number) => {
      paused = true;
      mixers.forEach((m) => m.setTime(t));
      renderer.render(scene, camera);
    },
    ready: true,
  },
});
let last = performance.now();
function frame(now: number) {
  if (!paused) mixers.forEach((m) => m.update(Math.min((now - last) / 1000, 0.05)));
  last = now;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
