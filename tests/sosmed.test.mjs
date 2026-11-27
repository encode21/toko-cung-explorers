import test from "node:test";
import assert from "node:assert/strict";
import { mergeRows, commentThreads, MAX_TEXT, MAX_FRAMES } from "../src/game/sosmed/sosmed.ts";
test("overlapping feed pages and retry receipts update rather than duplicate posts", () => {
  assert.deepEqual(
    mergeRows([{ id: 2, text: "old" }, { id: 1 }], [{ id: 2, text: "new" }, { id: 3 }]),
    [{ id: 3 }, { id: 2, text: "new" }, { id: 1 }],
  );
  assert.equal(MAX_TEXT, 140);
  assert.equal(MAX_FRAMES, 5);
});
test("roots remain chronological and replies belong to their own conversation", () => {
  const rows = [
    { id: 4, parentId: 1 },
    { id: 3, parentId: null },
    { id: 2, parentId: 1 },
    { id: 1, parentId: null },
  ];
  const threads = commentThreads(rows);
  assert.deepEqual(
    threads.map((t) => t.root.id),
    [1, 3],
  );
  assert.deepEqual(
    threads[0].replies.map((t) => t.id),
    [2, 4],
  );
  assert.equal(threads[1].replies.length, 0);
});
