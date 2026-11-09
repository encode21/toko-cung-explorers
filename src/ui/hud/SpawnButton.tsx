import { isMountainPosition } from "@/game/mountain/model";
import { useMountain } from "@/game/mountain/store";
import { useRecovery, returnToSpawn } from "@/game/player/recovery";
import { useMobility } from "@/game/mobility/store";
import { useGame } from "@/state/game-store";
import { HudMenuArtwork } from "./HudMenuArtwork";

/** Always reachable in the world, including when stuck in geometry or being carried. */
export function SpawnButton() {
  const mountain = useGame((s) => isMountainPosition(s.playerPos[0], s.playerPos[2]));
  const checkpoint = useMountain((s) => s.checkpoint);
  const flight = useMountain((s) => !!s.flight);
  const busy = useRecovery((s) => s.busy);
  const mobilityBusy = useMobility((s) => s.busy);
  const teleporting = useGame((s) => !!s.pendingTeleport);
  return (
    <button
      type="button"
      className="mmo-side-button"
      data-hud-control
      data-spawn-button
      aria-label={mountain ? "Kembali ke pos pendakian terakhir" : "Kembali ke spawn"}
      title={
        mountain
          ? "Tersangkut? Kembali ke checkpoint atau basecamp"
          : "Tersangkut? Kembali ke titik spawn"
      }
      disabled={busy || mobilityBusy || teleporting || flight}
      onClick={() => void returnToSpawn()}
    >
      <HudMenuArtwork kind="spawn" />
      <span className="mmo-side-label">
        {busy || teleporting
          ? "Memindahkan…"
          : mountain
            ? checkpoint
              ? "Pos CP"
              : "Basecamp"
            : "Spawn"}
      </span>
    </button>
  );
}
