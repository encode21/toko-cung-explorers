import { useGame } from "@/state/game-store";
import { useDungeonDialogue } from "@/game/dungeon/dialogue-store";

export function useNpcConversation() {
  const chatting = useGame((state) => state.overlay === "dialogue");
  const missionTalk = useDungeonDialogue((state) => state.script?.kind === "talk");
  return chatting || missionTalk;
}
