import { useEffect } from "react";
import { useSceneTime } from "@/game/time/scene-time";
import { hh, upcomingEvents } from "./model";
import { loadTownEvents, useTownEvents } from "./store";
import "@/ui/hud/warung-panel.css";

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
