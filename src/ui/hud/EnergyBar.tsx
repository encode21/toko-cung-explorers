import { useEnergy } from "@/game/energy/store";
import { energyBand } from "@/game/energy/model";
import { useGame } from "@/state/game-store";

const COLOR = { ok: "#4ade80", tired: "#fb923c", critical: "#ef4444" };
/** Compact ⚡ bar under the player frame; hidden while the energy system is off. */
export function EnergyBar() {
  const e = useEnergy();
  if (!e.enabled) return null;
  const value = Math.round(e.value);
  return (
    <button
      type="button"
      data-hud-control
      aria-label={`Energi ${value} dari ${e.max}`}
      className="pointer-events-auto mt-1 flex w-full items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[10px] leading-none text-white"
      onClick={() =>
        useGame.getState().setToast(`Energi ${value}/${e.max} · tidur di rumah untuk isi penuh`)
      }
    >
      <span aria-hidden>⚡</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, (value / e.max) * 100))}%`,
            background: COLOR[energyBand(e)],
          }}
        />
      </span>
      <span className="tabular-nums">{value}</span>
    </button>
  );
}
