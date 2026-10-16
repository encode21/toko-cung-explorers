import { PlayerInteractionMenu } from "@/ui/profile/PlayerInteractionMenu";
import { DungeonRuntime } from "@/game/dungeon/DungeonRuntime";
import { ConnectionStatus } from "@/ui/hud/ConnectionStatus";
import { GameCoreRuntime } from "@/game/core/GameCoreRuntime";
import { useEffect } from "react";
import { useGame } from "@/state/game-store";
import { useProfile } from "@/identity/profile-store";
import { KioskOverlay } from "@/ui/kiosk/KioskOverlay";
import { Hud } from "@/ui/hud/Hud";
import { DialogueOverlay } from "@/ui/dialogue/DialogueOverlay";
import { DungeonDialogueOverlay } from "@/ui/dialogue/DungeonDialogueOverlay";
import { QuestGiverDialogueOverlay } from "@/ui/dialogue/QuestGiverDialogueOverlay";
import { WorldChat } from "@/ui/chat/WorldChat";
import { MobileControls } from "@/ui/hud/MobileControls";
import { SecretDiscoveryCard } from "@/ui/secret/SecretDiscoveryCard";
import { SecretDebug } from "@/ui/secret/SecretDebug";
import { QuestCompleteOverlay } from "@/ui/quests/QuestCompleteOverlay";
import { GameplayHudLayer } from "@/ui/hud/GameplayHudLayer";

export function GameUi({ mobileControlsEnabled = true }: { mobileControlsEnabled?: boolean }) {
  const overlay = useGame((s) => s.overlay);
  const loadProfile = useProfile((s) => s.load);
  const profile = useProfile((s) => s.profile);
  const profileError = useProfile((s) => s.error);
  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);
  // Retry sekali jika masuk dunia tanpa profil (race/network).
  useEffect(() => {
    if (profile || !profileError) return;
    const timer = window.setTimeout(() => void loadProfile(), 1200);
    return () => clearTimeout(timer);
  }, [profile, profileError, loadProfile]);
  return (
    <>
      <GameCoreRuntime />
      <DungeonRuntime />
      <WorldChat />
      <GameplayHudLayer
        panels={
          <>
            <PlayerInteractionMenu />
            <SecretDiscoveryCard />
            <QuestCompleteOverlay />
          </>
        }
      >
        <Hud />
        {import.meta.env.DEV && <SecretDebug />}
        <ConnectionStatus />
        {mobileControlsEnabled && <MobileControls />}
      </GameplayHudLayer>
      {overlay === "kiosk" && <KioskOverlay />}
      {overlay === "dialogue" && <DialogueOverlay />}
      <DungeonDialogueOverlay />
      <QuestGiverDialogueOverlay />
    </>
  );
}
