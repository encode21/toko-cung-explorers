import { QuestBoard } from "@/ui/quests/QuestBoard";
import { useGame } from "@/state/game-store";
import { GamePanel } from "@/ui/game-ui/GamePanel";
export function KioskOverlay() {
  const close = useGame((s) => s.closeOverlay);
  return (
    <GamePanel
      title="Jurnal petualangan"
      onClose={close}
      bodyClassName="game-scroll-flush"
      className="game-quest-drawer"
    >
      <QuestBoard />
    </GamePanel>
  );
}
