import { useGame } from "@/state/game-store";
import { useDungeonDialogue } from "@/game/dungeon/dialogue-store";
import { useQuestGiverDialogue } from "@/game/daily/quest-giver-dialogue";
import { useShowroomSales } from "@/game/showroom/sales";

export function useNpcConversation() {
  const chatting = useGame((state) => state.overlay === "dialogue");
  const missionTalk = useDungeonDialogue((state) => state.script?.kind === "talk");
  const questGiverTalk = useQuestGiverDialogue((state) => state.open);
  const showroomTalk = useShowroomSales((state) => state.open);
  return chatting || missionTalk || questGiverTalk || showroomTalk;
}
