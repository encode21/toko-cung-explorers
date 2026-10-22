import { useMissions } from "@/game/missions/store";
import { truckInstruction } from "@/game/missions/truck-model";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { playerId } from "@/net/useWorldChannel";
import { useMobileHudLayout } from "@/hooks/use-mobile-hud";
import "./truck-hud.css";
export function TruckHud() {
  const m = useMissions((s) => s.session.active);
  const overlay = useGame((s) => s.overlay),
    sheet = useHud((s) => s.sheet);
  const { touch } = useMobileHudLayout();
  if (!m?.truck || overlay !== "none" || sheet) return null;
  const driving = m.truck.driver === playerId;
  return (
    <div className="truck-status" role="status" aria-live="polite">
      <strong>{driving ? "Antar ke gudang belakang" : truckInstruction(m)}</strong>
      {driving && (
        <span>
          {touch
            ? "Joystick: gas / mundur / belok · Tahan REM"
            : "W/S: gas / mundur · A/D: belok · Space: rem · F: turun"}
        </span>
      )}
    </div>
  );
}
