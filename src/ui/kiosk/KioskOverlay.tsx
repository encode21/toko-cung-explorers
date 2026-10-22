import { ActivityJournal } from "@/ui/hud/ActivityJournal";
import { useGame } from "@/state/game-store";
import { GamePanel } from "@/ui/game-ui/GamePanel";
export function KioskOverlay() {
  const close = useGame((s) => s.closeOverlay);
  return (
    <GamePanel
      title="Jurnal petualangan"
      onClose={close}
      bodyClassName="game-scroll-flush"
      className="game-quest-drawer game-quest-journal-sheet"
    >
      <ActivityJournal />
    </GamePanel>
  );
}
