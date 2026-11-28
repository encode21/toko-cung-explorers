import { gameMoment } from "../../game/time/calendar.ts";
import { rupiah } from "../../game/warung/model.ts";

/** One row of the player's own activity log (`warung` action `activity`), newest first. */
export type ActivityEntry = { id: string; at: string; text: string; amount: number | null };

/** Display rows: game-time stamp plus the label with its signed Kas amount. */
export const activityRows = (entries: ActivityEntry[]) =>
  entries.map((e) => {
    const ms = Date.parse(e.at);
    const amount = e.amount ? ` ${e.amount > 0 ? "+" : "−"}${rupiah(Math.abs(e.amount))}` : "";
    return { key: e.id, dateTime: e.at, when: gameMoment(ms), text: `${e.text}${amount}` };
  });
