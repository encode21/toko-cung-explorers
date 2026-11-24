import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CLIP_CHARS, MAX_FRAMES, MAX_POSTS, addPost, crossedMilestone, formatCount, npcPosts,
  viralComments, viralLikes, viralViews,
} from "../src/game/sosmed/sosmed.ts";

const post = (i, frames = []) => ({ id: `p${i}`, author: "Kamu", text: "x", at: i, mine: true, frames });

test("viral curve: 12 -> ~340 -> peak, monotonic", () => {
  assert.equal(viralViews(0, 2100), 12);
  assert.ok(Math.abs(viralViews(15, 2100) - 340) < 40);
  assert.equal(viralViews(60, 2100), 2100);
  assert.equal(viralViews(500, 2100), 2100);
  let prev = 0;
  for (let t = 0; t <= 60; t++) {
    const v = viralViews(t, 2100);
    assert.ok(v >= prev);
    prev = v;
  }
  assert.ok(viralLikes(2100) < 2100);
});

test("count format and milestones", () => {
  assert.equal(formatCount(340), "340");
  assert.equal(formatCount(2100), "2.1rb");
  assert.equal(crossedMilestone(50, 120), 100);
  assert.equal(crossedMilestone(120, 130), null);
  assert.equal(crossedMilestone(900, 2100), 2000);
});

test("comments pop in over time", () => {
  assert.equal(viralComments(0, 1).length, 0);
  assert.equal(viralComments(5, 1)[0].text, "Wkwk viral!");
  assert.ok(viralComments(60, 1).length > viralComments(15, 1).length);
});

test("post store keeps 30 newest and 5 frames", () => {
  let posts = [];
  for (let i = 0; i < 35; i++) posts = addPost(posts, post(i));
  assert.equal(posts.length, MAX_POSTS);
  assert.equal(posts[0].id, "p34");
  posts = addPost(posts, post(99, ["a", "b", "c", "d", "e", "f", "g"]));
  assert.equal(posts[0].frames.length, MAX_FRAMES);
});

test("over the clip budget the oldest clips lose their frames first", () => {
  const big = "x".repeat(MAX_CLIP_CHARS / 2);
  let posts = addPost([], post(1, [big]));
  posts = addPost(posts, post(2, [big]));
  posts = addPost(posts, post(3, [big]));
  assert.deepEqual(posts.map((p) => p.frames.length), [1, 1, 0]);
  assert.equal(posts.length, 3);
});

test("npc feed is stable within a bucket", () => {
  assert.deepEqual(npcPosts(1_000_000).map((p) => p.id), npcPosts(1_100_000).map((p) => p.id));
  assert.ok(npcPosts(1_000_000).every((p) => !p.mine));
});
