/** Cashless debt relief must never appear in cash-in totals. Missing metadata supports older servers. */
export function isCashMovement(entry: { cashMovement?: boolean; type: string }) {
  return (
    entry.cashMovement !== false &&
    !["PULANG_RT", "DISPENSASI_RT", "SUBSIDI_WALIKOTA", "BENCANA"].includes(entry.type)
  );
}
/** Credit funds only goods; delivery must be covered by actual cash. */
export function canFundWholesale(cash: number, credit: number, goods: number, shipping = 0) {
  return cash >= shipping && cash - shipping + credit >= goods;
}
