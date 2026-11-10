// Contact sheet of head close-ups: one rig rendered into a grid of viewports.
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createExplorerRig, EXPLORER_URL } from "../../../src/game/avatar/explorer-rig";
import { explorerClips } from "../../../src/game/avatar/explorer-clips";
import { DEFAULT_EXPLORER, normalizeExplorer } from "../../../src/identity/explorer";

const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.autoClear = false;
document.body.append(renderer.domElement);
const scene = new T.Scene();
scene.add(new T.HemisphereLight("#eef6ff", "#baa58d", 2));
const key = new T.DirectionalLight("#ffffff", 2);
scene.add(key);
const loader = new GLTFLoader();
const [asset, base] = await Promise.all([
  loader.loadAsync(EXPLORER_URL),
  loader.loadAsync("/assets/characters/base-avatar-v2.glb"),
]);
const rig = createExplorerRig(asset.scene, explorerClips(asset.animations, base.animations));
scene.add(rig.scene);
rig.actions.get("Idle")!.play();
rig.mixer.update(0.2);
const camera = new T.PerspectiveCamera(30, 1, 0.1, 30);
type Cell = Record<string, string | number>;
Object.assign(window, {
  hairSheet: {
    ready: true,
    render(cells: Cell[], columns: number, background = "#a99088") {
      const size = Math.floor(innerWidth / columns);
      renderer.setScissorTest(false);
      renderer.setClearColor(background);
      renderer.clear();
      renderer.setScissorTest(true);
      cells.forEach((cell, i) => {
        rig.apply(
          normalizeExplorer({
            ...DEFAULT_EXPLORER,
            headwear: "none",
            back: "none",
            ...cell,
            colors: { ...DEFAULT_EXPLORER.colors, hair: "#6b4630", skin: "#eac09a" },
          }),
          false,
          { hair: (cell.hair ?? "short") as "short", expression: "smile" },
        );
        rig.updateProportions("Idle");
        scene.updateMatrixWorld(true);
        const target = rig.scene.getObjectByName("Head")!.getWorldPosition(new T.Vector3());
        target.y += 0.06;
        const angle = (Number(cell.angle ?? 0) * Math.PI) / 180;
        camera.position
          .copy(target)
          .add(
            new T.Vector3(Math.sin(angle) * 2.4, Number(cell.height ?? 0.3), Math.cos(angle) * 2.4),
          );
        camera.lookAt(target);
        key.position.copy(camera.position).add(new T.Vector3(1.5, 2.5, 0.5));
        const x = (i % columns) * size,
          y = innerHeight - (Math.floor(i / columns) + 1) * size;
        renderer.setViewport(x, y, size, size);
        renderer.setScissor(x, y, size, size);
        renderer.render(scene, camera);
      });
    },
  },
});
