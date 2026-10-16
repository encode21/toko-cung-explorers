import { FLIGHT_ANIMATIONS, isFlightAnimation } from "../src/game/avatar/flight-clips.ts";
import { activePair, passengerPose } from "../src/game/mobility/model.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import * as THREE from "three";
import { AVATAR_ANIMATIONS } from "../src/game/avatar/avatar-source.ts";
import { SWIM_ANIMATIONS, isSwimAnimation } from "../src/game/avatar/swim-clips.ts";
import { JUMP_ANIMATIONS, isJumpAnimation } from "../src/game/avatar/jump-clips.ts";
import { isChatEmoteAnimation } from "../src/game/social/chat-emotes.ts";

// Execute the production frame callbacks. Only hooks, external state and transport are controlled.
const source = await readFile(
  new URL("../src/game/net/RemotePlayers.tsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source + "\nexport { MotionClip };", {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;
function harness() {
  const frames = [],
    sent = [],
    remoteStates = new Map();
  let localAnim, socialAnim;
  const mobility = { carries: [] };
  const net = { name: "Local", roster: [] };
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: { useRef: (current) => ({ current }), useCallback: (fn) => fn },
    three: THREE,
    "@react-three/fiber": { useFrame: (callback) => frames.push(callback) },
    "@/net/net-store": { useNet: (select) => select(net) },
    "@/net/local-pose": { getLocalNetAnim: () => localAnim },
    "@/net/useWorldChannel": {
      playerId: "local",
      remoteStates,
      getActiveChannel: () => ({
        send: (event) => {
          sent.push(event);
          return Promise.resolve();
        },
      }),
    },
    "@/state/game-store": {
      useGame: { getState: () => ({ playerPos: [4, 0.83, 2], playerYaw: 0 }) },
    },
    "@/game/mobility/store": { useMobility: { getState: () => mobility } },
    "@/game/mobility/model": { activePair, passengerPose },
    "@/game/club/store": {
      useClub: Object.assign((select) => select({ data: null }), {
        getState: () => ({ inside: false, outdoor: true }),
      }),
    },
    "@/game/avatar/avatar-source": { AVATAR_ANIMATIONS },
    "@/game/avatar/flight-clips": { FLIGHT_ANIMATIONS, isFlightAnimation },
    "@/game/avatar/swim-clips": { SWIM_ANIMATIONS, isSwimAnimation },
    "@/game/avatar/jump-clips": { JUMP_ANIMATIONS, isJumpAnimation },
    "@/game/social/chat-emotes": { isChatEmoteAnimation },
    "@/game/social/social-actions": { peekRemoteSocialAnim: () => socialAnim },
  };
  const exports = {};
  new Function("require", "exports", compiled)(
    (name) =>
      name.endsWith("jsx-runtime")
        ? { jsx, jsxs: jsx, Fragment: "fragment" }
        : (modules[name] ?? {}),
    exports,
  );
  return {
    exports,
    frames,
    sent,
    remoteStates,
    mobility,
    setAnim: (anim) => {
      localAnim = anim;
    },
    setSocial: (anim) => {
      socialAnim = anim;
    },
  };
}

test("production remote broadcast sends all four jump phase edges before its normal 8Hz tick", () => {
  const h = harness();
  h.exports.RemotePlayers();
  const frame = h.frames[0];
  let elapsedTime = 0;
  const tick = () => {
    elapsedTime += 1 / 60;
    frame({ clock: { elapsedTime } }, 1 / 60);
  };
  for (const phase of JUMP_ANIMATIONS) {
    const before = h.sent.length;
    h.setAnim(phase);
    tick();
    assert.equal(h.sent.length, before + 1, `${phase} is sent on its first render frame`);
    assert.equal(h.sent.at(-1).payload.anim, phase);
    assert.equal(h.sent.at(-1).event, "state", "existing state transport is reused");
    tick();
    assert.equal(h.sent.length, before + 1, "unchanged phase remains throttled");
  }
  assert.deepEqual(
    h.sent.map((event) => event.payload.anim),
    [...JUMP_ANIMATIONS],
  );
  h.setAnim(undefined);
  tick();
  assert.equal(h.sent.at(-1).payload.anim, undefined, "locomotion return is immediate too");
});

test("production remote consumer recognizes jump phases, overrides stale wave and preserves only horizontal gait", () => {
  const h = harness();
  const speedRef = { current: 0 },
    animRef = { current: undefined };
  h.exports.MotionClip({ id: "remote", speedRef, animRef });
  const frame = h.frames[0];
  const scene = new THREE.Scene(),
    remote = new THREE.Group();
  remote.name = "remote-remote";
  scene.add(remote);
  const tick = (phase, dx, dy) => {
    h.remoteStates.set("remote", { anim: phase });
    remote.position.x += dx;
    remote.position.y += dy;
    frame({ scene }, 1 / 60);
  };
  tick(undefined, 0, 0);
  h.setSocial("Wave");
  for (const phase of JUMP_ANIMATIONS) {
    tick(phase, 4.2 / 60, 0.07);
    assert.equal(animRef.current, phase, `${phase} accepted over old social pose`);
    assert(speedRef.current > 0, "moving jump keeps locomotion cadence ready for landing");
  }
  speedRef.current = 0;
  for (let i = 0; i < 10; i++) tick("Jump", 0, 0.07);
  assert.equal(speedRef.current, 0, "vertical-only hop does not invent running speed");
  h.setSocial(undefined);
  tick("JumpLand", 0, 0);
  assert.equal(animRef.current, "JumpLand");
  tick("unknown-pose", 0, 0);
  assert.equal(animRef.current, undefined, "network animation validation remains enforced");
});

test("swim states reuse immediate broadcast and override stale remote social poses", () => {
  const h = harness();
  h.exports.RemotePlayers();
  for (const [i, phase] of SWIM_ANIMATIONS.entries()) {
    h.setAnim(phase);
    h.frames[0]({ clock: { elapsedTime: (i + 1) / 60 } }, 1 / 60);
    assert.equal(h.sent.at(-1).payload.anim, phase);
  }
  const speedRef = { current: 0 },
    animRef = { current: undefined };
  h.exports.MotionClip({ id: "swimmer", speedRef, animRef });
  const scene = new THREE.Scene(),
    remote = new THREE.Group();
  remote.name = "remote-swimmer";
  scene.add(remote);
  h.setSocial("Wave");
  for (const phase of SWIM_ANIMATIONS) {
    h.remoteStates.set("swimmer", { anim: phase });
    h.frames[1]({ scene }, 1 / 60);
    assert.equal(animRef.current, phase);
  }
});

test("confirmed passengers keep the piggyback pose over stale movement and social animation", () => {
  const h = harness();
  h.mobility.carries.push({ id: "pair", carrier: "local", passenger: "remote", status: "active" });
  const speedRef = { current: 0 },
    animRef = { current: undefined };
  h.exports.MotionClip({ id: "remote", speedRef, animRef });
  const scene = new THREE.Scene(),
    remote = new THREE.Group();
  remote.name = "remote-remote";
  scene.add(remote);
  h.remoteStates.set("remote", { anim: "Jump" });
  h.setSocial("Wave");
  h.frames[0]({ scene }, 1 / 60);
  remote.position.x += 1;
  h.frames[0]({ scene }, 1 / 60);
  assert.equal(animRef.current, "Piggyback");
  assert.equal(speedRef.current, 0);
  h.mobility.carries = [];
  h.frames[0]({ scene }, 1 / 60);
  assert.equal(animRef.current, "Jump");
});

test("flight poses reach peers immediately and override stale social emotes", () => {
  const h = harness();
  h.exports.RemotePlayers();
  const speedRef = { current: 0 },
    animRef = { current: undefined };
  h.exports.MotionClip({ id: "gm", speedRef, animRef });
  const scene = new THREE.Scene(),
    remote = new THREE.Group();
  remote.name = "remote-gm";
  scene.add(remote);
  h.setSocial("Wave");
  for (const [i, phase] of FLIGHT_ANIMATIONS.entries()) {
    h.setAnim(phase);
    h.frames[0]({ clock: { elapsedTime: (i + 1) / 60 } }, 1 / 60);
    assert.equal(h.sent.at(-1).payload.anim, phase);
    h.remoteStates.set("gm", { anim: phase });
    h.frames[1]({ scene }, 1 / 60);
    assert.equal(animRef.current, phase);
  }
});
