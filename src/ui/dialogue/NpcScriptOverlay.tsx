import { useState } from "react";
import {
  closeNpcScript,
  NPC_SCRIPTS,
  rememberTalk,
  scriptOpener,
  talkedToday,
  useNpcScript,
} from "@/game/npc/scripts";
import { openNpcGiverDialogue } from "@/game/daily/quest-giver-dialogue";
import { giverOfHost } from "@/game/town-events/store";
import { GAME_DAY_MS } from "@/game/time/model";
import { NpcDialogueShell } from "./NpcDialogueShell";
import { npcAppearance } from "./npc-appearance";
import "@/ui/hud/warung-panel.css";

/** Scripted small talk with any NPC: today's opener, three replies, and a job offer for quest hosts. */
export function NpcScriptOverlay() {
  const id = useNpcScript((s) => s.id);
  const [picked, setPicked] = useState<number | null>(null);
  const script = id ? NPC_SCRIPTS[id] : null;
  if (!id || !script) return null;
  const close = () => {
    setPicked(null);
    closeNpcScript();
  };
  const day = Math.floor(Date.now() / GAME_DAY_MS);
  const opener = scriptOpener(script, day);
  const earlier = picked === null ? talkedToday(id, day) : null;
  const answer = picked === null ? null : script.options[picked]!;
  const pick = (i: number) => {
    rememberTalk(id, day, i);
    setPicked(i);
  };
  return (
    <NpcDialogueShell
      name={script.name}
      role={script.role}
      avatar={npcAppearance(id, script.avatar)}
      onClose={close}
      footer={
        <div className="npc-dialogue-actions">
          <button type="button" className="npc-dialogue-secondary" onClick={close}>
            Tutup
          </button>
          {script.quest && (
            <button
              type="button"
              className="npc-dialogue-next"
              onClick={() => {
                close();
                openNpcGiverDialogue(giverOfHost(script.quest!));
              }}
            >
              Ada kerjaan?
            </button>
          )}
        </div>
      }
    >
      <div className="npc-dialogue-log" aria-live="polite">
        {earlier !== null ? (
          // Already talked today: a short closing, the job offer (if any) stays below.
          <p className="npc-dialogue-line">
            {script.quest
              ? "Eh, kamu lagi. Kalau mau bantu, Bapak/Ibu masih ada kerjaan nih."
              : "Hehe, udah dulu ya ngobrolnya. Besok mampir lagi!"}
          </p>
        ) : (
          <p className="npc-dialogue-line">{opener}</p>
        )}
        {earlier !== null ? null : answer ? (
          <>
            <p className="npc-dialogue-line" data-from="me">
              {answer.label}
            </p>
            <p className="npc-dialogue-line">{answer.reply}</p>
          </>
        ) : (
          <div className="warung-chat-options" role="group" aria-label="Pilih jawaban">
            {script.options.map((o, i) => (
              <button key={o.label} type="button" onClick={() => pick(i)}>
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </NpcDialogueShell>
  );
}
