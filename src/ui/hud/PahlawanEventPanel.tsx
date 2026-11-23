import { MOUNTAIN_CHECKPOINT_COUNT } from "@/game/mountain/model";
import { useEffect } from "react";
import { ArrowRight, Flag, Mountain } from "lucide-react";
import { useProfile } from "@/identity/profile-store";
import { useHud } from "@/state/hud-store";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { markMapAnnouncementSeen } from "./announcements";
import "./pahlawan-event.css";

/** Pengumuman peta baru (slide event Hari Pahlawan sudah dihapus). */
export function PahlawanEventPanel() {
  const uid = useProfile((s) => s.profile?.id);
  useEffect(() => markMapAnnouncementSeen(uid), [uid]);
  return (
    <GameModal
      title="Peta baru: Pegunungan"
      wide
      className="game-pahlawan-event"
      bodyClassName="game-scroll-flush"
      onClose={() => useHud.getState().setSheet(null)}
    >
      <div className="announce-carousel">
        <MapSlide />
      </div>
    </GameModal>
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
              <strong>{MOUNTAIN_CHECKPOINT_COUNT} checkpoint</strong>
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
