import type { ReactNode } from "react";
import { useNpcConversation } from "@/hooks/use-npc-conversation";

/** Hide the HUD without remounting its music, mission runtimes, or local state. */
export function GameplayHudLayer({
  children,
  panels,
}: {
  children: ReactNode;
  panels?: ReactNode;
}) {
  const talking = useNpcConversation();
  return (
    <>
      <div
        data-gameplay-hud
        style={{ display: talking ? "none" : "contents" }}
        inert={talking}
        aria-hidden={talking || undefined}
      >
        {children}
      </div>
      {/* Portalled panels must wait until the conversation has closed. */}
      {!talking && panels}
    </>
  );
}
