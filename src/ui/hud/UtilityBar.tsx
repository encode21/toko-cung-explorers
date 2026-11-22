import { PointCoinIcon } from "@/ui/game-ui/PointCoinIcon";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import { useGameCore } from "@/game/core/store";
import { useWarung } from "@/game/warung/store";
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
