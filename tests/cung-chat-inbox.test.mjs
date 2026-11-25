import test from "node:test";
import assert from "node:assert/strict";
import { billConversation } from "../src/ui/hud/cung-chat-inbox.ts";

test("Tagihan opens the rent thread even when a newer NPC chat sorts first", () => {
  const list = [
    { kind: "npc", id: "npc-rara", name: "Dek Rara" },
    { kind: "debt", id: "debt-3", name: "Pak Sabar" },
    { kind: "rent", id: "rent", name: "Koko Cung" },
  ];
  assert.equal(billConversation(list).id, "rent");
});
