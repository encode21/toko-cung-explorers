import { useEnergy } from "@/game/energy/store";
import { energyBand } from "@/game/energy/model";

const COLOR = { ok: "#4fc36a", tired: "#f08a24", critical: "#e0443a" };
/** ⚡ energy line inside the player card, right under the EXP bar; hidden while energy is off. */
export function EnergyBar() {
  const e = useEnergy();
  if (!e.enabled) return null;
  const value = Math.round(e.value);
  return (
    <span
      className="mmo-energy"
      role="meter"
      aria-label={`Energi ${value} dari ${e.max}`}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={e.max}
    >
      <span aria-hidden className="mmo-energy-icon">
        ⚡
      </span>
      <span className="mmo-energy-track">
        <span
          style={{
            width: `${Math.max(0, Math.min(100, (value / e.max) * 100))}%`,
            background: COLOR[energyBand(e)],
          }}
        />
      </span>
      <span className="mmo-energy-value">{value}</span>
    </span>
  );
}
