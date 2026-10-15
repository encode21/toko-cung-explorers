import { PointCoinIcon } from "@/ui/game-ui/PointCoinIcon";
import { useGameCore } from "@/game/core/store";
import "./player-status.css";

const compactNumber = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Read-only Point balance; detailed progression remains in the player profile. */
export function UtilityBar() {
  const points = useGameCore((s) => s.snapshot?.wallet.current_balance);
  return (
    <div data-utility-bar className="mmo-utilitybar" role="group" aria-label="Point pemain">
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
    </div>
  );
}
