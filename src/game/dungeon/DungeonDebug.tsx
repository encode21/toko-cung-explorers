import { useDungeon, dungeonCommand } from "./store";
import { useGame } from "@/state/game-store";
/** Only imported by the DEV branch. Backend debug mutations live in local-only artisan commands. */
export function DungeonDebug() {
  const state = useDungeon();
  if (!import.meta.env.DEV) return null;
  return (
    <details
      data-ui-panel
      className="pointer-events-auto absolute bottom-2 left-1/2 z-40 max-w-[45vw] rounded bg-black/80 p-2 text-[10px] text-white"
    >
      <summary>Dungeon DEV</summary>
      <button
        className="min-h-11"
        onClick={() => {
          const p = state.data?.config.entrance;
          if (!p || state.data?.instance) return;
          const spawn: [number, number, number] = [p[0], p[1] + 0.83, p[2]];
          useGame.setState({ playerPos: spawn });
          useDungeon.setState((s) => ({
            spawn,
            sceneRevision: s.sceneRevision + 1,
            tracked: true,
          }));
        }}
      >
        Teleport to entrance (server still validates)
      </button>
      <button className="block min-h-11" onClick={() => void dungeonCommand("read")}>
        Inspect / refresh instance
      </button>
      <pre className="max-h-40 overflow-auto">{JSON.stringify(state.data?.instance, null, 2)}</pre>
      <p>Server tools: php artisan world:dungeon-dev --help</p>
    </details>
  );
}
