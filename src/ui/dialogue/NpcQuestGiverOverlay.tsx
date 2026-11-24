import { LoaderCircle, Star } from "lucide-react";
import {
  closeQuestGiverDialogue,
  skipQuest,
  useQuestGiverDialogue,
} from "@/game/daily/quest-giver-dialogue";
import { dailyCommand, dailyGiver, useDaily } from "@/game/daily/store";
import { QUEST_GIVERS, type QuestGiverId } from "@/game/npc/quest-marker";
import { useQuestMarkerState } from "@/game/npc/QuestMarker";
import { useHud } from "@/state/hud-store";
import { NPC_AVATARS } from "@/identity/characters";
import { NpcDialogueShell } from "./NpcDialogueShell";

/** Pak Wali Kota / Pak Kades: offer the daily quests with "Ambil quest" or a penalty-free "Nanti saja". */
export function NpcQuestGiverOverlay() {
  const open = useQuestGiverDialogue((s) => s.open);
  const id = useQuestGiverDialogue((s) => s.giverId) as QuestGiverId | "";
  const busy = useQuestGiverDialogue((s) => s.busy);
  const error = useQuestGiverDialogue((s) => s.error);
  const accepted = useQuestGiverDialogue((s) => s.acceptedJustNow);
  const state = useQuestMarkerState();
  const giver = id ? QUEST_GIVERS[id] : null;
  if (!open || !giver) return null;

  const offer = state === "available" && !accepted;
  const line = accepted
    ? "Mantap! Quest-nya sudah kamu pegang. Semangat ya!"
    : offer
      ? giver.line
      : state === "skipped"
        ? "Tidak apa-apa. Besok Bapak tawarkan lagi ya."
        : "Quest hari ini sudah jalan. Semangat, ya!";

  const accept = async () => {
    const koko = dailyGiver()?.id;
    if (busy || !koko) return;
    useDaily.setState({ npcId: koko });
    useQuestGiverDialogue.setState({ busy: true, error: "" });
    const ok =
      (await dailyCommand("open", { npcId: koko })) &&
      (await dailyCommand("accept", { npcId: koko }));
    useQuestGiverDialogue.setState({
      busy: false,
      ...(ok
        ? { acceptedJustNow: true, error: "" }
        : { error: useDaily.getState().error || "Gagal mengambil quest." }),
    });
  };

  return (
    <NpcDialogueShell
      name={giver.name}
      role={giver.role}
      avatar={NPC_AVATARS[id as QuestGiverId]!}
      busy={busy}
      onClose={closeQuestGiverDialogue}
      footer={
        <div className="npc-dialogue-actions">
          {offer ? (
            <>
              <button
                type="button"
                className="npc-dialogue-secondary"
                disabled={busy}
                onClick={skipQuest}
              >
                Nanti saja
              </button>
              <button
                type="button"
                className="npc-dialogue-next"
                disabled={busy}
                onClick={() => void accept()}
              >
                {busy ? "Mengambil…" : "Ambil quest"}
                {busy ? (
                  <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />
                ) : (
                  <Star aria-hidden />
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="npc-dialogue-secondary"
                onClick={closeQuestGiverDialogue}
              >
                Tutup
              </button>
              <button
                type="button"
                className="npc-dialogue-next"
                onClick={() => {
                  closeQuestGiverDialogue();
                  useHud.getState().setSheet("daily-missions");
                }}
              >
                Lihat misi
                <Star aria-hidden />
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="npc-dialogue-log" aria-live="polite">
        <p className="npc-dialogue-line">{line}</p>
        {error && (
          <p role="alert" className="npc-dialogue-error">
            {error}
          </p>
        )}
      </div>
    </NpcDialogueShell>
  );
}
