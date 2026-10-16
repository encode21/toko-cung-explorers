import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createExplorerRig, EXPLORER_SCALE } from "../../../src/game/avatar/explorer-rig";
import { DEFAULT_EXPLORER } from "../../../src/identity/explorer";
import { createJumpClips, jumpBlendSeconds } from "../../../src/game/avatar/jump-clips";
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
document.body.append(renderer.domElement);
const scene = new T.Scene();
scene.background = new T.Color("#d8edf0");
const camera = new T.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
camera.position.set(2.6, 2.3, 5.4);
camera.lookAt(0, 1.3, 0);
scene.add(new T.HemisphereLight("#eff4ff", "#59607c", 2.7));
const light = new T.DirectionalLight("#ffe5c2", 3);
light.position.set(1, 5, 4);
scene.add(light);
scene.add(new T.GridHelper(12, 24, "#a6c6ad", "#b8d5d7"));
const loader = new GLTFLoader();
const [base, explorer] = await Promise.all([
  loader.loadAsync("/assets/characters/base-avatar-v2.glb"),
  loader.loadAsync("/assets/characters/toko-cung-explorer.glb"),
]);
base.scene.traverse((o) => {
  if (o instanceof T.Mesh) {
    if (o.name.startsWith("Hair_")) o.visible = o.name === "Hair_sidepart";
    else if (
      /^(Outfit_|Accessory_|Cosmetic_)/.test(o.name) ||
      ["Badge", "TalkMouth", "Teeth", "BlinkLeft", "BlinkRight"].includes(o.name)
    )
      o.visible = false;
  }
});
const rig = createExplorerRig(explorer.scene, []);
rig.apply({ ...DEFAULT_EXPLORER, headwear: "none", back: "none" });
const roots = [base.scene, rig.scene];
const placements = roots.map((root, i) => {
  const group = new T.Group();
  group.position.x = i === 0 ? -0.8 : 0.8;
  if (i === 1) group.scale.setScalar(EXPLORER_SCALE);
  group.add(root);
  scene.add(group);
  return group;
});
const mixers = roots.map((root) => new T.AnimationMixer(root));
const clips = [base.animations, explorer.animations].map((original, i) => [
  ...original.filter((c) => c.name !== "Jump"),
  ...createJumpClips(i === 1),
]);
const phases = [
  ["Walk", 0.3],
  ["JumpAnticipation", 0.06],
  ["Jump", 0.34],
  ["JumpFall", 0.3],
  ["JumpLand", 0.14],
  ["Walk", 0.3],
] as const;
function seek(t: number) {
  mixers.forEach((mixer, i) => {
    mixer.stopAllAction();
    mixer.time = 0;
    let remaining = t;
    let previous: T.AnimationAction | undefined;
    for (const [name, duration] of phases) {
      const action = mixer
        .clipAction(clips[i]!.find((c) => c.name === name)!)
        .reset()
        .setEffectiveWeight(1)
        .play();
      action.setLoop(name === "Walk" ? T.LoopRepeat : T.LoopOnce, name === "Walk" ? Infinity : 1);
      action.clampWhenFinished = true;
      if (previous)
        action.crossFadeFrom(previous, jumpBlendSeconds(name, previous.getClip().name), false);
      const advance = Math.min(remaining, duration);
      const frames = Math.ceil(advance * 120);
      for (let f = 0; f < frames; f++) mixer.update(advance / frames);
      remaining -= advance;
      if (remaining <= 1e-6) break;
      previous = action;
    }
    // Same existing 6.4m/s impulse and 20m/s² gravity, visual trajectory only in this fixture.
    const airTime = T.MathUtils.clamp(t - 0.36, 0, 0.64);
    placements[i]!.position.y = Math.max(0, 6.4 * airTime - 10 * airTime ** 2);
  });
  document.getElementById("label")!.textContent = `Base / Explorer · jump ${t.toFixed(3)}s`;
  renderer.render(scene, camera);
}
Object.assign(window, { jumpPreview: { ready: true, seek } });
seek(0);
