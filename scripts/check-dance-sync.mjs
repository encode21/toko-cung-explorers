/** Exercise the overhead sync action and stale-target guards without a browser/server. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as jsx from "react/jsx-runtime";
import ts from "typescript";

let club, net, game, calls, finish;
const store = (get) => Object.assign((selector = (s) => s) => selector(get()), { getState: get });
const useClub = store(() => club);
const useNet = store(() => net);
const useGame = store(() => game);
const source = await readFile(
  new URL("../src/ui/hud/DanceSyncButton.tsx", import.meta.url),
  "utf8",
);
const module = { exports: {} };
const dependencies = {
  "react/jsx-runtime": jsx,
  react: { useRef: (current) => ({ current }), useState: (value) => [value, () => {}] },
  "@/game/club/store": {
    useClub,
    clubNow: () => 1000,
    clubCommand: (action, payload) => {
      calls.push({ action, payload });
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  },
  "@/net/channel-store": { connectionId: "local" },
  "@/net/net-store": { useNet },
  "@/state/game-store": { useGame },
};
new Function(
  "require",
  "module",
  "exports",
  ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText,
)(
  (name) => {
    assert(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  },
  module,
  module.exports,
);
const { DanceSyncButton } = module.exports;
const reset = () => {
  club = {
    inside: true,
    busy: false,
    data: { members: { bob: { dance: { id: "disco" }, expiresAt: 2000 } } },
  };
  net = { connected: true };
  game = { nearby: { id: "bob", kind: "player" } };
  calls = [];
};
const render = (playerId = "bob") => DanceSyncButton({ playerId, name: "Budi" });
reset();
const button = render();
assert.equal(button.props["aria-label"], "Sync dance · Budi");
assert.equal(button.props.className, "world-action-button");
assert.equal(button.props.disabled, false);
button.props.onClick();
button.props.onClick();
assert.deepEqual(
  calls,
  [{ action: "sync", payload: { target: "bob" } }],
  "same-turn double taps dispatch only once",
);
finish();
await new Promise((resolve) => setImmediate(resolve));
button.props.onClick();
assert.equal(calls.length, 2, "completion releases the pending lock");
finish();
await new Promise((resolve) => setImmediate(resolve));

for (const state of ["outside", "self", "missing", "stopped", "expired"]) {
  reset();
  if (state === "outside") club.inside = false;
  if (state === "missing") club.data = null;
  if (state === "stopped") club.data.members.bob.dance = null;
  if (state === "expired") club.data.members.bob.expiresAt = 1000;
  assert.equal(render(state === "self" ? "local" : "bob"), null, `${state}: no sync action`);
}
for (const state of ["busy", "offline"]) {
  reset();
  if (state === "busy") club.busy = true;
  else net.connected = false;
  assert.equal(render().props.disabled, true, `${state}: disabled`);
}
for (const state of [
  "outside",
  "busy",
  "offline",
  "stopped",
  "expired",
  "missing",
  "away",
  "different-kind",
]) {
  reset();
  const stale = render();
  if (state === "outside") club.inside = false;
  if (state === "busy") club.busy = true;
  if (state === "offline") net.connected = false;
  if (state === "stopped") club.data.members.bob.dance = null;
  if (state === "expired") club.data.members.bob.expiresAt = 1000;
  if (state === "missing") club.data = null;
  if (state === "away") game.nearby = null;
  if (state === "different-kind") game.nearby.kind = "npc";
  stale.props.onClick();
  assert.equal(calls.length, 0, `${state}: stale callbacks cannot send sync`);
}

for (const path of [
  "hud/DanceControls.tsx",
  "hud/ClubHud.tsx",
  "profile/PlayerInteractionMenu.tsx",
]) {
  const code = await readFile(new URL(`../src/ui/${path}`, import.meta.url), "utf8");
  assert(!/\b(?:act|clubCommand)\("sync"/.test(code), `${path}: sync no longer lives in menus`);
}
const context = await readFile(new URL("../src/ui/hud/ContextPanel.tsx", import.meta.url), "utf8");
assert(context.includes("<WorldActionAnchor"));
assert(context.includes("<DanceSyncButton playerId={target.id} name={target.label} />"));
console.log(
  "PASS overhead dance sync: shared player action row, target/expiry/connection guards, pending lock, and removal from menus; no browser/network.",
);
