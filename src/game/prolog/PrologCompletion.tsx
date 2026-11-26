import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BookOpenCheck } from "lucide-react";
import { useAccount } from "@/auth/useSession";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useGameUi } from "@/state/game-ui-store";
import { useHud } from "@/state/hud-store";
import { useNpcConversation } from "@/hooks/use-npc-conversation";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { markPrologSignupSeen } from "@/ui/hud/announcements";
import { QuestConfetti } from "@/ui/quests/QuestConfetti";
import { useProlog } from "./store";
import "@/ui/quests/quest-complete.css";
import "./prolog-completion.css";

export function PrologCompletion() {
  const navigate = useNavigate();
  const account = useAccount((s) => s.user);
  const pending = useProlog((s) => s.registrationPrompt);
  const ready = useChannels((s) => s.playing && s.sceneReady);
  const sheet = useHud((s) => s.sheet);
  const overlay = useGame((s) => s.overlay);
  const blocked = useGameUi(
    (s) => s.panels > 0 || s.portrait || s.traveling || s.storeIntro || s.storeWalk,
  );
  const talking = useNpcConversation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!pending) setOpen(false);
    else if (ready && !sheet && !blocked && !talking && overlay === "none") setOpen(true);
  }, [pending, ready, sheet, blocked, talking, overlay]);

  if (!open || !pending || !ready || !account?.guest) return null;

  const dismiss = () => {
    markPrologSignupSeen(account.id);
    useProlog.setState({ registrationPrompt: false });
  };

  return (
    <>
      <GameModal
        title="Prolog selesai!"
        className="quest-complete-modal prolog-complete-modal"
        bodyClassName="quest-complete-body"
        onClose={dismiss}
        footer={
          <>
            <button type="button" className="prolog-complete-later" onClick={dismiss}>
              Lanjut bermain
            </button>
            <button
              type="button"
              className="quest-complete-confirm"
              onClick={() => {
                dismiss();
                void navigate({ to: "/auth", search: { mode: "register" } });
              }}
            >
              Daftar akun
            </button>
          </>
        }
      >
        <BookOpenCheck className="prolog-complete-icon" aria-hidden />
        <p className="prolog-complete-message">
          <strong>Petualangan pertamamu selesai.</strong>
          Buat akun untuk memulai ceritamu sendiri di Toko Cung World.
        </p>
        <p className="prolog-complete-note">Akun baru memulai progres dari awal.</p>
      </GameModal>
      <QuestConfetti trigger={0} modalSelector=".prolog-complete-modal" />
    </>
  );
}
