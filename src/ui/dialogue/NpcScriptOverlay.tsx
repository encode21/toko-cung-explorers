import { useState } from "react";
import { closeNpcScript, NPC_SCRIPTS, scriptOpener, useNpcScript } from "@/game/npc/scripts";
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
  const opener = scriptOpener(script, Math.floor(Date.now() / GAME_DAY_MS));
  const answer = picked === null ? null : script.options[picked]!;
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
        <p className="npc-dialogue-line">{opener}</p>
        {answer ? (
          <>
            <p className="npc-dialogue-line" data-from="me">
              {answer.label}
            </p>
            <p className="npc-dialogue-line">{answer.reply}</p>
          </>
        ) : (
          <div className="warung-chat-options" role="group" aria-label="Pilih jawaban">
            {script.options.map((o, i) => (
              <button key={o.label} type="button" onClick={() => setPicked(i)}>
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </NpcDialogueShell>
  );
}
