import { GameTooltip } from "@/ui/game-ui/GamePrimitives";
import { Bell, Coins } from "lucide-react";
import { useGameCore } from "@/game/core/store";
import { useHud } from "@/state/hud-store";

/** Individual wallet and notification items beside the player frame; other utilities live in the dock. */
export function UtilityBar() {
  const points = useGameCore((s) => s.snapshot?.wallet.current_balance ?? 0);
  const unseen = useHud((s) => s.unseen);
  const toggle = useHud((s) => s.toggleSheet);
  return (
    <div
      data-hud-control
      data-utility-bar
      className="mmo-utilitybar pointer-events-auto flex items-center"
    >
      <button
        type="button"
        className="mmo-utility-item mmo-wallet"
        title={`${points.toLocaleString("id-ID")} Point`}
        aria-label={`${points} Point — buka progression`}
        onClick={() => toggle("profile")}
      >
        <Coins className="size-4 text-amber-200" aria-hidden />
        <span className="mmo-point-count">
          {new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(
            points,
          )}
        </span>
      </button>
      <GameTooltip label="Notifikasi">
        <button
          type="button"
          aria-label="Notifikasi"
          onClick={() => toggle("feed")}
          className="mmo-utility-item relative"
        >
          <Bell className="size-4" />
          {!!unseen && (
            <span className="absolute top-0 right-0 rounded-full bg-world-brand px-1 text-[10px] text-white">
              {unseen > 9 ? "9+" : unseen}
            </span>
          )}
        </button>
      </GameTooltip>
    </div>
  );
}
