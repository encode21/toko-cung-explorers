import { useGame } from "@/state/game-store";
import { useDungeonDialogue } from "@/game/dungeon/dialogue-store";
import { useQuestGiverDialogue } from "@/game/daily/quest-giver-dialogue";

export function useNpcConversation() {
  const chatting = useGame((state) => state.overlay === "dialogue");
  const missionTalk = useDungeonDialogue((state) => state.script?.kind === "talk");
  const questGiverTalk = useQuestGiverDialogue((state) => state.open);
  return chatting || missionTalk || questGiverTalk;
}
