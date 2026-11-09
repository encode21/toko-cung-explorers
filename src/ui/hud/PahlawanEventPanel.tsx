import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flag,
  Mountain,
} from "lucide-react";
import { useReactiveWorld } from "@/game/reactive-world/store";
import { command, useGameCore } from "@/game/core/store";
import { useProfile } from "@/identity/profile-store";
import { useHud } from "@/state/hud-store";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { PointCoinIcon } from "@/ui/game-ui/PointCoinIcon";
import { MAP_ANNOUNCEMENT, markMapAnnouncementSeen } from "./announcements";
import "./pahlawan-event.css";

const date = (time: number) =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
  }).format(time);

type Slide = "pahlawan" | typeof MAP_ANNOUNCEMENT;

/** Announcement carousel: one modal, ✕ dismisses every slide at once. */
export function PahlawanEventPanel() {
  const event = useReactiveWorld((s) =>
    s.events.find((e) => e.type === "NATIONAL_DAY" && e.payload.theme === "pahlawan"),
  );
  const uid = useProfile((s) => s.profile?.id);
  const slides: Slide[] = event ? ["pahlawan", MAP_ANNOUNCEMENT] : [MAP_ANNOUNCEMENT];
  const [index, setIndex] = useState(0);
  const current = Math.min(index, slides.length - 1);
  const slide = slides[current];
  useEffect(() => {
    if (slide === MAP_ANNOUNCEMENT) markMapAnnouncementSeen(uid);
  }, [slide, uid]);
  return (
    <GameModal
      title={slide === "pahlawan" ? "Event Hari Pahlawan" : "Peta baru: Pegunungan"}
      wide
      className="game-pahlawan-event"
      bodyClassName="game-scroll-flush"
      onClose={() => useHud.getState().setSheet(null)}
    >
      <div className="announce-carousel">
        {slide === "pahlawan" && event ? (
          <PahlawanSlide startedAt={event.startedAt} expiresAt={event.expiresAt} />
        ) : (
          <MapSlide />
        )}
        {slides.length > 1 && (
          <>
            {current > 0 && (
              <button
                type="button"
                className="announce-nav announce-prev"
                aria-label="Sebelumnya"
                onClick={() => setIndex(current - 1)}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
            )}
            {current < slides.length - 1 && (
              <button
                type="button"
                className="announce-nav announce-next"
                aria-label="Berikutnya"
                onClick={() => setIndex(current + 1)}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            )}
            <div className="announce-dots" role="tablist" aria-label="Pengumuman">
              {slides.map((id, i) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={i === current}
                  aria-label={`Pengumuman ${i + 1} dari ${slides.length}`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </GameModal>
  );
}

function PahlawanSlide({ startedAt, expiresAt }: { startedAt: number; expiresAt: number }) {
  const snapshot = useGameCore((s) => s.snapshot);
  useEffect(() => {
    void command("read");
  }, []);
  const quests =
    snapshot?.quests.filter((q) => q.theme === "pahlawan" && q.campaign_id === "pahlawan-2026") ??
    [];
  const chain = quests.filter((q) => q.repeat_policy === "ONCE");
  const daily = quests.filter((q) => q.repeat_policy === "DAILY");
  const points = (list: typeof quests) =>
    list.reduce((sum, q) => sum + q.rewards.point, 0).toLocaleString("id-ID");
  return (
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
          {date(startedAt)} – {date(expiresAt - 1)} 2026 · WIB
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
  );
}

function MapSlide() {
  return (
    <section className="pahlawan-event-banner announce-map">
      <div className="pahlawan-event-copy">
        <span className="pahlawan-event-kicker">PETA BARU · TOKO CUNG WORLD</span>
        <h3>
          JELAJAHI
          <br />
          <span>PEGUNUNGAN</span>
        </h3>
        <p>
          Terbang dengan helikopter dari helipad kota.
          <br />
          Daki jalur basecamp sampai ke puncak.
        </p>
      </div>
      <div className="pahlawan-event-bottom">
        <div className="pahlawan-event-rewards">
          <div>
            <Mountain aria-hidden="true" />
            <span>
              <small>Lokasi baru</small>
              <strong>Basecamp & puncak</strong>
            </span>
          </div>
          <div>
            <Flag aria-hidden="true" />
            <span>
              <small>Jalur pendakian</small>
              <strong>4 checkpoint</strong>
            </span>
          </div>
        </div>
        <div className="pahlawan-event-actions">
          <span>Buka Peta Dunia untuk mulai perjalanan.</span>
          <button type="button" onClick={() => useHud.getState().setSheet("map")}>
            Buka Peta Dunia <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
