import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { gameUiBlocked } from "../src/state/game-ui-store.ts";
import {
  LOADER_TIMEOUT_MS,
  markLocationReady,
  beginTravelRequest,
  cancelTravelRequest,
  finishTravelRequest,
  prepareScene,
  sceneFailed,
  sceneReleased,
  sceneRendered,
  startTravelRuntime,
  stopTravelRuntime,
  travelBlocksTeleport,
  travelRequestCurrent,
  useLoader,
  useTravelScene,
} from "../src/ui/hud/travel-loader.ts";

const city = { key: "city", art: "kota", title: "Kota", revision: 0 };
const shop = { key: "warung:7", art: "warung", title: "Warung", revision: 0 };
const loader = () => useLoader.getState().loader;
const mounted = () => useTravelScene.getState().mounted;

function clock(t) {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 1000 });
  globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 16);
  globalThis.cancelAnimationFrame = (frame) => clearTimeout(frame);
  startTravelRuntime(city);
  assert.equal(travelBlocksTeleport(), true);
  assert.equal(markLocationReady(city.key), true);
  assert.equal(travelBlocksTeleport(), false);
  return (ms = 16) => t.mock.timers.tick(ms);
}

afterEach(() => {
  stopTravelRuntime();
  delete globalThis.requestAnimationFrame;
  delete globalThis.cancelAnimationFrame;
});

test("changing rooms paints the cover first, then waits for disposal, rendering and landing", (t) => {
  const tick = clock(t);
  const ticket = beginTravelRequest("Masuk Warung Rizki", "", "warung", 700);
  tick(200);
  assert.equal(travelBlocksTeleport(), true);
  finishTravelRequest(ticket);
  prepareScene(shop, () => assert.fail("unexpected recovery"));
  const id = loader().id;
  assert.equal(travelRequestCurrent(ticket), false);
  assert.equal(loader().title, "Masuk Warung Rizki");
  assert.equal(gameUiBlocked(), true);
  assert.equal(travelBlocksTeleport(), true);
  tick();
  assert.equal(loader().phase, "cover");
  assert.deepEqual(mounted(), city);
  tick();
  assert.equal(loader().phase, "releasing");
  assert.equal(mounted(), null);
  sceneReleased(id);
  assert.equal(mounted(), null);
  tick();
  assert.equal(loader().phase, "mounting");
  assert.deepEqual(mounted(), shop);
  sceneRendered(id, city.key, false);
  assert.equal(loader().phase, "mounting");
  assert.equal(markLocationReady(city.key), false);
  assert.equal(markLocationReady(shop.key), true);
  sceneRendered(id, shop.key, true);
  assert.equal(travelBlocksTeleport(), false);
  sceneRendered(id, shop.key, true);
  tick(1000);
  assert.equal(loader().phase, "ready");
  sceneRendered(id, shop.key, false);
  tick(1);
  assert.equal(loader(), null);
  assert.equal(gameUiBlocked(), false);
});

test("travel within one scene reuses the scenery and respects the minimum cover duration", (t) => {
  const tick = clock(t);
  prepareScene(city, () => assert.fail("unexpected recovery"));
  const id = loader().id;
  tick();
  tick();
  assert.equal(loader().phase, "mounting");
  assert.equal(mounted(), city);
  sceneRendered(id, city.key, false);
  sceneRendered(id, city.key, false);
  tick(600);
  assert.ok(loader());
  tick(30);
  assert.equal(loader(), null);
});

test("stale completion and failures cannot dismiss the next destination", async (t) => {
  const tick = clock(t);
  let failures = 0;
  prepareScene(shop, () => failures++);
  const stale = loader().id;
  tick();
  tick();
  sceneReleased(stale);
  prepareScene(city, () => failures++);
  const current = loader().id;
  sceneReleased(stale);
  sceneRendered(stale, shop.key, false);
  sceneFailed(shop.key);
  assert.equal(loader().id, current);
  assert.equal(failures, 0);
  tick(LOADER_TIMEOUT_MS);
  assert.equal(loader(), null);
  assert.equal(gameUiBlocked(), false);
  assert.equal(failures, 1);

  const oldRequest = beginTravelRequest("Warung", "", "warung");
  finishTravelRequest(oldRequest);
  const newRequest = beginTravelRequest("Rumah", "", "rumah");
  cancelTravelRequest(oldRequest);
  await Promise.resolve();
  assert.equal(travelRequestCurrent(newRequest), true);
  tick(LOADER_TIMEOUT_MS);
  assert.equal(loader(), null);
  assert.equal(travelRequestCurrent(newRequest), false);
  assert.equal(gameUiBlocked(), false);
});

test("scene timeout only counts visible time and removes its visibility listener", (t) => {
  const tick = clock(t);
  const page = new EventTarget();
  const removed = t.mock.method(page, "removeEventListener");
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: page });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "document", original);
    else delete globalThis.document;
  });
  let failures = 0;
  prepareScene(shop, () => failures++);
  tick(4000);
  page.hidden = true;
  page.dispatchEvent(new Event("visibilitychange"));
  tick(2 * LOADER_TIMEOUT_MS);
  assert.equal(failures, 0);
  page.hidden = false;
  page.dispatchEvent(new Event("visibilitychange"));
  tick(LOADER_TIMEOUT_MS - 4001);
  assert.equal(failures, 0);
  tick(1);
  assert.equal(failures, 1);
  assert.equal(loader(), null);
  assert.equal(removed.mock.callCount(), 1);
});
