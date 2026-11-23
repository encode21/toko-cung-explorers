import { test } from "node:test";
import assert from "node:assert/strict";
import { canFundWholesale, isCashMovement } from "../src/game/gang/economy.ts";

test("credit buys goods, never delivery, and zero credit retains cash-only behavior", () => {
  assert(canFundWholesale(0, 25000, 25000));
  assert(!canFundWholesale(0, 25000, 2500, 3000));
  assert(canFundWholesale(3000, 25000, 25000, 3000));
  assert(!canFundWholesale(3000, 25000, 25001, 3000));
  assert(!canFundWholesale(2499, 0, 2500));
});
test("waived arrears do not inflate cash-in totals, including old cached rows", () => {
  const rows = [
    { type: "SERVE", amount: 4000 },
    { type: "KASBON_BAYAR", amount: -2000 },
    { type: "PULANG_RT", amount: 46200 },
    { type: "DISPENSASI_RT", amount: 19800, cashMovement: false },
  ];
  assert.equal(
    rows.filter(isCashMovement).reduce((sum, row) => sum + row.amount, 0),
    2000,
  );
  assert.equal(rows.filter((row) => isCashMovement(row) && row.amount > 0).length, 1);
});
