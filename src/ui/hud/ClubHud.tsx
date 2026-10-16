import { GamePanel } from "@/ui/game-ui/GamePanel";
import { useEffect } from "react";
import { useClub, clubCommand } from "@/game/club/store";
import { DANCES } from "@/game/club/model";
import { ClubRuntime } from "@/game/club/ClubRuntime";
import { connectionId } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useWorldEditor } from "@/game/editor/store";
import { useMobileHudLayout } from "@/hooks/use-mobile-hud";
import { DanceControls } from "./DanceControls";
import { DrinkControl } from "./DrinkControl";
import { ClubMusicPanel } from "./ClubMusicPanel";

const button =
  "min-h-11 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm hover:bg-white/20 disabled:opacity-40";
const buttonSm =
  "min-h-11 shrink-0 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/20 disabled:opacity-40";

export function ClubHud() {
  const s = useClub();
  const pos = useGame((g) => g.playerPos);
  const overlay = useGame((g) => g.overlay);
  const sheet = useHud((h) => h.sheet);
  const editing = useWorldEditor((e) => e.mode !== "PLAYER");
  const targets = useWorldEditor((e) => e.targets);
  const { mobile } = useMobileHudLayout();
  useEffect(() => {
    if (!s.inside && (sheet === "club" || sheet === "dance")) useHud.getState().setSheet(null);
  }, [s.inside, sheet]);
  const near = (type: string, exit = false) => {
    const t = targets.find(
      (t) =>
        t.active &&
        t.type === type &&
        (type !== "CLUB_ENTRANCE" || t.tags.includes("club-exit") === exit),
    );
    return (
      !!t &&
      Math.hypot(pos[0] - t.position.x, pos[1] - 0.83 - t.position.y, pos[2] - t.position.z) <
        t.radius + 1
    );
  };
  const booth = near("DJ_BOOTH");
  const myDance = s.data?.members[connectionId]?.dance;
  const open = sheet === "club" || sheet === "dance";
  const act = (action: string, data?: Record<string, unknown>) => void clubCommand(action, data);
  const btn = mobile ? buttonSm : button;

  return (
    <>
      <ClubRuntime />
      {!editing && overlay === "none" && s.inside && !open && (
        <>
          <DanceControls />
          <DrinkControl />
        </>
      )}
      {!editing && overlay === "none" && (
        <>
          {!open && s.error && (
            <p
              role="alert"
              className="absolute bottom-56 left-1/2 max-w-[90vw] -translate-x-1/2 rounded-xl bg-slate-950/95 p-3 text-sm text-rose-300"
            >
              {s.error}
            </p>
          )}
          {s.inside && sheet === "club" && (
            <ClubMusicPanel nearBooth={booth} onClose={() => useHud.getState().setSheet(null)} />
          )}
          {s.inside && sheet === "dance" && (
            <GamePanel
              title="Dance wheel"
              onClose={() => useHud.getState().setSheet(null)}
              className="game-dance-panel"
            >
              {s.error && (
                <p role="alert" className="my-2 text-sm text-rose-300">
                  {s.error}
                </p>
              )}
              <div className="game-dance-layout">
                <div
                  className={`relative mx-auto my-3 ${mobile ? "h-56 w-56" : "my-4 h-72 w-72"}`}
                  role="group"
                  aria-label="Eight dances"
                >
                  {DANCES.map((id, i) => {
                    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                    const r = 78;
                    const origin = 84;
                    return (
                      <button
                        key={id}
                        disabled={s.busy}
                        className={`${btn} absolute h-12 w-14 px-1 text-[10px] capitalize ${myDance?.id === id && !s.suppressed ? "!bg-fuchsia-700" : ""}`}
                        style={{
                          left: origin + Math.cos(angle) * r,
                          top: origin + Math.sin(angle) * r,
                        }}
                        onClick={() => {
                          act("dance", { danceId: id });
                          useHud.getState().setSheet(null);
                        }}
                      >
                        {id}
                      </button>
                    );
                  })}
                  <button
                    className={`${btn} absolute left-[5.5rem] top-[5.5rem] w-14 px-1 text-[10px]`}
                    onClick={() => act("stop-dance")}
                  >
                    Stop
                  </button>
                </div>
                <div>
                  <p className="text-xs text-white/60 sm:text-sm">
                    Bergerak untuk berhenti. Dekati pemain yang menari untuk Sync Dance.
                  </p>
                </div>
              </div>
            </GamePanel>
          )}
        </>
      )}
    </>
  );
}
