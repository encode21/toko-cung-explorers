import { create } from "zustand";
import { worldRequest } from "@/services/world/client";
import { useGame } from "@/state/game-store";
import { useWarung } from "@/game/warung/store";

/** Server POST /world/missions (WorldMissions): daily per game day, weekly, story lines, regular-NPC quests. */
export interface MissionItem {
  key: string;
  title: string;
  progress: number;
  target: number;
  kas: number;
  points: number;
  claimed: boolean;
  ready: boolean;
  locked: boolean;
}
export interface MissionBoard {
  gameDay: number;
  week: string;
  daily: MissionItem[];
  dailyBonus: MissionItem;
  weekly: MissionItem[];
  lines: { key: string; title: string; blurb: string; steps: MissionItem[] }[];
  regulars: { key: string; name: string; avatar: string; steps: MissionItem[] }[];
  paid?: { kas: number; points: number } | null;
}

export const useWorldMissions = create<{
  board: MissionBoard | null;
  busy: boolean;
  error: string;
}>(() => ({ board: null, busy: false, error: "" }));

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

async function cmd(action: string, extra: Record<string, unknown> = {}) {
  try {
    const board = await worldRequest<MissionBoard>("missions", { action, ...extra });
    useWorldMissions.setState({ board, error: "" });
    return board;
  } catch (e) {
    useWorldMissions.setState({
      error: e instanceof Error ? e.message : "Misi belum bisa dimuat.",
    });
    return null;
  }
}

export const loadMissions = () => cmd("read");

export async function claimMission(key: string) {
  if (useWorldMissions.getState().busy) return;
  useWorldMissions.setState({ busy: true });
  const b = await cmd("claim", { key });
  useWorldMissions.setState({ busy: false });
  if (!b?.paid) return;
  // Kas changed on the server; the warung card re-reads it on the next poll, keep the HUD in step now.
  const w = useWarung.getState().data?.warung;
  if (w && b.paid.kas)
    useWarung.setState((s) =>
      s.data?.warung
        ? { data: { ...s.data, warung: { ...s.data.warung, cash: w.cash + b.paid!.kas } } }
        : s,
    );
  const parts = [
    b.paid.kas ? `Kas +${rp(b.paid.kas)}` : "",
    b.paid.points ? `+${b.paid.points} Point` : "",
  ].filter(Boolean);
  useGame
    .getState()
    .setToast(`🎉 Hadiah misi diterima${parts.length ? `: ${parts.join(" · ")}` : ""}`);
}

/** Greeting an NPC counts for "Sapa warga" / "Kenal Tetangga" (once per NPC per game day, server-side). */
export function noteTalk(npc: string) {
  void worldRequest<MissionBoard>("missions", { action: "talk", npc })
    .then((board) => useWorldMissions.setState({ board }))
    .catch(() => {});
}

/** Anything waiting to be claimed (phone/HUD dot). */
export function missionsReady(b: MissionBoard | null) {
  if (!b) return false;
  const all = [
    ...b.daily,
    b.dailyBonus,
    ...b.weekly,
    ...b.lines.flatMap((l) => l.steps),
    ...b.regulars.flatMap((r) => r.steps),
  ];
  return all.some((i) => i.ready);
}
