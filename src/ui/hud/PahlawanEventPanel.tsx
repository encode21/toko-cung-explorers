import { useEffect } from "react";
import { ArrowRight, CalendarDays } from "lucide-react";
import { useReactiveWorld } from "@/game/reactive-world/store";
import { command, useGameCore } from "@/game/core/store";
import { useHud } from "@/state/hud-store";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { PointCoinIcon } from "@/ui/game-ui/PointCoinIcon";
import "./pahlawan-event.css";

const date = (time: number) =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
  }).format(time);

export function PahlawanEventPanel() {
  const event = useReactiveWorld((s) =>
    s.events.find((e) => e.type === "NATIONAL_DAY" && e.payload.theme === "pahlawan"),
  );
  const snapshot = useGameCore((s) => s.snapshot);
  useEffect(() => {
    void command("read");
  }, []);
  useEffect(() => {
    if (!event) useHud.getState().setSheet(null);
  }, [event]);
  if (!event) return null;
  const quests =
    snapshot?.quests.filter((q) => q.theme === "pahlawan" && q.campaign_id === "pahlawan-2026") ??
    [];
  const chain = quests.filter((q) => q.repeat_policy === "ONCE");
  const daily = quests.filter((q) => q.repeat_policy === "DAILY");
  const points = (list: typeof quests) =>
    list.reduce((sum, q) => sum + q.rewards.point, 0).toLocaleString("id-ID");
  return (
    <GameModal
      title="Event Hari Pahlawan"
      wide
      className="game-pahlawan-event"
      bodyClassName="game-scroll-flush"
      onClose={() => useHud.getState().setSheet(null)}
    >
      <section className="pahlawan-event-banner">
        <div className="pahlawan-event-copy">
          <span className="pahlawan-event-kicker">EVENT TERBATAS · TOKO CUNG WORLD</span>
          <h3>
            JEJAK
            <br />
            <span>PAHLAWAN</span>
          </h3>
          <p>
            Kenang keberanian.
            <br />
            Hidupkan semangat gotong royong.
          </p>
          <div className="pahlawan-event-period">
            <CalendarDays aria-hidden="true" />
            {date(event.startedAt)} – {date(event.expiresAt - 1)} 2026 · WIB
          </div>
        </div>
        <div className="pahlawan-event-bottom">
          <div className="pahlawan-event-rewards" aria-label="Hadiah quest event">
            {!!chain.length && (
              <div>
                <PointCoinIcon />
                <span>
                  <small>{chain.length} quest cerita</small>
                  <strong>Hingga {points(chain)} Point</strong>
                </span>
              </div>
            )}
            {!!daily.length && (
              <div>
                <PointCoinIcon />
                <span>
                  <small>Apel harian</small>
                  <strong>{points(daily)} Point / hari</strong>
                </span>
              </div>
            )}
            {!quests.length && <p>Jelajahi cerita dan misi Hari Pahlawan.</p>}
          </div>
          <div className="pahlawan-event-actions">
            <span>Selesaikan quest untuk meraih hadiah.</span>
            <button
              type="button"
              onClick={() => useHud.setState({ sheet: "quests", questTheme: "pahlawan" })}
            >
              Lihat quest event <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </GameModal>
  );
}
