import { useRecovery, returnToSpawn } from "@/game/player/recovery";
import { useMobility } from "@/game/mobility/store";
import { useGame } from "@/state/game-store";
import { HudMenuArtwork } from "./HudMenuArtwork";

/** Always reachable in the world, including when stuck in geometry or being carried. */
export function SpawnButton() {
  const busy = useRecovery((s) => s.busy);
  const mobilityBusy = useMobility((s) => s.busy);
  const teleporting = useGame((s) => !!s.pendingTeleport);
  return (
    <button
      type="button"
      className="mmo-side-button"
      data-hud-control
      data-spawn-button
      aria-label="Kembali ke spawn"
      title="Tersangkut? Kembali ke titik spawn"
      disabled={busy || mobilityBusy || teleporting}
      onClick={() => void returnToSpawn()}
    >
      <HudMenuArtwork kind="spawn" />
      <span className="mmo-side-label">{busy || teleporting ? "Memindahkan…" : "Spawn"}</span>
    </button>
  );
}
