/** Pure helpers for scheduled town events (`hours` from config world-events.php; server still validates). */
type Hours = [number, number] | undefined;
interface EventLike {
  host: string;
  status: string;
  event: { key: string; hours?: [number, number] };
}

export const hh = (h: number) => `${String(h).padStart(2, "0")}.00`;

/** [from, to) game hours, may wrap midnight; mirrors WorldTownEvents::progress. No hours = always open. */
export function eventOpen(hours: Hours, hour: number) {
  if (!hours) return true;
  const [from, to] = hours;
  return from < to ? hour >= from && hour < to : hour >= from || hour < to;
}

const pending = (e: EventLike) => e.status === "available" || e.status === "active";

export function focusedActivity(events: EventLike[], kuli: boolean, selected: string | null) {
  const active = events.filter((e) => e.status === "active");
  if (selected === "kuli" && kuli) return selected;
  if (active.some((e) => `town:${e.host}` === selected)) return selected;
  return kuli ? "kuli" : active[0] ? `town:${active[0].host}` : null;
}

/** Today's events that have a time window which has not opened yet: shown as "mendatang". */
export const upcomingEvents = <E extends EventLike>(events: E[], hour: number) =>
  events.filter((e) => pending(e) && !eventOpen(e.event.hours, hour));

/** Accepted events whose window is open now: the only ones with rings/labels/actions in the world. */
export const liveEvents = <E extends EventLike>(events: E[], hour: number) =>
  events.filter((e) => e.status === "active" && eventOpen(e.event.hours, hour));

/** One step drives the arrow, marker and action, including the final report. */
export function townEventStep(e: {
  name: string;
  at: [number, number];
  progress: number[];
  event: { key: string; verb: string; points: [number, number][] };
}) {
  const point = e.event.points.findIndex((_, n) => !e.progress.includes(n));
  return {
    point,
    at: point < 0 ? e.at : e.event.points[point]!,
    label:
      point < 0
        ? `Lapor ke ${e.name}`
        : e.event.key === "pasar_murah" && point === 0
          ? "Ambil sembako"
          : e.event.verb,
  };
}

export const noticeKey = (e: EventLike, day: number) => `${e.host}:${e.event.key}:${day}`;

/** Timed events that are open now and not yet announced this game day. */
export const dueNotices = <E extends EventLike>(
  events: E[],
  hour: number,
  day: number,
  seen: string[],
) =>
  events.filter(
    (e) =>
      pending(e) &&
      e.event.hours &&
      eventOpen(e.event.hours, hour) &&
      !seen.includes(noticeKey(e, day)),
  );
