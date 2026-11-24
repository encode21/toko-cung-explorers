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
import { noteTalk } from "@/game/world-missions/store";
import { GAME_DAY_MS } from "@/game/time/model";
import { useProfile } from "@/identity/profile-store";
import { DEFAULT_AVATAR } from "@/identity/avatar";
import { useNet } from "@/net/net-store";
import { NpcDialogueShell } from "./NpcDialogueShell";
import { npcAppearance } from "./npc-appearance";
import "@/ui/hud/warung-panel.css";

/**
 * Scripted small talk with any NPC, in beats like a conversation: the NPC speaks (left, with the
 * reply choices), the player's pick is said by the player (right, own avatar), then the NPC answers.
 */
export function NpcScriptOverlay() {
  const id = useNpcScript((s) => s.id);
  const profile = useProfile((s) => s.profile);
  const draft = useProfile((s) => s.appearanceDraft);
  const netName = useNet((s) => s.name);
  const [picked, setPicked] = useState<number | null>(null);
  const [beat, setBeat] = useState<"open" | "choose">("open");
  const script = id ? NPC_SCRIPTS[id] : null;
  if (!id || !script) return null;
  const close = () => {
    setPicked(null);
    setBeat("open");
    closeNpcScript();
  };
  const day = Math.floor(Date.now() / GAME_DAY_MS);
  const earlier = picked === null ? talkedToday(id, day) : null;
  const answer = picked === null ? null : script.options[picked]!;
  const pick = (i: number) => {
    rememberTalk(id, day, i);
    noteTalk(id);
    setPicked(i);
  };
  const jobButton = script.quest && (
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
  );

  // Beat 2: the player's turn, on the player's side, with the reply choices.
  if (!answer && earlier === null && beat === "choose")
    return (
      <NpcDialogueShell
        name={profile?.displayName ?? netName ?? "Kamu"}
        role={`Ngobrol dengan ${script.name}`}
        avatar={draft ?? profile?.avatar ?? DEFAULT_AVATAR}
        character={profile?.equippedCharacter ?? null}
        playerAvatar
        side="right"
        onClose={close}
        footer={
          <div className="npc-dialogue-actions">
            <button type="button" className="npc-dialogue-secondary" onClick={close}>
              Tutup
            </button>
          </div>
        }
      >
        <div className="npc-dialogue-log" aria-live="polite">
          <div className="warung-chat-options" role="group" aria-label="Pilih jawaban">
            {script.options.map((o, i) => (
              <button key={o.label} type="button" onClick={() => pick(i)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </NpcDialogueShell>
    );

  // Beat 1 (opener), beat 3 (reply, quoting what the player said) and the closing line come from the NPC.
  const line = answer
    ? answer.reply
    : earlier !== null
      ? script.quest
        ? "Eh, kamu lagi. Kalau mau bantu, masih ada kerjaan nih."
        : "Hehe, udah dulu ya ngobrolnya. Besok mampir lagi!"
      : scriptOpener(script, day);
  const opening = !answer && earlier === null;
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
          {opening ? (
            <button type="button" className="npc-dialogue-next" onClick={() => setBeat("choose")}>
              Jawab
            </button>
          ) : (
            jobButton
          )}
        </div>
      }
    >
      <div className="npc-dialogue-log" aria-live="polite">
        {answer && <p className="npc-dialogue-line npc-dialogue-echo">“{answer.label}”</p>}
        <p className="npc-dialogue-line">{line}</p>
      </div>
    </NpcDialogueShell>
  );
}
