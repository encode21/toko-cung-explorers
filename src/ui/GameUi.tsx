import { DungeonRuntime } from "@/game/dungeon/DungeonRuntime";
import { DungeonHud } from "@/ui/hud/DungeonHud";
import { ConnectionStatus } from "@/ui/hud/ConnectionStatus";
import { GameCoreRuntime } from "@/game/core/GameCoreRuntime";
import { useEffect } from "react";
import { useGame } from "@/state/game-store";
import { useProfile } from "@/identity/profile-store";
import { KioskOverlay } from "@/ui/kiosk/KioskOverlay";
import { Hud } from "@/ui/hud/Hud";
import { DialogueOverlay } from "@/ui/dialogue/DialogueOverlay";
import { WorldChat } from "@/ui/chat/WorldChat";
import { MobileControls } from "@/ui/hud/MobileControls";

export function GameUi({ mobileControlsEnabled = true }: { mobileControlsEnabled?: boolean }) {
  const overlay = useGame((s) => s.overlay);
  const loadProfile = useProfile((s) => s.load);
  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);
  return (
    <>
      <GameCoreRuntime />
      <DungeonRuntime />
      <DungeonHud />
      <Hud />
      <ConnectionStatus />
      <WorldChat />
      {mobileControlsEnabled && <MobileControls />}
      {overlay === "kiosk" && <KioskOverlay />}
      {overlay === "dialogue" && <DialogueOverlay />}
    </>
  );
}
