import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createAvatarSource } from "../src/game/avatar/avatar-source.ts";
import { createDanceClips } from "../src/game/club/dance-clips.ts";
import { newerSnapshot, playbackPosition, youtubeIdFor } from "../src/game/club/model.ts";
import { MockMusicProvider, YOUTUBE_ENABLED } from "../src/game/club/music-provider.ts";
import { DEFAULT_CLUB_TARGETS, ensureClubTargets } from "../src/game/club/defaults.ts";
test("missing club seed IDs are filled so outdoor entrance stays visible", () => {
  assert.equal(DEFAULT_CLUB_TARGETS.length, 7);
  assert.deepEqual(
    DEFAULT_CLUB_TARGETS.find((t) => t.id === "club_entrance")?.position,
    { x: 10.4, y: 0, z: 3.8 },
  );
  const kept = {
    id: "club_entrance",
    name: "Custom",
    type: "CLUB_ENTRANCE",
    scene: "toko-cung-world",
    position: { x: 1, y: 0, z: 2 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    radius: 3,
    interactionType: "INTERACT",
    tags: ["club"],
    active: true,
  };
  const merged = ensureClubTargets([kept]);
  assert.equal(merged.length, 7);
  assert.equal(merged.find((t) => t.id === "club_entrance"), kept);
  assert.equal(ensureClubTargets(DEFAULT_CLUB_TARGETS).length, 7);
  const legacyScreen = {
    ...DEFAULT_CLUB_TARGETS.find((t) => t.id === "club_screen"),
    position: { x: 0, y: -10, z: -9 },
  };
  const migrated = ensureClubTargets([legacyScreen]);
  assert.deepEqual(migrated.find((t) => t.id === "club_screen")?.position, {
    x: 0,
    y: -11.35,
    z: -8.85,
  });
});
test("eight distinct original dances bind to existing rig and leave canonical root unchanged", () => {
  const { scene } = createAvatarSource();
  const mixer = new T.AnimationMixer(scene),
    clips = createDanceClips();
  assert.equal(clips.length, 8);
  const signatures = new Set();
  for (const clip of clips) {
    for (const t of clip.tracks) assert.ok(scene.getObjectByName(t.name.split(".")[0]), t.name);
    const action = mixer.clipAction(clip).play();
    mixer.update(0.37);
    signatures.add(scene.getObjectByName("RightUpperArm").quaternion.toArray().join(","));
    assert.deepEqual(scene.position.toArray(), [0, 0, 0]);
    assert.deepEqual(scene.getObjectByName("Root").position.toArray(), [0, 0, 0]);
    assert.ok(!clip.tracks.some((t) => t.name.startsWith("Root.")));
    action.stop();
  }
  assert.equal(signatures.size, 8);
});
test("joining mid-song, paused states, and future starts derive stable provider position", async () => {
  const s = {
    roomId: "CHANNEL-01",
    provider: "mock",
    mediaId: "cung-night",
    playbackStatus: "playing",
    startedAt: 10000,
    positionSeconds: 12,
    queueVersion: 2,
    activeDjId: "a",
  };
  assert.equal(playbackPosition(s, 18000), 20);
  assert.equal(playbackPosition({ ...s, playbackStatus: "paused", startedAt: null }, 50000), 12);
  assert.equal(playbackPosition(s, 9000), 12);
  const provider = new MockMusicProvider();
  assert.equal(await provider.apply(s, 18000), "ready");
  assert.equal(provider.position(), 20);
  provider.dispose();
  assert.equal(provider.position(), 0);
  assert.equal(YOUTUBE_ENABLED, true);
  assert.equal(youtubeIdFor("cung-underground-set"), "_MmGd4-wEco");
  assert.equal(youtubeIdFor("cung-night"), null);
});
test("room mismatches and late stale snapshots cannot roll state backward", () => {
  const s = { roomId: "CHANNEL-01", revision: 4, serverNow: 2000 };
  assert.equal(newerSnapshot({ ...s, revision: 3, serverNow: 3000 }, s, "CHANNEL-01"), false);
  assert.equal(newerSnapshot({ ...s, serverNow: 1000 }, s, "CHANNEL-01"), false);
  assert.equal(newerSnapshot({ ...s, roomId: "CHANNEL-02" }, s, "CHANNEL-01"), false);
  assert.equal(newerSnapshot({ ...s, serverNow: 3000 }, s, "CHANNEL-01"), true);
});
