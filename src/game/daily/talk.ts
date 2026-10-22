import { create } from "zustand";
import { useGame } from "@/state/game-store";
import { playCue } from "@/game/audio/sound-palette";
import { dailyStep, type DailyQuest } from "./types";
import {
  dailyTargets,
  interactDaily,
  nearDailyObjective,
  resolveDailyObjective,
  trackDaily,
  useDaily,
} from "./store";
import { closeQuestGiverDialogue } from "./quest-giver-dialogue";

export const useDailyTalk = create(() => ({
  questId: "",
  setId: "",
  index: 0,
  targetId: "",
  name: "",
  step: 0,
  busy: false,
  error: "",
}));
export function startDailyTalk(q: DailyQuest, index: number) {
  const o = q.definition.objectives[index];
  if (!o || o.type !== "TALK" || !nearDailyObjective(resolveDailyObjective(o))) return false;
  const target = dailyTargets().find((t) => t.id === o.targetId);
  if (!target) return false;
  closeQuestGiverDialogue();
  trackDaily(q.id);
  useDailyTalk.setState({
    questId: q.id,
    setId: useDaily.getState().data?.setId ?? "",
    index,
    targetId: target.id,
    name: target.name,
    step: 0,
    busy: false,
    error: "",
  });
  useGame.setState({
    overlay: "dialogue",
    activeNpc: target.id,
    dialogue: [],
    sitting: false,
    sittingBenchId: null,
  });
  playCue("greeting");
  return true;
}
export function dailyTalkLines(id: string): [string, string, string] {
  if (id === "npc_daily_staff")
    return [
      "Halo! Lagi cek kabar gudang, ya? Paket hari ini sudah dipisahkan supaya mudah dicari.",
      "Ada yang perlu kubantu di gudang?",
      "Terima kasih sudah mengecek! Kalau ingin bantu pengiriman, ambil misi truk di depan toko. Muat paketnya, lalu kemudikan ke gudang belakang.",
    ];
  if (id === "npc_daily_cung")
    return [
      "Hai! Senang ketemu lagi. Bagaimana jalan-jalanmu hari ini?",
      "Seru! Aku sekalian mampir dan menyapa semuanya.",
      "Wah, terima kasih! Coba sapa Warga Cung dan staf gudang juga. Mereka pasti senang ditemani.",
    ];
  return [
    "Halo, tetangga! Aku lagi mampir belanja. Kamu juga sedang berkeliling?",
    "Iya! Aku ingin kenalan dan dengar kabar warga di sini.",
    "Salam kenal! Di sini ramai menjelang sore. Terima kasih sudah menyapa, sampai ketemu lagi!",
  ];
}
export function closeDailyTalk() {
  if (useDailyTalk.getState().busy) return;
  useDailyTalk.setState({ questId: "", error: "" });
  useGame.getState().closeOverlay();
}
export async function finishDailyTalk() {
  const s = useDailyTalk.getState();
  if (!s.questId || s.busy || s.step !== 1) return;
  const data = useDaily.getState().data;
  const q = data?.quests.find((q) => q.id === s.questId);
  const o = q?.definition.objectives[s.index];
  if (
    data?.setId !== s.setId ||
    !q ||
    q.status !== "ACTIVE" ||
    !o ||
    o.targetId !== s.targetId ||
    (q.progress[s.index] ?? 0) >= o.required ||
    (q.definition.ordered && dailyStep(q).index !== s.index) ||
    !nearDailyObjective(resolveDailyObjective(o))
  ) {
    useDailyTalk.setState({
      error: "Tujuan berubah atau kamu terlalu jauh. Tutup percakapan lalu dekati penanda lagi.",
    });
    return;
  }
  useDailyTalk.setState({ busy: true, error: "" });
  const ok = await interactDaily(q, s.index);
  if (useDailyTalk.getState().questId !== s.questId) return;
  useDailyTalk.setState({
    busy: false,
    error: ok ? "" : useDaily.getState().error || "Belum tersimpan. Coba lagi.",
  });
  if (ok) closeDailyTalk();
}
