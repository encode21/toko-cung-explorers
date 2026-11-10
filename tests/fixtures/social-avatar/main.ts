import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  createExplorerRig,
  EXPLORER_SCALE,
  EXPLORER_URL,
} from "../../../src/game/avatar/explorer-rig";
import { explorerClips } from "../../../src/game/avatar/explorer-clips";
import { DEFAULT_EXPLORER, normalizeExplorer } from "../../../src/identity/explorer";
import { WARDROBE } from "../../../src/identity/wardrobe";

const renderer = new T.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
document.body.append(renderer.domElement);
const scene = new T.Scene();
scene.background = new T.Color("#263648");
const camera = new T.PerspectiveCamera(33, innerWidth / innerHeight, 0.1, 30);
camera.position.set(0, 1.15, 4.7);
camera.lookAt(0, 0.91, 0);
scene.add(new T.HemisphereLight("#eef6ff", "#baa58d", 2));
const key = new T.DirectionalLight("#ffffff", 2);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = key.shadow.camera.bottom = -3;
key.shadow.camera.right = key.shadow.camera.top = 3;
key.shadow.bias = -0.0002;
key.position.set(3, 4, 4);
scene.add(key);
const rim = new T.DirectionalLight("#d3e7ff", 0.6);
rim.position.set(-3, 2, -2);
scene.add(rim);
const loader = new GLTFLoader();
const [old, social, base] = await Promise.all([
  loader.loadAsync("/assets/characters/toko-cung-explorer.glb"),
  loader.loadAsync(EXPLORER_URL),
  loader.loadAsync("/assets/characters/base-avatar-v2.glb"),
]);
const set = WARDROBE.find((item) => item.id === "set-streetwear")!;
const appearance = normalizeExplorer({
  ...DEFAULT_EXPLORER,
  ...set.preset,
  colors: { ...DEFAULT_EXPLORER.colors, ...set.colors },
});
const rigs = [old, social].map((asset, i) => {
  const rig = createExplorerRig(asset.scene, explorerClips(asset.animations, base.animations));
  rig.apply(appearance);
  const placement = new T.Group();
  placement.position.x = i ? 0.8 : -0.8;
  placement.rotation.y = -0.12;
  placement.scale.setScalar(EXPLORER_SCALE);
  placement.add(rig.scene);
  scene.add(placement);
  return rig;
});
const floor = new T.Mesh(
  new T.PlaneGeometry(200, 200),
  new T.MeshStandardMaterial({ color: "#263648", roughness: 1 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0.02;
floor.receiveShadow = true;
floor.visible = false;
scene.add(floor);
function seek(name: string, time: number) {
  rigs.forEach((rig) => {
    rig.mixer.stopAllAction();
    rig.actions.get(name)!.reset().play();
    rig.mixer.update(time);
    rig.updateProportions(name);
  });
  const label = document.getElementById("animation");
  if (label) label.textContent = name;
  renderer.render(scene, camera);
}
Object.assign(window, {
  avatarPreview: {
    ready: true,
    seek,
    names: [...rigs[1]!.actions.keys()],
    customize: (config: Record<string, string>, label: string) => {
      rigs[1]!.apply(normalizeExplorer({ ...appearance, headwear: "none", ...config }), false, {
        hair: (config.hair ?? "short") as "short",
        expression: (config.expression ?? "smile") as "smile",
      });
      seek("Idle", 0.2);
      document.querySelector("header")!.textContent = label;
    },
    hero: () => {
      rigs[0]!.scene.visible = false;
      rigs[1]!.scene.parent!.position.x = 0;
      camera.position.set(1.3, 1.2, 3.3);
      camera.lookAt(0, 0.88, 0);
      floor.visible = true;
      document.querySelector("footer")!.style.display = "none";
      seek("Idle", 0.2);
      document.querySelector("header")!.textContent =
        "Social Avatar V3 · model dalam renderer game";
    },
  },
});
seek("Idle", 0.2);
