import { useState } from "react";
import { PointCoinIcon } from "@/ui/game-ui/PointCoinIcon";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import { useGameCore } from "@/game/core/store";
import { useWarung } from "@/game/warung/store";
import { logoutAccount, useAccount } from "@/auth/useSession";
import "./player-status.css";

const compactNumber = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

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
      <div
        className="mmo-resource"
        data-hud-resource="point"
        role="img"
        aria-label={
          points == null ? "Point belum tersedia" : `${points.toLocaleString("id-ID")} Point`
        }
        title={points == null ? "Point belum tersedia" : `${points.toLocaleString("id-ID")} Point`}
      >
        <PointCoinIcon className="mmo-resource-art" />
        <span className="mmo-resource-value">
          {points == null ? "—" : compactNumber.format(points)}
        </span>
      </div>
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
      {kas != null && (
        <div
          className="mmo-resource"
          data-hud-resource="kas"
          role="img"
          aria-label={`Kas usaha Rp${kas.toLocaleString("id-ID")}`}
          title={`Kas usaha Rp${kas.toLocaleString("id-ID")} (simulasi)`}
        >
          <KasMoneyIcon className="mmo-resource-art" />
          <span className="mmo-resource-value">Rp{compactNumber.format(kas)}</span>
        </div>
      )}
    </div>
  );
}
