import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { create } from "zustand";
import { isShowroomRoom } from "../src/game/showroom/layout.ts";

const source = readFileSync(new URL("../src/game/showroom/shop.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source.replace(/^import [\s\S]*?;$/gm, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function setup() {
  const useGame = create(() => ({ playerPos: [350, 0.83, 355], pendingTeleport: null }));
  let registered = [0, 0.83, 0],
    polls = 0,
    requests = 0;
  const snapshot = { catalog: { showroom: [{ id: "cung-eclipse", price: 1200000 }] } };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    create,
    isShowroomRoom,
    useGame,
    connectionId: "me",
    useChannels: { getState: () => ({ playing: true, lease: { channel: "CHANNEL-01" } }) },
    useTravelScene: { getState: () => ({ mounted: { art: "showroom" } }) },
    mobilityCommand: async () => {
      // First await finishes a poll that was sent before entering the showroom.
      if (++polls > 1) registered = useGame.getState().playerPos;
    },
    garasiCommand: async (action, location) => {
      requests++;
      assert.equal(action, "showroom-read");
      assert.equal(location.room, "CHANNEL-01");
      assert.equal(location.connectionId, "me");
      assert(
        isShowroomRoom(registered[0], registered[2]),
        "server must receive the landed position first",
      );
      return snapshot;
    },
  });
  return { ...exports, useGame, snapshot, requests: () => requests };
}

test("opening the showroom waits for an older poll and registers the new location", async () => {
  const s = setup();
  assert.equal(await s.loadShowroomCatalog(), s.snapshot);
  assert.equal(s.requests(), 1);
});

test("leaving or teleporting out of the showroom does not ask for its catalog", async () => {
  const s = setup();
  s.useGame.setState({ playerPos: [0, 0.83, 0] });
  assert.equal(await s.loadShowroomCatalog(), undefined);
  s.useGame.setState({ playerPos: [350, 0.83, 355], pendingTeleport: [0, 0.83, 0] });
  assert.equal(await s.loadShowroomCatalog(), undefined);
  assert.equal(s.requests(), 0);
});
