import type { ReactNode } from "react";
import { useNpcConversation } from "@/hooks/use-npc-conversation";
import { useHud } from "@/state/hud-store";
import { useGameUi } from "@/state/game-ui-store";

/** Hide the HUD without remounting its music, mission runtimes, or local state. */
export function GameplayHudLayer({
  children,
  panels,
}: {
  children: ReactNode;
  panels?: ReactNode;
}) {
  const talking = useNpcConversation();
  const shopping = useHud(
    (s) =>
      s.sheet === "grosir" ||
      s.sheet === "showroom" ||
      s.sheet === "showroom-gear" ||
      s.sheet === "garasi",
  );
  const arriving = useGameUi((s) => s.storeIntro || s.showroomIntro);
  const hidden = talking || shopping || arriving;
  return (
    <>
      <div
        data-gameplay-hud
        style={{ display: hidden ? "none" : "contents" }}
        inert={hidden}
        aria-hidden={hidden || undefined}
      >
        {children}
      </div>
      {/* Vehicle and shopping screens portal outside this layer; other panels wait until focus ends. */}
      {!hidden && panels}
    </>
  );
}
