import { QuestBoard } from "@/ui/quests/QuestBoard";
import { useGame } from "@/state/game-store";
import { GameModal } from "@/ui/game-ui/GamePanel";
export function KioskOverlay() {
  const close = useGame((s) => s.closeOverlay);
  return (
    <GameModal
      title="Jurnal petualangan"
      onClose={close}
      wide
      bodyClassName="game-scroll-flush"
      className="game-quest-modal"
    >
      <QuestBoard />
    </GameModal>
  );
}
