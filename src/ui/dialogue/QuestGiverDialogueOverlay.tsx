import { LoaderCircle, Star } from "lucide-react";
import {
  closeQuestGiverDialogue,
  useQuestGiverDialogue,
} from "@/game/daily/quest-giver-dialogue";
import {
  dailyCommand,
  dailyGiver,
  nearDailyGiver,
  useDaily,
} from "@/game/daily/store";
import { useHud } from "@/state/hud-store";
import { NPC_AVATARS } from "@/identity/characters";
import { NpcDialogueShell } from "./NpcDialogueShell";
import { npcAppearance } from "./npc-appearance";

function modeOf(data: NonNullable<ReturnType<typeof useDaily.getState>["data"]>) {
  if (data.quests.some((q) => q.status === "AVAILABLE")) return "offer" as const;
  if (data.quests.some((q) => q.status === "CLAIMABLE")) return "claim" as const;
  if (data.quests.every((q) => q.status === "CLAIMED")) return "done" as const;
  return "progress" as const;
}

/** Scripted Daily Quest handoff: talk → Terima misi → tracker/panel. */
export function QuestGiverDialogueOverlay() {
  const open = useQuestGiverDialogue((s) => s.open);
  const busy = useQuestGiverDialogue((s) => s.busy);
  const error = useQuestGiverDialogue((s) => s.error);
  const acceptedJustNow = useQuestGiverDialogue((s) => s.acceptedJustNow);
  const data = useDaily((s) => s.data);
  const npcId = useDaily((s) => s.npcId);
  const giver = dailyGiver(npcId);

  if (!open || !giver) return null;

  const mode = data ? modeOf(data) : "offer";
  const near = nearDailyGiver();
  const line = acceptedJustNow
    ? "Mantap! Lima misi sudah siap. Semangat bantu toko hari ini ya."
    : mode === "offer"
      ? (giver.dialogue ?? "Hari ini toko lagi ramai nih. Mau bantuin?")
      : mode === "claim"
        ? "Wah hebat! Hadiahmu siap diambil di sini."
        : mode === "done"
          ? "Makasih banyak hari ini. Besok ada misi baru lagi."
          : "Misi hari ini sudah jalan. Semangat ya!";

  const avatar = NPC_AVATARS[giver.id] ?? npcAppearance(giver.id);

  const accept = async () => {
    if (busy) return;
    if (!near) {
      useQuestGiverDialogue.setState({ error: "Dekati Koko Cung dulu untuk menerima misi." });
      return;
    }
    useQuestGiverDialogue.setState({ busy: true, error: "" });
    const ok = await dailyCommand("accept", { npcId: near.id });
    useQuestGiverDialogue.setState({
      busy: false,
      ...(ok
        ? { acceptedJustNow: true, error: "" }
        : { error: useDaily.getState().error || "Gagal menerima misi." }),
    });
  };

  const openPanel = () => {
    closeQuestGiverDialogue();
    useHud.getState().setSheet("daily-missions");
  };

  return (
    <NpcDialogueShell
      name={giver.name}
      role="Quest Giver"
      avatar={avatar}
      busy={busy}
      onClose={closeQuestGiverDialogue}
      footer={
        <div className="npc-dialogue-actions">
          {mode === "offer" && !acceptedJustNow ? (
            <>
              <button
                type="button"
                className="npc-dialogue-secondary"
                disabled={busy}
                onClick={closeQuestGiverDialogue}
              >
                Nanti
              </button>
              <button
                type="button"
                className="npc-dialogue-next"
                disabled={busy || !near}
                onClick={() => void accept()}
              >
                {busy ? "Menerima…" : "Terima misi"}
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
                disabled={busy}
                onClick={closeQuestGiverDialogue}
              >
                Tutup
              </button>
              <button type="button" className="npc-dialogue-next" disabled={busy} onClick={openPanel}>
                Lihat misi
                <Star aria-hidden />
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="npc-dialogue-log" aria-live="polite" data-quest-giver-dialogue>
        <p className="npc-dialogue-line">{line}</p>
        {mode === "offer" && !acceptedJustNow && !near && (
          <p className="npc-dialogue-speaker">Dekati Koko Cung untuk menerima misi.</p>
        )}
        {error && (
          <p role="alert" className="npc-dialogue-error">
            {error}
          </p>
        )}
      </div>
    </NpcDialogueShell>
  );
}
