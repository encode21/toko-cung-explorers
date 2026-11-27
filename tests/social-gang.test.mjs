import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  new Function("require", "exports", code)((name) => {
    assert(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, exports);
  return exports;
}
const { sameGang } = load("../src/game/gang/model.ts");
function setup() {
  const game = {
    playerPos: [6005, 0.83, 3030],
    pendingTeleport: null,
    setToast: (text) => toasts.push(text),
  };
  const toasts = [],
    broadcasts = [];
  const state = { gang: 22 };
  const peers = new Map([["peer", { x: 6006, y: 0.83, z: 3030, gangId: 1 }]]);
  const channel = { send: (message) => broadcasts.push(message) };
  const actions = load("../src/game/social/social-actions.ts", {
    "@/game/gang/store": { localGangId: () => state.gang },
    "@/game/gang/model": { sameGang },
    "@/net/useWorldChannel": {
      getActiveChannel: () => channel,
      playerId: "me",
      remoteStates: peers,
    },
    "@/net/net-store": { useNet: { getState: () => ({ name: "Sari" }) } },
    "@/state/game-store": { useGame: { getState: () => game } },
    "./chat-emotes": { CHAT_EMOTES: [], isChatEmoteAnimation: () => false },
  });
  actions.registerLocalPose(() => ({ x: game.playerPos[0], z: game.playerPos[2] }));
  const incoming = (kind = "wave", gangId = 22) =>
    actions.handleSocialAction({
      from: "peer",
      fromName: "Budi",
      to: "me",
      kind,
      gangId,
      vx: 1,
      vz: 0,
      at: Date.now(),
    });
  return { actions, state, game, peers, toasts, broadcasts, incoming };
}

test("identical coordinates in Gang 1 and 22 cannot offer social actions, send greetings or receive hits", () => {
  const s = setup();
  assert.equal(s.actions.canInteractWithPlayer("peer"), false);
  for (const kind of ["wave", "punch"]) {
    s.actions.performSocialAct(kind, "peer", "Budi");
    s.incoming(kind, 1);
  }
  assert.equal(s.broadcasts.length, 0);
  assert.equal(s.actions.consumeSocialHit(), null);
  assert.equal(s.actions.peekRemoteSocialAnim("peer"), null);
  assert(s.toasts.every((text) => text === "Pemain sudah menjauh"));
});

test("visiting the same gang restores nearby greetings and carry target selection", () => {
  const s = setup();
  s.state.gang = 1;
  assert.equal(s.actions.canInteractWithPlayer("peer"), true);
  s.actions.performSocialAct("wave", "peer", "Budi");
  assert.equal(s.broadcasts[0].payload.gangId, 1);
  s.incoming("wave", 1);
  assert.equal(s.toasts.at(-1), "Budi menyapa kamu");
  s.incoming("punch", 1);
  assert.equal(s.actions.consumeSocialHit().vx, 1);
});

test("stale gang broadcasts, distance, vertical separation and travel block interactions", () => {
  const s = setup();
  s.peers.get("peer").gangId = 22;
  s.incoming("wave", 1);
  assert.equal(s.toasts.length, 0);
  for (const change of [
    () => {
      s.peers.get("peer").x += 20;
    },
    () => {
      s.peers.get("peer").y += 5;
    },
    () => {
      s.game.pendingTeleport = [0, 0.83, 0];
    },
  ]) {
    s.peers.set("peer", { x: 6006, y: 0.83, z: 3030, gangId: 22 });
    change();
    assert.equal(s.actions.canInteractWithPlayer("peer"), false);
    s.actions.performSocialAct("wave", "peer", "Budi");
    s.incoming();
  }
  assert.equal(s.broadcasts.length, 0);
  assert(s.toasts.every((text) => text === "Pemain sudah menjauh"));
});
