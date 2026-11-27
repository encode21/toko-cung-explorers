import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(source, { exports, ...globals });
  return exports;
}
const { canReadStoryPage, storyPageState } = load("../src/game/story/page-state.ts");

test("only claimed pages and the current page can be opened in either chapter", () => {
  for (const pageCount of [4, 8]) {
    for (let claimed = 0; claimed <= pageCount; claimed++) {
      const section = { page: claimed, pageCount };
      for (let index = -1; index <= pageCount; index++)
        assert.equal(
          canReadStoryPage(section, index),
          index >= 0 && index < pageCount && index <= claimed,
        );
    }
  }
  assert.equal(canReadStoryPage({ page: 3, pageCount: 4 }, 0), true, "old progress can be reread");
  assert.equal(canReadStoryPage({ page: 0, pageCount: 8 }, 0), true, "chapters stay independent");
});

test("claim availability retains daily, guest and Warung requirements", () => {
  const page = { progress: { done: true } };
  assert.equal(storyPageState({ locked: false }, page), "ready");
  assert.equal(storyPageState({ locked: true }, page), "locked");
  assert.equal(storyPageState({ guest: true }, page), "guest");
  assert.equal(storyPageState({}, { ...page, needsWarung: true }), "needs_warung");
  assert.equal(storyPageState({}, { progress: { claimInWarung: true } }), "claim_in_warung");
  assert.equal(storyPageState({}, { progress: { done: false } }), "unfinished");
});

test("all twelve help topics have illustrations and use only local browser read markers", () => {
  let stored = null;
  const h = load("../src/ui/hud/guide/topics.ts", {
    localStorage: {
      getItem: () => stored,
      setItem: (_key, value) => {
        stored = value;
      },
    },
  });
  assert.equal(h.GUIDE_TOPICS.length, 12);
  assert.equal(new Set(h.GUIDE_TOPICS.map((t) => t.id)).size, 12);
  for (const topic of h.GUIDE_TOPICS) {
    assert.ok(topic.steps.length >= 3);
    assert.ok(
      existsSync(new URL(`../public/assets/beginner-guide/${topic.id}.webp`, import.meta.url)),
    );
  }
  h.markTopicSeen("mancing");
  h.markTopicSeen("mancing");
  assert.equal(JSON.stringify(h.readSeenTopics()), '["mancing"]');
  stored = "{broken";
  assert.equal(h.readSeenTopics().length, 0);
  stored = '{"wrong":"shape"}';
  assert.equal(h.readSeenTopics().length, 0);
  stored = '[null, 42, "summit"]';
  assert.equal(JSON.stringify(h.readSeenTopics()), '["summit"]');
});

test("help remains readable when localStorage is blocked or missing", () => {
  for (const globals of [
    {},
    {
      localStorage: {
        getItem: () => {
          throw new Error("Blocked");
        },
        setItem: () => {
          throw new Error("Blocked");
        },
      },
    },
  ]) {
    const h = load("../src/ui/hud/guide/topics.ts", globals);
    assert.equal(h.GUIDE_TOPICS.length, 12);
    assert.equal(h.readSeenTopics().length, 0);
    assert.doesNotThrow(() => h.markTopicSeen("mancing"));
  }
});
