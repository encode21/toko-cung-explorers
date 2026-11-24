import { test } from "node:test";
import assert from "node:assert/strict";
import { billKey, visibleCards, BILL_SNOOZE_MS } from "../src/ui/hud/notify-model.ts";

const bill = { amount: 50000, owedDays: 1 };
const now = 1_000_000_000;
const chat = (id, at) => ({ id, name: id, preview: "hai", at });
const base = { bill, chats: [], dismissed: { chats: {} }, now, sheet: null };

test("bill re-shows after amount change or 6h", () => {
  const dismissed = { bill: { key: billKey(bill), at: now }, chats: {} };
  assert.equal(visibleCards({ ...base, dismissed }).length, 0);
  const more = { amount: 100000, owedDays: 2 };
  assert.equal(visibleCards({ ...base, bill: more, dismissed }).length, 1);
  assert.equal(visibleCards({ ...base, dismissed, now: now + BILL_SNOOZE_MS }).length, 1);
});

test("chat re-shows only on a newer message", () => {
  const dismissed = { chats: { a: now - 1000 } };
  const old = visibleCards({ ...base, bill: null, chats: [chat("a", now - 1000)], dismissed });
  assert.equal(old.length, 0);
  const next = visibleCards({ ...base, bill: null, chats: [chat("a", now - 500)], dismissed });
  assert.equal(next.length, 1);
});

test("stale chats are ignored and max 2 cards", () => {
  const chats = [chat("a", now - 3), chat("b", now - 2), chat("c", now - 1), chat("z", 5)];
  const cards = visibleCards({ ...base, chats });
  assert.equal(cards.length, 2);
  assert.equal(cards[0].kind, "bill");
});

test("hidden while the same app is open", () => {
  const chats = [chat("a", now - 1)];
  assert.deepEqual(
    visibleCards({ ...base, chats, sheet: "cngbank" }).map((c) => c.kind),
    ["chat"],
  );
  assert.deepEqual(
    visibleCards({ ...base, chats, sheet: "cungchat" }).map((c) => c.kind),
    ["bill"],
  );
});
