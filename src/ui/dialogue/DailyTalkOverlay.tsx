import { useEffect } from "react";
import { useDailyTalk, dailyTalkLines, closeDailyTalk, finishDailyTalk } from "@/game/daily/talk";
import { NpcDialogueShell } from "./NpcDialogueShell";
import { npcAppearance } from "./npc-appearance";
export function DailyTalkOverlay() {
  const s = useDailyTalk();
  useEffect(
    () => () => {
      useDailyTalk.setState({ questId: "" });
    },
    [],
  );
  const lines = dailyTalkLines(s.targetId);
  return (
    <NpcDialogueShell
      name={s.name}
      role="Misi harian"
      avatar={npcAppearance(s.targetId)}
      onClose={closeDailyTalk}
      footer={
        <div className="npc-dialogue-quick">
          <button
            type="button"
            disabled={s.busy}
            onClick={() =>
              s.step === 0 ? useDailyTalk.setState({ step: 1 }) : void finishDailyTalk()
            }
          >
            {s.busy ? "Menyimpan…" : s.step === 0 ? lines[1] : "Sampai ketemu lagi!"}
          </button>
        </div>
      }
    >
      <div className="npc-dialogue-log" role="log" aria-live="polite">
        <p className="npc-dialogue-line">{lines[0]}</p>
        {s.step > 0 && (
          <>
            <p className="npc-dialogue-question">{lines[1]}</p>
            <p className="npc-dialogue-line">{lines[2]}</p>
          </>
        )}
        {s.error && (
          <p className="npc-dialogue-error" role="alert">
            {s.error}
          </p>
        )}
      </div>
    </NpcDialogueShell>
  );
}
