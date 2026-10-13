import { GameTooltip } from "@/ui/game-ui/GamePrimitives";
import { Bell, Coins } from "lucide-react";
import { useGameCore } from "@/game/core/store";
import { useHud } from "@/state/hud-store";

/** Wallet and notifications beside the minimap; other utilities live in the dock. */
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
        className="mmo-wallet"
        aria-label={`${points} Point — buka progression`}
        onClick={() => toggle("profile")}
      >
        <Coins className="size-4 text-amber-200" aria-hidden />
        <span>{points.toLocaleString("id-ID")}</span>
      </button>
      <GameTooltip label="Notifikasi">
        <button
          type="button"
          aria-label="Notifikasi"
          onClick={() => toggle("feed")}
          className="relative grid size-11 place-items-center rounded-full hover:bg-white/10"
        >
          <Bell className="size-5" />
          {!!unseen && (
            <span className="absolute top-1 right-1 rounded-full bg-world-brand px-1 text-[10px] text-white">
              {unseen > 9 ? "9+" : unseen}
            </span>
          )}
        </button>
      </GameTooltip>
    </div>
  );
}
