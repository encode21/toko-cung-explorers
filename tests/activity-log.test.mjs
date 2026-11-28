import test from "node:test";
import assert from "node:assert/strict";
import { activityRows } from "../src/ui/hud/activity-log.ts";
import { gameMoment } from "../src/game/time/calendar.ts";

test("activity rows show game time and signed Kas amounts in server order", () => {
  const at = "2026-11-28T15:52:00+07:00";
  const rows = activityRows([
    { id: "d7-completed", at, text: "Menyelesaikan pesan antar ke Pak Haji", amount: 27200 },
    { id: "j12", at, text: "Kulakan 3 Mi Instan di Toko Cung", amount: -7500 },
    { id: "d7-prepared", at, text: "Menyiapkan pesan antar Pak Haji", amount: null },
  ]);
  assert.deepEqual(
    rows.map((r) => r.text),
    [
      "Menyelesaikan pesan antar ke Pak Haji +Rp27.200",
      "Kulakan 3 Mi Instan di Toko Cung −Rp7.500",
      "Menyiapkan pesan antar Pak Haji",
    ],
  );
  assert.equal(rows[0].when, gameMoment(Date.parse(at)));
  assert.equal(rows[0].key, "d7-completed");
  assert.equal(rows[0].dateTime, at);
});
