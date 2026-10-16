import { dailyFixture } from "./daily";
import { useDaily, dailyCommand, openDailyNpc } from "@/game/daily/store";
import { useCameraZoom } from "@/game/player/camera-zoom";
import { useGameplayZoom } from "@/game/player/useGameplayZoom";
import { useState } from "react";
import { GuidancePreview } from "./guidance";
import { ActionCameraFixture } from "./action-camera";
import { useKeyboard } from "@/game/player/useKeyboard";
import { DialogueOverlay } from "@/ui/dialogue/DialogueOverlay";
import { PlayerInteractionMenu } from "@/ui/profile/PlayerInteractionMenu";
import React, { useEffect } from "react";
import { LandscapeOrientationGuard } from "@/ui/game-ui/LandscapeOrientationGuard";
import { useWorldViewport } from "@/hooks/use-world-viewport";
import { KioskOverlay } from "@/ui/kiosk/KioskOverlay";
import { SecretDiscoveryCard } from "@/ui/secret/SecretDiscoveryCard";
import { DungeonDialogueOverlay } from "@/ui/dialogue/DungeonDialogueOverlay";
import { QuestGiverDialogueOverlay } from "@/ui/dialogue/QuestGiverDialogueOverlay";
import { QuestCompleteOverlay } from "@/ui/quests/QuestCompleteOverlay";
import { useSecretQuest } from "@/game/secret/store";
import { useDungeonDialogue } from "@/game/dungeon/dialogue-store";
import { useQuestCompletion } from "@/game/core/completion-store";
import { useProfile } from "@/identity/profile-store";
import { avatarFromSeed } from "@/identity/avatar";
import { useTouchDrive } from "@/game/player/touch-drive";
import { useClub } from "@/game/club/store";
import { useWorldEditor } from "@/game/editor/store";
import { connectionId } from "@/net/channel-store";
import { createRoot } from "react-dom/client";
import { Hud } from "@/ui/hud/Hud";
import { GameplayHudLayer } from "@/ui/hud/GameplayHudLayer";
import { MobileControls } from "@/ui/hud/MobileControls";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useNet } from "@/net/net-store";
import { useGameCore } from "@/game/core/store";
import { useControls } from "@/game/player/control-state";
import { useDungeon } from "@/game/dungeon/store";
import { useMissions } from "@/game/missions/store";
import { useChannels } from "@/net/channel-store";
import { getActiveChatEmote, registerChatEmoteGuard } from "@/game/social/social-actions";
import "@/styles.css";

registerChatEmoteGuard(() => null);
window.getActiveChatEmote = getActiveChatEmote;
useNet.setState({
  name: "Cung Explorer",
  connected: true,
  roster: [{ id: "bob", name: "Budi", avatar: avatarFromSeed("bob"), level: 2 }],
});
useControls.setState({ playerReady: true });
useChannels.setState({ playing: true });
useGame.setState({
  overlay: "none",
  inside: true,
  playerPos: [0, 0.83, 0],
  nearby: { id: "quest-board", kind: "kiosk", label: "Quest Board" },
});
const objective = {
  type: "FIND",
  target: "clue",
  label: "Temukan catatan di gudang",
  required: 1,
  position: [12, 0, 12],
  radius: 2,
};
useGameCore.setState({
  snapshot: {
    profile: { player_id: "test", xp: 180, level: 1, title: "Pendatang", missions_completed: 0 },
    wallet: { current_balance: 1250, earned_today: 0 },
    levels: [
      { level: 1, xp: 0, title: "Pendatang" },
      { level: 2, xp: 500, title: "Penjelajah" },
    ],
    quests: [
      {
        id: "test",
        title: "Jejak kiriman yang hilang",
        category: "WORLD",
        available: true,
        cancellable: true,
        repeat_policy: "ONCE",
        description: "Temukan jejak kiriman. ".repeat(20),
        location: "Gudang",
        rewards: { xp: 100, point: 50 },
        prerequisites: { level: 1 },
        objectives: [objective],
      },
    ],
    active: { id: "run", quest_id: "test", status: "ACTIVE", progress: [0] },
    history: [],
    ledger: [],
  },
});
window.zoom = useCameraZoom;
window.net = useNet;
window.hud = useHud;
window.daily = useDaily;
window.createDailyFixture = dailyFixture;
window.dailyCommand = dailyCommand;
window.openDailyNpc = openDailyNpc;
window.game = useGame;
window.core = useGameCore;
window.dungeon = useDungeon;
window.missions = useMissions;
window.objective = objective;
window.profile = useProfile;
window.secret = useSecretQuest;
window.dialogue = useDungeonDialogue;
window.completion = useQuestCompletion;
window.touchDrive = useTouchDrive;
window.club = useClub;
window.editor = useWorldEditor;
window.connectionId = connectionId;
window.mounts = 0;
useProfile.setState({
  profile: {
    id: "test",
    displayName: "Cung Explorer",
    username: "explorer",
    bio: "Penjelajah dunia",
    role: "pengunjung",
    avatar: avatarFromSeed("test"),
    equippedCharacter: null,
    joinedAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  owned: [],
});
// Test-only server persistence across reloads.
const savedQaProfile = sessionStorage.getItem("qa-profile");
if (savedQaProfile) useProfile.setState({ profile: JSON.parse(savedQaProfile) });
function Fixture() {
  useKeyboard();
  const [zoomCanvas, setZoomCanvas] = useState<HTMLCanvasElement | null>(null);
  useGameplayZoom(zoomCanvas);
  const ref = useWorldViewport();
  const overlay = useGame((s) => s.overlay);
  useEffect(() => {
    window.mounts++;
  }, []);
  return (
    <main
      ref={ref}
      className="world-viewport"
      style={{ background: "linear-gradient(150deg, #738e89, #344e58 60%, #192936)" }}
    >
      <LandscapeOrientationGuard>
        {!new URLSearchParams(location.search).has("guidance") && <ActionCameraFixture />}
        <canvas ref={setZoomCanvas} data-zoom-canvas className="absolute inset-0 h-full w-full" />
        {new URLSearchParams(location.search).has("guidance") && <GuidancePreview />}
        <GameplayHudLayer
          panels={
            <>
              <SecretDiscoveryCard />
              <QuestCompleteOverlay />
              <PlayerInteractionMenu />
            </>
          }
        >
          <Hud />
          <MobileControls />
        </GameplayHudLayer>
        {overlay === "kiosk" && <KioskOverlay />}
        {overlay === "dialogue" && <DialogueOverlay />}
        <DungeonDialogueOverlay />
        <QuestGiverDialogueOverlay />
      </LandscapeOrientationGuard>
    </main>
  );
}
createRoot(document.getElementById("root")).render(<Fixture />);
