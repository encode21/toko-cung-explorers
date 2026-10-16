import { useEffect, useState } from "react";
import { DANCES } from "@/game/club/model";
import { clubCommand, useClub } from "@/game/club/store";
import { connectionId } from "@/net/channel-store";
import { useGameUi } from "@/state/game-ui-store";
import { useGame } from "@/state/game-store";
import "./dance-wheel.css";

/** Jump-adjacent dance trigger + Play Together radial picker while in the club venue. */
export function DanceControls() {
  const inside = useClub((s) => s.inside);
  const busy = useClub((s) => s.busy);
  const suppressed = useClub((s) => s.suppressed);
  const members = useClub((s) => s.data?.members);
  const overlay = useGame((s) => s.overlay);
  const panels = useGameUi((s) => s.panels);
  const [open, setOpen] = useState(false);
  const myDance = members?.[connectionId]?.dance;
  const peers = Object.entries(members ?? {}).filter(
    ([id, member]) => id !== connectionId && member.dance,
  );

  useEffect(() => {
    if (!inside || overlay !== "none" || panels > 0) setOpen(false);
  }, [inside, overlay, panels]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-dance-controls]")) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  if (!inside || overlay !== "none") return null;

  const act = async (action: string, data?: Record<string, unknown>) => {
    await clubCommand(action, data);
    setOpen(false);
  };

  return (
    <div className="dance-controls" data-dance-controls data-open={open} data-hud-control>
      <button
        type="button"
        className="dance-trigger"
        data-mobile-interact
        data-mobile-dance
        aria-label="Dance"
        aria-expanded={open}
        aria-controls="club-dance-wheel"
        data-active={!!myDance && !suppressed}
        onClick={() => setOpen((value) => !value)}
      >
        <img
          className="dance-trigger-icon"
          src="/assets/hud/dance-icon.png"
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      </button>
      {open && (
        <>
          <div
            id="club-dance-wheel"
            className="dance-wheel"
            role="group"
            aria-label="Pilihan dance"
          >
            {DANCES.map((id, index) => {
              const angle = (index / DANCES.length) * Math.PI * 2 - Math.PI / 2;
              const radius = 92;
              return (
                <button
                  key={id}
                  type="button"
                  className="dance-wheel-segment"
                  disabled={busy}
                  aria-pressed={myDance?.id === id && !suppressed}
                  style={{
                    left: `calc(50% + ${Math.cos(angle) * radius}px)`,
                    top: `calc(50% + ${Math.sin(angle) * radius}px)`,
                  }}
                  onClick={() => void act("dance", { danceId: id })}
                >
                  {id}
                </button>
              );
            })}
            <button
              type="button"
              className="dance-wheel-stop"
              disabled={busy || !myDance}
              onClick={() => void act("stop-dance")}
            >
              Stop
            </button>
          </div>
          {!!peers.length && (
            <div className="dance-wheel-sync" aria-label="Sync dance">
              {peers.map(([id, member]) => (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  onClick={() => void act("sync", { target: id })}
                >
                  Sync · {member.name} · {member.dance?.id}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
