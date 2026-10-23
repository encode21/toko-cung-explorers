import { TRUCK_PARCELS } from "@/game/missions/truck-model";
import { useTruckRoom } from "@/game/missions/truck-state";
import { useMobility } from "@/game/mobility/store";
import { playerId } from "@/net/useWorldChannel";
import { startDailyTalk } from "@/game/daily/talk";
import { useMissionFocus } from "@/state/mission-focus";
import { create } from "zustand";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { gameUiBlocked } from "@/state/game-ui-store";
import { useControls } from "@/game/player/control-state";
import { useWorldEditor } from "@/game/editor/store";
import { useGameCore } from "@/game/core/store";
import { nearbyQuestAction, interactWithQuest } from "@/game/core/quest-interaction";
import {
  useDaily,
  dailyCommand,
  dailyTargets,
  nearDailyObjective,
  resolveDailyObjective,
  interactDaily,
  trackDaily,
} from "@/game/daily/store";
import { dailyStep, dailyActionLabel } from "@/game/daily/types";
import { useQuestGiverDialogue } from "@/game/daily/quest-giver-dialogue";
import { useDungeon, dungeonCommand } from "@/game/dungeon/store";
import { useDungeonDialogue } from "@/game/dungeon/dialogue-store";
import { resolveDungeonDialogue } from "@/game/dungeon/dialogue";
import { DUNGEON_STAFF } from "@/game/dungeon/staff";
import { resolveObjective } from "@/game/editor/resolve";
import { worldLandmarkFor } from "@/game/world/landmarks";
import { useSecretQuest } from "@/game/secret/store";
import { useClub } from "@/game/club/store";
import { useFishing } from "@/game/fishing/store";
import { useMissions } from "@/game/missions/store";
import { missionInteraction, requestMission } from "@/game/missions/runtime";
import { ANCHORS, DEFINITIONS } from "@/game/missions/model";
import { nearbyActionAvailable, nearbyActionPosition } from "./action-position";
import type { ActionPosition } from "./action-projection";

export type ContextAction = {
  id: string;
  label: string;
  title: string;
  priority: number;
  distance: number;
  busy: boolean;
  error?: string | undefined;
  execute: () => unknown;
  /** Conversation prompts follow their actor; other actions retain the control slot. */
  anchor?: (() => ActionPosition | null) | undefined;
};
export const useContextActionState = create(() => ({ busy: false }));
const distance = (p: readonly number[]) =>
  Math.hypot(useGame.getState().playerPos[0] - p[0]!, useGame.getState().playerPos[2] - p[2]!);
const near = (p: readonly number[], radius = 2.5) =>
  distance(p) <= radius && Math.abs(useGame.getState().playerPos[1] - 0.83 - p[1]!) < 1.8;

/** All input routes re-evaluate this resolver; rendered prompts never authorize stale actions. */
export function contextActions(): ContextAction[] {
  const g = useGame.getState(),
    h = useHud.getState(),
    d = useDungeon.getState(),
    daily = useDaily.getState();
  if (
    !useControls.getState().playerReady ||
    !useChannels.getState().playing ||
    g.overlay !== "none" ||
    g.pendingTeleport ||
    gameUiBlocked() ||
    h.sheet ||
    h.principalPanel ||
    useWorldEditor.getState().mode !== "PLAYER" ||
    d.transition ||
    useDungeonDialogue.getState().script ||
    useQuestGiverDialogue.getState().open ||
    useSecretQuest.getState().open ||
    useFishing.getState().open
  )
    return [];
  if (g.sitting) {
    const seat = g.nearby;
    return seat?.kind === "bench" && seat.id === g.sittingBenchId
      ? [
          {
            id: `world:stand:${seat.id}`,
            label: "Berdiri",
            title: seat.label,
            priority: 4,
            distance: 0,
            busy: false,
            execute: () => useGame.getState().interact(),
          },
        ]
      : [];
  }
  const driving = useMissions.getState().session.active?.truck?.driver === playerId;
  if (driving)
    return [
      {
        id: "mission:truck:exit",
        label: "Turun",
        title: "Rem dahulu · Truk pengiriman",
        priority: 0,
        distance: 0,
        busy: useMissions.getState().pending,
        error: useMissions.getState().error,
        execute: () => requestMission("exit"),
      },
    ];
  const actions: ContextAction[] = [];
  const add = (
    id: string,
    label: string,
    title: string,
    p: readonly number[],
    priority: number,
    busy: boolean,
    execute: () => unknown,
    error?: string,
    anchor?: () => ActionPosition | null,
  ) =>
    actions.push({
      id,
      label,
      title,
      distance: distance(p),
      priority,
      busy,
      execute,
      error,
      anchor,
    });
  const c = d.data?.config,
    i = d.data?.instance;
  if (c && i?.status === "ACTIVE") {
    const index = c.objectives.findIndex((o, n) => (i.progress[n] ?? 0) < o.required);
    const raw = c.objectives[index];
    const o = raw ? { ...raw, ...resolveObjective(raw) } : undefined;
    const realm = i.realm ?? "DUNGEON";
    const travel = o && (o.realm ?? "DUNGEON") !== realm;
    const travelAt = realm === "WORLD" ? c.entrance : (c.worldExit ?? c.spawn);
    if (travel && near(travelAt, 4))
      add(
        `dungeon:${i.id}:travel:${realm}`,
        "Lanjut",
        realm === "WORLD" ? "Kembali ke Principal" : "Lanjut ke World",
        travelAt,
        0,
        d.busy,
        () => dungeonCommand("travel"),
        d.error,
      );
    const interact = (target: string, staff?: string) => {
      const script = resolveDungeonDialogue(target, staff);
      if (script) useDungeonDialogue.getState().open(script);
      else if (target) return dungeonCommand("interact", target);
      return undefined;
    };
    if (o && !travel) {
      const points = o.positions
        ? o.positions
            .map((p, n) => ({ p, target: `clue-${n}` }))
            .filter((v) => !i.found.includes(v.target))
        : [
            {
              p: o.targetId ? o.position : worldLandmarkFor(o.target, o.position),
              target: o.target,
            },
          ];
      for (const { p, target } of points)
        if (near(p, o.radius))
          add(
            `dungeon:${i.id}:${index}:${target}`,
            o.type === "TALK"
              ? "Bicara"
              : o.type === "COLLECT"
                ? "Ambil"
                : o.type === "DELIVER"
                  ? "Serahkan"
                  : "Selidiki",
            o.label,
            p,
            0,
            d.busy,
            () => interact(target),
            d.error,
          );
    }
    if (realm === "DUNGEON") {
      const egg = c.easterEggs[0];
      if (egg && !i.easterEgg && near(egg.position, 2))
        add(
          `dungeon:${i.id}:egg`,
          "Selidiki",
          "Benda berkilau",
          egg.position,
          2,
          d.busy,
          () => interact(egg.id),
          d.error,
        );
      for (const [n, staff] of DUNGEON_STAFF.entries()) {
        const p = (c.version ?? 1) < 2 ? (n === 0 ? [0, 0, 7] : [999, 0, 999]) : staff.position;
        if (near(p))
          add(
            `staff:${staff.id}`,
            "Bicara",
            staff.name,
            p,
            4,
            d.busy,
            () => interact("", staff.id),
            d.error,
            () => [p[0]!, p[1]! + 2.25, p[2]!],
          );
      }
    }
  }
  if (!i) {
    if (!(useClub.getState().inside && !useClub.getState().outdoor)) {
      for (const q of daily.data?.quests ?? []) {
        if (q.status !== "ACTIVE") continue;
        const next = dailyStep(q).index;
        q.definition.objectives.forEach((raw, index) => {
          if (
            (q.progress[index] ?? 0) >= raw.required ||
            (q.definition.ordered && index !== next) ||
            ["VISIT", "DISTANCE", "DUNGEON_ENTERED", "DUNGEON_OBJECTIVE"].includes(raw.type)
          )
            return;
          const o = resolveDailyObjective(raw),
            label = dailyActionLabel(o);
          if (label && o.position && nearDailyObjective(o))
            add(
              `daily:${q.id}:${index}`,
              label,
              dailyTargets().find((t) => t.id === raw.targetId)?.name ?? raw.label,
              o.position,
              daily.tracked === q.id ? 1 : 2,
              daily.busy,
              () => {
                trackDaily(q.id);
                return raw.type === "TALK" ? startDailyTalk(q, index) : interactDaily(q, index);
              },
              daily.error,
            );
        });
      }
      const q = nearbyQuestAction();
      if (q)
        add(
          `quest:${q.run.id}:${q.index}`,
          q.objective.secret
            ? "Selidiki"
            : q.objective.type === "TALK"
              ? "Bicara"
              : q.objective.type === "COLLECT"
                ? "Ambil"
                : q.objective.type === "DELIVER"
                  ? "Serahkan"
                  : "Selidiki",
          q.title,
          q.objective.position,
          useMissionFocus.getState().source === "quest" ||
            (!daily.tracked && useMissionFocus.getState().source !== "mission")
            ? 1
            : 2,
          useGameCore.getState().busy,
          () => {
            trackDaily(null);
            useMissionFocus.setState({ source: "quest" });
            return interactWithQuest();
          },
          useGameCore.getState().error ?? undefined,
        );
      if (daily.data?.quests.some((q) => q.status === "AVAILABLE"))
        for (const giver of dailyTargets().filter(
          (t) => t.active && t.archetype === "QUEST_GIVER",
        )) {
          const p = [giver.position.x, giver.position.y, giver.position.z];
          if (near(p, giver.radius))
            add(
              `daily:accept:${giver.id}`,
              "Terima Daily",
              giver.name,
              p,
              3,
              daily.busy,
              async () => {
                useDaily.setState({ npcId: giver.id });
                if (await dailyCommand("open", { npcId: giver.id }))
                  await dailyCommand("accept", { npcId: giver.id });
              },
              daily.error,
            );
        }
      const m = useMissions.getState(),
        a = missionInteraction();
      if (
        a &&
        near(a.position, a.radius) &&
        !(
          a.action === "board" &&
          (useMobility.getState().flying ||
            useMobility
              .getState()
              .carries.some((p) => p.carrier === playerId || p.passenger === playerId))
        )
      )
        add(
          `mission:${m.session.active?.id}:${a.action}`,
          a.action === "load"
            ? "Muat"
            : a.action === "board"
              ? "Kemudikan"
              : a.action === "unload" || a.action === "take"
                ? "Ambil"
                : a.action === "place"
                  ? "Serahkan"
                  : "Selidiki",
          a.label,
          a.position,
          useMissionFocus.getState().source === "mission" ? 1 : 2,
          m.pending,
          () => {
            useMissionFocus.setState({ source: "mission" });
            trackDaily(null);
            return requestMission(a.action);
          },
          m.error,
        );
      if (!m.session.active)
        for (const offer of m.available) {
          if (offer.type === "TRUCK_DELIVERY" && useTruckRoom.getState().mission) continue;
          const at =
            offer.type === "TRUCK_DELIVERY"
              ? { position: TRUCK_PARCELS }
              : offer.type === "STORE_RUSH_HELP_CASHIER"
                ? ANCHORS.scan
                : ANCHORS.take;
          if (near(at.position, 2.5))
            add(
              `mission:accept:${offer.sourceEventId}`,
              "Terima Misi",
              DEFINITIONS[offer.type].title,
              at.position,
              3,
              m.pending || !m.ready,
              () => {
                useMissionFocus.setState({ source: "mission" });
                trackDaily(null);
                useGame.setState({ waypoint: null, guidanceMuted: false });
                return requestMission("accept", offer.sourceEventId);
              },
              m.error,
            );
        }
      if (c && near(c.entrance, 4))
        add(
          "dungeon:entrance",
          "Lihat Misi",
          "Principal",
          c.entrance,
          3,
          d.busy,
          () => {
            if ((c.version ?? 1) < 2) return dungeonCommand("enter");
            useHud.setState({ principalPanel: "missions" });
            return dungeonCommand("read");
          },
          d.error,
        );
    }
    const target = g.nearby;
    if (target && target.kind !== "mission" && nearbyActionAvailable(target)) {
      const p = nearbyActionPosition(target);
      const labels: Record<string, string> = {
        npc: "Bicara",
        player: "Sapa",
        shelf: "Scan barang",
        cashier: "Scan barang",
        bench: "Duduk",
        fishing: "Memancing",
        door: "Buka pintu",
        kiosk: "Lihat Quest",
        world: "Masuk",
      };
      if (p)
        add(
          `world:${target.kind}:${target.id}`,
          labels[target.kind] ?? "Interaksi",
          target.label,
          p,
          4,
          false,
          () =>
            target.kind === "player"
              ? useGame.getState().socialAct("wave")
              : useGame.getState().interact(),
          undefined,
          target.kind === "npc" || target.kind === "player"
            ? () => nearbyActionPosition(target)
            : undefined,
        );
    }
  }
  return actions.sort(
    (a, b) => a.priority - b.priority || a.distance - b.distance || a.id.localeCompare(b.id),
  );
}
export function currentContextAction() {
  return contextActions()[0] ?? null;
}
export async function performContextAction(expectedId?: string) {
  if (useContextActionState.getState().busy) return;
  // A visible NPC greeting can coexist with the primary quest control. Revalidate both
  // against the live candidates; keyboard F still executes the highest-priority action.
  const actions = contextActions();
  const action = expectedId ? actions.find((candidate) => candidate.id === expectedId) : actions[0];
  if (!action || action.busy) return;
  useContextActionState.setState({ busy: true });
  try {
    await action.execute();
    if (!action.id.startsWith("daily:") && !useDungeon.getState().data?.instance)
      void dailyCommand("read");
  } catch (e) {
    useGame.getState().setToast(e instanceof Error ? e.message : "Aksi belum berhasil. Coba lagi.");
  } finally {
    useContextActionState.setState({ busy: false });
  }
}
