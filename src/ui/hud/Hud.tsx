import { useEffect } from "react";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useNet } from "@/net/net-store";
import { useTouchControls } from "@/hooks/use-touch";
import { AmbientMusic } from "@/game/audio/AmbientMusic";
import { WorldHeader } from "@/ui/hud/WorldHeader";
import { UtilityBar } from "@/ui/hud/UtilityBar";
import { ContextPanel } from "@/ui/hud/ContextPanel";
import { ActionDock } from "@/ui/hud/ActionDock";
import { EventFeed, useFeedSources } from "@/ui/hud/EventFeed";
import { HudSheetHost } from "@/ui/hud/HudSheet";
import { Minimap } from "@/ui/minimap/Minimap";

function Toast() {
  const toast = useGame((s) => s.toast);
  const setToast = useGame((s) => s.setToast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast, setToast]);
  if (!toast) return null;
  return (
    <div className="-translate-x-1/2 pointer-events-none absolute top-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))] left-1/2 max-w-[calc(100vw-2rem)] rounded-full hud-glass px-4 py-2 text-center text-sm">
      {toast}
    </div>
  );
}

/** HUD kota virtual: header lokasi, utilitas, peta, feed, konteks, dock, sheet. */
export function Hud() {
  const touch = useTouchControls();
  const overlay = useGame((s) => s.overlay);
  const sheet = useHud((s) => s.sheet);
  const setSheet = useHud((s) => s.setSheet);
  const setChatOpen = useNet((s) => s.setChatOpen);
  useFeedSources();

  useEffect(() => setChatOpen(sheet === "chat"), [sheet, setChatOpen]);
  useEffect(() => {
    if (overlay !== "none") setSheet(null);
  }, [overlay, setSheet]);

  const playing = overlay === "none";

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      <AmbientMusic />
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] left-[max(0.75rem,env(safe-area-inset-left))] grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <WorldHeader />
        <div className="flex flex-col items-end gap-2">
          <UtilityBar />
          {!touch && playing && sheet !== "map" && (
            <button
              type="button"
              data-hud-control
              onClick={() => setSheet("map")}
              aria-label="Perbesar peta"
              className="pointer-events-auto rounded-full p-1 hud-glass transition hover:scale-[1.03]"
            >
              <Minimap size={132} range={40} round />
            </button>
          )}
        </div>
      </div>

      {playing && <EventFeed compact={touch} />}
      {playing && <ContextPanel touch={touch} />}
      <Toast />
      {playing && <HudSheetHost />}
      {playing && <ActionDock />}
    </div>
  );
}
