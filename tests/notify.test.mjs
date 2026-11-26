import { test } from "node:test";
import assert from "node:assert/strict";
import { billKey, visibleCards, BILL_SNOOZE_MS } from "../src/ui/hud/notify-model.ts";

const bill = { amount: 50000, owedDays: 1 };
const now = 1_000_000_000;
const chat = (id, at) => ({ id, name: id, preview: "hai", at });
const base = { bill, chats: [], dismissed: { chats: {} }, now };

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

test("the inbox shows every eligible conversation once with its latest preview", () => {
  const chats = [
    chat("a", now - 10),
    chat("b", now - 2),
    chat("a", now - 1),
    chat("c", now - 3),
    chat("z", 5),
  ];
  const cards = visibleCards({ ...base, chats });
  assert.deepEqual(
    cards.map((c) => c.key),
    ["bill", "chat-a", "chat-b", "chat-c"],
  );
  assert.equal(cards[1].chat.at, now - 1);
});

test("received messages remain actionable after the freshness window while old history stays out", () => {
  const received = chat("a", now - 3600_000);
  const archive = chat("b", now - 3600_000);
  const input = {
    ...base,
    bill: null,
    chats: [received, archive],
    receivedChats: { a: received.at },
  };
  assert.deepEqual(
    visibleCards(input).map((c) => c.key),
    ["chat-a"],
  );
  assert.deepEqual(visibleCards({ ...input, dismissed: { chats: { a: received.at } } }), []);
});

test("bills from different billing periods have different keys even when the amount matches", () => {
  const prev = { ...bill, paidUntil: "2026-03-19" };
  const next = { ...bill, paidUntil: "2026-03-20" };
  assert.notEqual(billKey(prev), billKey(next));
});
