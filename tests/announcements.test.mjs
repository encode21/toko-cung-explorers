import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(
  readFileSync(new URL("../src/ui/hud/announcements.ts", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
).outputText;

function setup(localStorage) {
  const exports = {};
  vm.runInNewContext(source, { exports, localStorage });
  return exports;
}

test("beginner guide tooltip is claimed once per account and persists across reloads", () => {
  const saved = new Map();
  const storage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  };
  const firstPage = setup(storage);
  assert.equal(firstPage.claimBeginnerGuideTooltip("account-a"), true);
  assert.equal(firstPage.claimBeginnerGuideTooltip("account-a"), false);
  assert.equal(firstPage.claimBeginnerGuideTooltip("account-b"), true);

  const reloadedPage = setup(storage);
  assert.equal(reloadedPage.claimBeginnerGuideTooltip("account-a"), false);
  assert.equal(reloadedPage.claimBeginnerGuideTooltip("account-b"), false);
});

test("blocked browser storage still shows the tooltip once for the current page", () => {
  const blocked = setup({
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  });
  assert.equal(blocked.claimBeginnerGuideTooltip("account-a"), true);
  assert.equal(blocked.claimBeginnerGuideTooltip("account-a"), false);
});
