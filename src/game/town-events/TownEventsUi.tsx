import { useEffect, useState } from "react";
import { playWarungSfx } from "@/game/audio/sfx";
import { GAME_DAY_MS } from "@/game/time/model";
import { useSceneTime } from "@/game/time/scene-time";
import { useHud } from "@/state/hud-store";
import { dueNotices, eventOpen, hh, noticeKey, upcomingEvents } from "./model";
import { loadTownEvents, useTownEvents, type TownEvent } from "./store";
import "@/ui/hud/warung-panel.css";

const SEEN = "world.town-events.announced";
function seen(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN) ?? "[]") as unknown;
    return Array.isArray(raw) ? (raw as string[]) : [];
  } catch {
    return [];
  }
}

/** Kerja Sambilan: today's town events, timed ones that haven't opened yet listed as "mendatang". */
export function TownEventsJournal() {
  const events = useTownEvents((s) => s.events);
  const hour = useSceneTime((s) => s.hour);
  useEffect(() => {
    void loadTownEvents();
  }, []);
  const soon = new Set(upcomingEvents(events, hour));
  const list = events.filter((e) => e.status === "available" || e.status === "active");
  if (!list.length) return null;
  return (
    <section className="missions-line">
      <h4>Acara warga hari ini</h4>
      <ul>
        {list.map((e) => {
          const later = soon.has(e);
          const n = e.event.points.length;
          return (
            <li key={e.host} className="mission-row" data-state={later ? "locked" : "open"}>
              <div>
                <strong>
                  {later ? `🕗 ${e.event.verb} · mulai ${hh(e.event.hours![0])}` : e.event.title}
                </strong>
                <small>
                  {later
                    ? `${e.event.title} · ${e.name} · jam ${hh(e.event.hours![0])}–${hh(e.event.hours![1])}`
                    : e.status === "active"
                      ? e.progress.length === n
                        ? `Lapor ke ${e.name}`
                        : `${e.event.verb} ${e.progress.length}/${n}`
                      : `Temui ${e.name}`}
                </small>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** One card per timed event per game day when its hours open, like the prolog step cards. */
export function TownEventNotice() {
  const events = useTownEvents((s) => s.events);
  const hour = useSceneTime((s) => s.hour);
  const setSheet = useHud((s) => s.setSheet);
  const [shown, setShown] = useState<TownEvent | null>(null);
  useEffect(() => {
    const day = Math.floor(Date.now() / GAME_DAY_MS);
    const due = dueNotices(events, hour, day, seen())[0];
    if (!due) return;
    try {
      // Keep only today's keys so the list never grows.
      const keep = seen().filter((k) => k.endsWith(`:${day}`));
      localStorage.setItem(SEEN, JSON.stringify([...keep, noticeKey(due, day)]));
    } catch {
      /* storage unavailable: may announce again after reload */
    }
    setShown(due);
    playWarungSfx("chapter");
  }, [events, hour]);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), 9000);
    return () => clearTimeout(t);
  }, [shown]);
  if (!shown || !eventOpen(shown.event.hours, hour)) return null;
  return (
    <section className="payday-card warung-card" role="status" aria-label="Acara dimulai">
      <small>🔔 Acara dimulai</small>
      <strong>{shown.event.title}</strong>
      <p>
        {shown.status === "active"
          ? `Sudah jamnya! ${shown.event.verb} di titik kuning.`
          : `Temui ${shown.name} untuk ikut.`}
      </p>
      <button
        type="button"
        className="warung-cta"
        onClick={() => {
          setShown(null);
          setSheet("quests");
        }}
      >
        Lihat
      </button>
    </section>
  );
}
