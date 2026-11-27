import React from "react";
import { createRoot } from "react-dom/client";
import { useAccount } from "@/auth/useSession";
import { useStory, clearStory } from "@/game/story/store";
import { useHud } from "@/state/hud-store";
import { useGameCore } from "@/game/core/store";
import { useGame } from "@/state/game-store";
import { useProlog } from "@/game/prolog/store";
import { useWorldViewport } from "@/hooks/use-world-viewport";
import { ActionDock } from "@/ui/hud/ActionDock";
import { HudSheetHost } from "@/ui/hud/HudSheet";
import "@/styles.css";

useAccount.setState({ user: null, loading: false, initialized: true });
useGameCore.setState({ snapshot: null });
useGame.setState({ overlay: "none", inside: false });
useProlog.setState({ data: null });
Object.assign(window, {
  hud: useHud,
  account: useAccount,
  story: useStory,
  clearStory,
  core: useGameCore,
  game: useGame,
});
function Fixture() {
  const ref = useWorldViewport();
  return (
    <main
      ref={ref}
      className="world-viewport game-ui"
      style={{ background: "linear-gradient(140deg, #b7cebd, #7396a0 65%, #415f6b)" }}
    >
      <div className="mmo-hud">
        <ActionDock inHome={false} />
      </div>
      <HudSheetHost />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
