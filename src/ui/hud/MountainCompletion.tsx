import { Flag } from "lucide-react";
import { useMountain } from "@/game/mountain/store";
import { GameButton, GameModal } from "@/ui/game-ui/GamePanel";
import { QuestConfetti } from "@/ui/quests/QuestConfetti";

export function MountainCompletion() {
  const pulse = useMountain((s) => s.pulseAt);
  const dismiss = () => useMountain.setState({ summitOpen: false });
  return (
    <>
      <GameModal
        title="Puncak tercapai!"
        className="mountain-complete-modal"
        onClose={dismiss}
        footer={
          <>
            <GameButton onClick={dismiss}>Tetap di puncak</GameButton>
            <GameButton onClick={() => useMountain.getState().returnToBasecamp()}>
              Kembali ke basecamp
            </GameButton>
          </>
        }
      >
        <div className="mountain-complete-content">
          <Flag aria-hidden="true" />
          <strong>Selamat, Pendaki Cung!</strong>
          <p>Empat checkpoint terlewati. Nikmati pemandangan atau kembali untuk mendaki lagi.</p>
        </div>
      </GameModal>
      <QuestConfetti trigger={pulse} modalSelector=".mountain-complete-modal" />
    </>
  );
}
