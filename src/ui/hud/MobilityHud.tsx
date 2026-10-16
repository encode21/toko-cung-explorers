import { useWorldEditor } from "@/game/editor/store";
import { useEffect } from "react";
import { ArrowDown, ArrowUp, Users, Wind } from "lucide-react";
import { GameButton } from "@/ui/game-ui/GamePanel";
import { useMobility, mobilityCommand } from "@/game/mobility/store";
import { connectionId } from "@/net/channel-store";
import { useNet } from "@/net/net-store";
import "./mobility-hud.css";

export function MobilityHud() {
  const state = useMobility();
  const editor = useWorldEditor((s) => s.canEdit);
  const connected = useNet((s) => s.connected);
  const showFlight = state.canFly || editor;
  const roster = useNet((s) => s.roster);
  const pair = state.carries.find(
    (p) => p.carrier === connectionId || p.passenger === connectionId,
  );
  const name = (id: string) => roster.find((p) => p.id === id)?.name ?? "Pemain";
  useEffect(() => {
    const clear = () => useMobility.setState({ vertical: 0 });
    window.addEventListener("blur", clear);
    return () => {
      clear();
      window.removeEventListener("blur", clear);
    };
  }, []);
  if (!pair && !showFlight) return null;
  return (
    <div className="mobility-hud" data-hud-control>
      {pair && (
        <div className="mobility-card" role="status">
          <Users size={18} aria-hidden />
          <span>
            {pair.status === "pending"
              ? pair.passenger === connectionId
                ? `${name(pair.carrier)} ingin menggendongmu`
                : `Menunggu ${name(pair.passenger)}…`
              : pair.passenger === connectionId
                ? `Digendong ${name(pair.carrier)}`
                : `Menggendong ${name(pair.passenger)}`}
          </span>
          {pair.status === "pending" && pair.passenger === connectionId && (
            <>
              <GameButton
                disabled={state.busy}
                onClick={() => void mobilityCommand("accept", { id: pair.id })}
              >
                Terima
              </GameButton>
              <GameButton
                disabled={state.busy}
                onClick={() => void mobilityCommand("decline", { id: pair.id })}
              >
                Tolak
              </GameButton>
            </>
          )}
          {(pair.status === "active" || pair.carrier === connectionId) && (
            <GameButton
              disabled={state.busy}
              onClick={() => void mobilityCommand("release", { id: pair.id })}
            >
              {pair.status === "pending"
                ? "Batal"
                : pair.carrier === connectionId
                  ? "Turunkan"
                  : "Turun"}
            </GameButton>
          )}
        </div>
      )}
      {showFlight && (
        <div className="mobility-flight">
          <GameButton
            aria-pressed={state.flying}
            disabled={state.busy || !!pair || !state.canFly || !connected}
            onClick={() => void mobilityCommand("flight", { enabled: !state.flying })}
          >
            <Wind size={18} aria-hidden /> {state.flying ? "Akhiri terbang" : "Terbang · GM"}
          </GameButton>
          {state.error && <span role="status">{state.error}</span>}
          {!state.error && !state.canFly && (
            <span role="status">
              {state.confirmedAt
                ? "Izin terbang tidak tersedia untuk sesi ini."
                : "Memeriksa izin terbang…"}
            </span>
          )}
          {state.flying && (
            <>
              {([1, -1] as const).map((direction) => (
                <GameButton
                  key={direction}
                  aria-label={direction > 0 ? "Terbang naik" : "Terbang turun"}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    useMobility.setState({ vertical: direction });
                  }}
                  onPointerUp={() => useMobility.setState({ vertical: 0 })}
                  onPointerCancel={() => useMobility.setState({ vertical: 0 })}
                  onLostPointerCapture={() => useMobility.setState({ vertical: 0 })}
                >
                  {direction > 0 ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />}
                </GameButton>
              ))}
              <span className="mobility-flight-help">Space naik · Ctrl turun</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
