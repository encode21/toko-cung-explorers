import { useState } from "react";
import { HudBalance } from "./HudBalance";
import { useSceneTime } from "@/game/time/scene-time";
import { gameDateLabel, gameMoment } from "@/game/time/calendar";
import { useHud } from "@/state/hud-store";
import { useGameCore } from "@/game/core/store";
import { useWarung } from "@/game/warung/store";
import { logoutAccount, useAccount } from "@/auth/useSession";
import "./player-status.css";

/** Read-only Point balance; detailed progression remains in the player profile. */
export function UtilityBar() {
  const points = useGameCore((s) => s.snapshot?.wallet.current_balance);
  // Kas usaha (shared business wallet); only once the player owns a warung.
  const kas = useWarung((s) => s.data?.warung?.cash);
  // Inside a warung its own top bar shows Kas and sits where these pills are.
  const inWarung = useWarung((s) => !!s.inside);
  const guest = useAccount((s) => !!s.user?.guest);
  const [confirmGuest, setConfirmGuest] = useState(false);
  if (inWarung) return null;
  return (
    <div data-utility-bar className="mmo-utilitybar" role="group" aria-label="Point dan Kas pemain">
      <HudBalance kind="point" value={points} />
      {guest && (
        <button
          type="button"
          className="mmo-guest-pill"
          title="Mode tamu: progres hilang dalam 24 jam"
          onClick={() => {
            // Two taps instead of a native confirm: progress does not carry over.
            if (!confirmGuest) {
              setConfirmGuest(true);
              window.setTimeout(() => setConfirmGuest(false), 4000);
              return;
            }
            void logoutAccount().then(() => window.location.assign("/auth"));
          }}
        >
          {confirmGuest ? "Progres hilang · ketuk lagi" : "Tamu · Daftar"}
        </button>
      )}
      {kas != null && <HudBalance kind="kas" value={kas} />}
      <GameClockPill />
    </div>
  );
}

/** Game clock + date ("07.53 · Sab, 31 Jan"); tap opens the phone Kalender. */
function GameClockPill() {
  const time = useSceneTime((s) => s.currentTime);
  return (
    <button
      type="button"
      className="mmo-clock-pill"
      aria-label={`Jam ${time}, ${gameDateLabel(Date.now())}. Buka kalender`}
      onClick={() => useHud.getState().setSheet("calendar")}
    >
      🕖 {time.replace(":", ".")} · {gameMoment(Date.now()).split(" · ")[0]}
    </button>
  );
}
