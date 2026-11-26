import test from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import { KioskCameraFocus } from "../src/game/player/kiosk-camera.ts";

const kiosk = { position: [2.2, 0.06, 0.5], yaw: Math.PI };
const views = [
  { width: 1440, height: 900, sceneWidth: 840, sceneHeight: 790 },
  { width: 844, height: 390, sceneWidth: 405, sceneHeight: 290 },
  { width: 740, height: 360, sceneWidth: 340, sceneHeight: 260 },
];
function orbit(view) {
  const camera = new PerspectiveCamera(58, view.width / view.height, 0.1, 420);
  camera.position.set(4.2, 2.4, -4.8);
  camera.lookAt(1, 1, 0);
  camera.updateMatrixWorld();
  return camera;
}
function projected(point, camera, view) {
  const v = point.clone().project(camera);
  return { x: ((v.x + 1) * view.width) / 2, y: ((1 - v.y) * view.height) / 2 };
}

test("the complete kiosk fits in the unobscured left scene above the basket", () => {
  for (const view of views) {
    const camera = orbit(view);
    const focus = new KioskCameraFocus();
    focus.update(camera, true, 1 / 60, true, kiosk, view);
    camera.updateMatrixWorld();
    const center = projected(new Vector3(2.2, 1.02, 0.5), camera, view);
    assert.ok(Math.abs(center.x - view.sceneWidth / 2) < 0.01, "center in left region");
    assert.ok(Math.abs(center.y - view.sceneHeight / 2) < 0.01, "center above basket");
    for (const x of [-0.32, 0.32])
      for (const y of [0, 1.9])
        for (const z of [-0.29, 0.29]) {
          const point = new Vector3(x, y, z)
            .applyAxisAngle(new Vector3(0, 1, 0), kiosk.yaw)
            .add(new Vector3(...kiosk.position));
          const p = projected(point, camera, view);
          assert.ok(p.x > 0 && p.x < view.sceneWidth, `x ${p.x} within ${view.sceneWidth}`);
          assert.ok(p.y > 0 && p.y < view.sceneHeight, `y ${p.y} within ${view.sceneHeight}`);
        }
    assert.ok(camera.position.z < kiosk.position[2], "camera faces the touchscreen, not its back");
    assert.equal(camera.fov, 58);
    assert.equal(camera.zoom, 1);
  }
});

test("entrance interpolates; exit restores orbit and exact projection without changing zoom", () => {
  const view = views[0];
  const camera = orbit(view);
  const origin = camera.clone();
  const focus = new KioskCameraFocus();
  focus.update(camera, true, 1 / 60, false, kiosk, view);
  assert.ok(camera.position.distanceTo(origin.position) > 0.01);
  const first = camera.position.clone();
  for (let i = 0; i < 90; i++) focus.update(camera, true, 1 / 60, false, kiosk, view);
  assert.ok(camera.position.distanceTo(first) > 0.1, "fly continues beyond first frame");
  let active = true;
  for (let i = 0; i < 90; i++) {
    camera.position.copy(origin.position);
    camera.quaternion.copy(origin.quaternion);
    active = focus.update(camera, false, 1 / 60, false, kiosk, {
      ...view,
      sceneWidth: 0,
      sceneHeight: 0,
    });
  }
  assert.equal(active, false);
  assert.ok(camera.position.distanceTo(origin.position) < 1e-9);
  assert.ok(camera.quaternion.equals(origin.quaternion));
  assert.equal(camera.view, null);
  assert.ok(camera.projectionMatrix.equals(origin.projectionMatrix));
});

test("close/reopen retains continuity; reduced motion and cleanup restore a prior view offset", () => {
  const view = views[1];
  const camera = orbit(view);
  camera.setViewOffset(view.width, view.height, 5, 3, view.width, view.height);
  camera.zoom = 1.2;
  camera.updateProjectionMatrix();
  const original = camera.clone();
  const focus = new KioskCameraFocus();
  focus.update(camera, true, 1 / 60, false, kiosk, view);
  const inFlight = camera.position.clone();
  camera.position.copy(original.position);
  camera.quaternion.copy(original.quaternion);
  focus.update(camera, false, 1 / 60, false, kiosk, view);
  focus.update(camera, true, 1 / 60, false, kiosk, view);
  assert.ok(camera.position.distanceTo(inFlight) < 1, "reopening continues, does not jump");
  focus.reset(camera);
  assert.deepEqual(camera.view, original.view);
  assert.ok(camera.position.equals(original.position));
  assert.ok(camera.projectionMatrix.equals(original.projectionMatrix));
  focus.update(camera, true, 1 / 60, true, kiosk, view);
  camera.position.copy(original.position);
  camera.quaternion.copy(original.quaternion);
  focus.update(camera, false, 1 / 60, true, kiosk, view);
  assert.ok(camera.position.equals(original.position));
  assert.deepEqual(camera.view, original.view);
  assert.equal(camera.zoom, 1.2);
});

test("resize re-centers the kiosk and a fully covered portrait canvas never starts a fly-in", () => {
  const camera = orbit(views[0]);
  const focus = new KioskCameraFocus();
  focus.update(camera, true, 1 / 60, true, kiosk, views[0]);
  focus.update(camera, true, 1 / 60, true, kiosk, views[2]);
  camera.updateMatrixWorld();
  const center = projected(new Vector3(2.2, 1.02, 0.5), camera, views[2]);
  assert.ok(Math.abs(center.x - 170) < 0.01);
  focus.reset(camera);
  const original = camera.clone();
  const portrait = { width: 390, height: 844, sceneWidth: 0, sceneHeight: 844 };
  assert.equal(focus.update(camera, true, 1 / 60, false, kiosk, portrait), false);
  assert.ok(camera.position.equals(original.position));
  assert.deepEqual(camera.view, original.view);
});
