import { test } from "node:test";
import assert from "node:assert/strict";

class FakeContext {
  static instance;
  state = "interrupted";
  resumes = 0;
  hang = false;
  constructor() {
    FakeContext.instance = this;
  }
  resume() {
    this.resumes += 1;
    if (this.hang) return new Promise(() => {});
    this.state = "running";
    return Promise.resolve();
  }
}
globalThis.window = { AudioContext: FakeContext };
const { resumeAudioContext } = await import("../src/game/audio/audio-context.ts");

test("an interrupted context is resumed, not only a suspended one", async () => {
  const ctx = await resumeAudioContext();
  assert.equal(ctx.state, "running");
  assert.equal(FakeContext.instance.resumes, 1);
  await resumeAudioContext();
  assert.equal(FakeContext.instance.resumes, 1, "a running context is left alone");
});

test("a resume that never settles gives up so the next gesture can retry", async () => {
  const ctx = FakeContext.instance;
  ctx.state = "suspended";
  ctx.hang = true;
  const started = Date.now();
  await resumeAudioContext(50);
  assert(Date.now() - started < 1000);
  assert.equal(ctx.resumes, 2);
});
