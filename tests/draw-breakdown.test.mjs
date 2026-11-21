import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { drawBreakdown } from "../src/game/engine/draw-breakdown.ts";

test("groups visible, in-frustum meshes by top-level name and skips hidden/off-screen ones", () => {
  const scene = new T.Scene();
  const city = new T.Group();
  city.name = "CityLocation";
  scene.add(city);
  const box = () => new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial());
  const store = new T.Group();
  store.name = "TokoCung";
  const inner = new T.Group();
  inner.name = "Shelf";
  inner.add(box(), box());
  store.add(inner, box());
  const npc = new T.Group();
  npc.name = "npc-shopper-1";
  npc.add(box());
  const hidden = new T.Group();
  hidden.name = "Hidden";
  hidden.visible = false;
  hidden.add(box());
  const far = new T.Group();
  far.name = "Behind";
  far.position.set(0, 0, 50);
  far.add(box());
  city.add(store, npc, hidden, far);
  const camera = new T.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  scene.updateMatrixWorld(true);
  const groups = drawBreakdown(scene, camera);
  assert.deepEqual(
    groups.map((g) => [g.name, g.calls, g.tris]),
    [
      ["TokoCung", 3, 36],
      ["npc-shopper-1", 1, 12],
    ],
  );
});
