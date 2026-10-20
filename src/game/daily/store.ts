import { create } from "zustand";
import { createId } from "@/lib/id";
import { worldRequest } from "@/services/world/client";
import { useProfile } from "@/identity/profile-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { command, useGameCore } from "@/game/core/store";
import { useWorldEditor } from "@/game/editor/store";
import { useDungeon } from "@/game/dungeon/store";
import { dailyStep, type DailySnapshot, type DailyQuest, type DailyObjective } from "./types";
import { closeQuestGiverDialogue, openQuestGiverDialogue } from "./quest-giver-dialogue";

type Request = {
  action: "read" | "open" | "accept" | "interact" | "claim";
  requestId: string;
  npcId?: string;
  instanceId?: string;
  objective?: number;
  targetId?: string;
};
export const useDaily = create<{
  data: DailySnapshot | null;
  busy: boolean;
  error: string;
  tracked: string | null;
  npcId: string | null;
  retry: Request | null;
  enabled: boolean;
  resetAt: number;
}>(() => ({
  data: null,
  busy: false,
  error: "",
  tracked: null,
  npcId: null,
  retry: null,
  enabled: false,
  resetAt: 0,
}));
let epoch = 0;
export function clearDaily() {
  epoch++;
  closeQuestGiverDialogue();
  useDaily.setState({
    data: null,
    busy: false,
    error: "",
    tracked: null,
    npcId: null,
    retry: null,
    enabled: false,
    resetAt: 0,
  });
}
export async function dailyCommand(
  action: Request["action"],
  extra: Omit<Partial<Request>, "action" | "requestId"> = {},
  retry?: Request,
) {
  if (useDaily.getState().busy || !useProfile.getState().profile) return false;
  const generation = epoch;
  const request = retry ?? { action, ...extra, requestId: createId() };
  useDaily.setState({ busy: true, ...(action !== "read" ? { error: "" } : {}) });
  try {
    if (action !== "read" && !useDungeon.getState().data?.instance) await command("pose");
    if (generation !== epoch) return false;
    const data = await worldRequest<DailySnapshot | { enabled: false }>("daily-quests", request);
    if (generation !== epoch) return false;
    if (!data.enabled) {
      useDaily.setState({ enabled: false, data: null });
      return false;
    }
    const before = useDaily.getState().data;
    if (before?.setId === data.setId && before.revision > data.revision) return true;
    const sameDay = before?.setId === data.setId;
    const resetAt =
      Date.now() + Math.max(0, Date.parse(data.nextReset) - Date.parse(data.serverTime));
    const previousTracked = useDaily.getState().tracked;
    const trackedQuest = data.quests.find((q) => q.id === previousTracked);
    const advanceTracking =
      action === "accept" ||
      (!!previousTracked &&
        (!sameDay || !trackedQuest || !["ACTIVE", "CLAIMABLE"].includes(trackedQuest.status)));
    const tracked = advanceTracking
      ? ((
          data.quests.find((q) => q.status === "ACTIVE") ??
          data.quests.find((q) => q.status === "CLAIMABLE")
        )?.id ?? null)
      : sameDay
        ? previousTracked
        : null;
    useDaily.setState({
      data,
      tracked,
      enabled: true,
      error: "",
      resetAt,
      ...(action !== "read" ? { retry: null } : {}),
      ...(!sameDay ? { retry: null } : {}),
    });
    if (action === "accept" && tracked) trackDaily(tracked);
    if (sameDay && before.completedCount < 5 && data.completedCount === 5) {
      useGame.getState().setToast("DAILY COMPLETE · 5/5 Misi selesai! Ambil hadiah di Koko Cung.");
      useHud
        .getState()
        .pushEvent("5/5 Daily Missions selesai. Kembali lagi besok untuk misi baru.", "system");
    }
    if (action === "claim") {
      const quest = data.quests.find((q) => q.id === request.instanceId);
      const receipt = quest?.receipt;
      if (receipt && !before?.quests.find((q) => q.id === quest.id)?.receipt) {
        useGame
          .getState()
          .setToast(
            `+${receipt.cungPoint} CP · +${receipt.xp} XP${receipt.bonusXp ? ` · +${receipt.bonusXp} Bonus XP` : ""}${receipt.cungPoint < receipt.requestedPoint ? " · Batas hadiah CP tercapai" : ""}`,
          );
      }
      // Refresh the shared authoritative projection instead of adding balances locally.
      const core = useGameCore.getState().snapshot;
      if (core)
        useGameCore.setState({
          snapshot: { ...core, wallet: data.wallet, profile: { ...core.profile, ...data.profile } },
        });
      const profile = useProfile.getState().profile;
      if (profile)
        useProfile.setState({
          profile: { ...profile, level: data.profile.level, title: data.profile.title },
        });
      void command("read");
    }
    return true;
  } catch (error) {
    if (generation === epoch)
      useDaily.setState({
        error: error instanceof Error ? error.message : "Daily Mission belum tersedia.",
        ...(action !== "read" ? { retry: request } : {}),
      });
    return false;
  } finally {
    if (generation === epoch) useDaily.setState({ busy: false });
  }
}
export function dailyTargets() {
  const s = useWorldEditor.getState();
  try {
    return JSON.parse(s.saved || "[]") as typeof s.targets;
  } catch {
    return s.targets;
  }
}
export function dailyGiver(id?: string | null) {
  return dailyTargets().find(
    (t) => t.active && t.archetype === "QUEST_GIVER" && (!id || t.id === id),
  );
}
export function resolveDailyObjective(o: DailyObjective): DailyObjective {
  const id = o.targetId ?? o.navigationTargetId;
  const target = id ? dailyTargets().find((t) => t.id === id && t.active) : null;
  return target
    ? {
        ...o,
        position: [target.position.x, target.position.y, target.position.z],
        radius: target.radius,
        target: target.entityId ?? target.id,
        label: `${o.label} · ${target.name}`,
      }
    : o;
}
export function nearDailyObjective(o?: DailyObjective) {
  if (!o || useDungeon.getState().data?.instance) return false;
  const resolved = resolveDailyObjective(o);
  if (!resolved.position || !resolved.radius) return false;
  const p = resolved.position;
  const player = useGame.getState().playerPos;
  return (
    Math.hypot(player[0] - p[0]!, player[2] - p[2]!) <= resolved.radius &&
    Math.abs(player[1] - 0.83 - p[1]!) <= 1.8
  );
}
export function nearDailyGiver() {
  const giver = dailyGiver(useDaily.getState().npcId);
  return giver &&
    nearDailyObjective({
      type: "TALK",
      label: giver.name,
      required: 1,
      position: [giver.position.x, giver.position.y, giver.position.z],
      radius: giver.radius,
    })
    ? giver
    : null;
}
export async function openDailyNpc(id: string) {
  useDaily.setState({ npcId: id });
  useHud.getState().setSheet(null);
  openQuestGiverDialogue();
  const ok = await dailyCommand("open", { npcId: id });
  if (ok) await dailyNpcTalk(id);
}
export async function dailyNpcTalk(id: string) {
  return dailyEntityAction(id, "TALK");
}
export async function dailyEntityAction(id: string, type: DailyObjective["type"]) {
  for (const quest of useDaily.getState().data?.quests ?? []) {
    if (quest.status !== "ACTIVE") continue;
    const index = quest.definition.objectives.findIndex(
      (o, i) =>
        o.type === type &&
        (o.targetId === id || o.target === id || resolveDailyObjective(o).target === id) &&
        (quest.progress[i] ?? 0) < o.required &&
        (!quest.definition.ordered || i === dailyStep(quest).index),
    );
    if (index >= 0) return interactDaily(quest, index);
  }
  return false;
}
export function interactDaily(q: DailyQuest, index = dailyStep(q).index) {
  const objective = q.definition.objectives[index];
  return dailyCommand("interact", {
    instanceId: q.id,
    objective: index,
    targetId: objective?.targetId ?? "",
  });
}

export function trackDaily(id: string | null) {
  if (id) {
    useDungeon.setState({ tracked: false });
    useGame.setState({ waypoint: null, guidanceMuted: false });
  }
  useDaily.setState({ tracked: id });
}
