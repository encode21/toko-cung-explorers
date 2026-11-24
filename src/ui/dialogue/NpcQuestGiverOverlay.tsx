import { useEffect } from "react";
import { LoaderCircle, Star } from "lucide-react";
import {
  closeQuestGiverDialogue,
  skipQuest,
  useQuestGiverDialogue,
} from "@/game/daily/quest-giver-dialogue";
import { QUEST_GIVERS, type QuestGiverId } from "@/game/npc/quest-marker";
import { useQuestMarkerState } from "@/game/npc/QuestMarker";
import {
  acceptTownEvent,
  claimTownEvent,
  hostOfGiver,
  loadTownEvents,
  useTownEvents,
} from "@/game/town-events/store";
import { NPC_AVATARS } from "@/identity/characters";
import { NpcDialogueShell } from "./NpcDialogueShell";
import { npcAppearance } from "./npc-appearance";

const hh = (h: number) => `${String(h).padStart(2, "0")}.00`;
const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

/** Pak Wali Kota / Pak Kades: today's town event (round robin), with a rest day after finishing one. */
export function NpcQuestGiverOverlay() {
  const open = useQuestGiverDialogue((s) => s.open);
  const id = useQuestGiverDialogue((s) => s.giverId) as QuestGiverId | "";
  const host = hostOfGiver(id);
  const ev = useTownEvents((s) => s.events.find((e) => e.host === host) ?? null);
  const busy = useTownEvents((s) => s.busy);
  const error = useTownEvents((s) => s.error);
  const state = useQuestMarkerState(host);
  const giver = id ? QUEST_GIVERS[id] : null;
  useEffect(() => {
    if (open && id) void loadTownEvents();
  }, [open, id]);
  if (!open || !giver) return null;

  const e = ev?.event;
  const left = ev && e ? e.points.length - ev.progress.length : 0;
  const offer = ev?.status === "available" && state !== "skipped";
  const canClaim = ev?.status === "active" && left === 0;
  const line =
    !ev || !e
      ? giver.line
      : ev.status === "resting"
        ? "Kamu kelihatan capek habis acara kemarin. Istirahat dulu ya, lusa Bapak ada acara lagi."
        : ev.status === "done"
          ? e.done
          : ev.status === "active"
            ? canClaim
              ? "Sudah beres semua? Sini lapor ke Bapak."
              : `${e.title}: masih ${left} titik lagi. Ikuti tanda kuning ya.`
            : state === "skipped"
              ? "Tidak apa-apa. Lain kali bantu Bapak ya."
              : e.intro;

  return (
    <NpcDialogueShell
      name={giver.name}
      role={giver.role}
      avatar={NPC_AVATARS[id as QuestGiverId] ?? npcAppearance(id)}
      busy={busy}
      onClose={closeQuestGiverDialogue}
      footer={
        <div className="npc-dialogue-actions">
          <button
            type="button"
            className="npc-dialogue-secondary"
            disabled={busy}
            onClick={offer ? skipQuest : closeQuestGiverDialogue}
          >
            {offer ? "Nanti saja" : "Tutup"}
          </button>
          {(offer || canClaim) && (
            <button
              type="button"
              className="npc-dialogue-next"
              disabled={busy}
              onClick={() => void (offer ? acceptTownEvent(host) : claimTownEvent(host))}
            >
              {busy ? "Sebentar…" : offer ? "Ikut acara" : `Lapor selesai · ${rp(e!.reward)}`}
              {busy ? (
                <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />
              ) : (
                <Star aria-hidden />
              )}
            </button>
          )}
        </div>
      }
    >
      <div className="npc-dialogue-log" aria-live="polite">
        {e && (
          <p className="npc-dialogue-line">
            <b>{e.title}</b>
          </p>
        )}
        <p className="npc-dialogue-line">{line}</p>
        {offer && e && (
          <p className="npc-dialogue-line">
            Upah {rp(e.reward)} · butuh tenaga
            {e.hours ? ` · cuma jam ${hh(e.hours[0])}–${hh(e.hours[1])}` : ""}. Habis ini istirahat
            sehari ya.
          </p>
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
