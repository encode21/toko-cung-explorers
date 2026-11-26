import type { ContextAction } from "@/game/interactions/context-action";
import { KIOSK } from "@/game/interactions/kiosk";
import type { MapDestination, WaypointId } from "@/game/navigation/map-destinations";
import { useGame } from "@/state/game-store";
import { useGameUi } from "@/state/game-ui-store";
import { useHud } from "@/state/hud-store";
import { useChannels } from "@/net/channel-store";
import { useWarung } from "@/game/warung/store";
import { enterGang, useGang } from "@/game/gang/store";
import { leaveHome, useHome } from "@/game/home/store";
import { useMobility } from "@/game/mobility/store";
import { bikeModel } from "@/game/vehicles/model";
import { ojekTarget, useOjek } from "@/game/ojek/store";
import { prologCommand, useProlog } from "./store";
import { needsHome, prologHomeDestination, usePulang } from "./pulang/steps";

export function nearPrologKoko() {
  const d = useProlog.getState().data;
  const game = useGame.getState();
  if (
    !d ||
    game.inside ||
    useHome.getState().inside ||
    useWarung.getState().inside ||
    useGang.getState().inside
  )
    return false;
  const p = game.playerPos,
    k = d.koko;
  return Math.hypot(p[0] - k.x, p[2] - k.z) <= k.radius && Math.abs(p[1] - k.y) < k.radius;
}
export function prologContextActions(): ContextAction[] {
  const s = useProlog.getState(),
    d = s.data;
  if (!d || d.completedAt) return [];
  const { step } = d;
  if (step !== "meet" && !(d.version === 2 && step === "koko" && !usePulang.getState().koko))
    return [];
  if (!nearPrologKoko()) return [];
  return [
    {
      id: "prolog:koko",
      label: "Tanya",
      title: d.text["koko"]!,
      priority: 0,
      distance: 0,
      busy: s.busy || !!s.retry,
      error: s.error,
      execute: async () => {
        if (step === "meet") {
          await prologCommand("advance", { step });
          return;
        }
        useHud.getState().setPrologOpen(false);
        usePulang.setState({ koko: true });
      },
    },
  ];
}
export function prologDestination(id: string): MapDestination | undefined {
  const d = useProlog.getState().data;
  if (!d) return;
  if (id.startsWith("prolog-home")) return prologHomeDestination(id);
  if (id === "prolog-restock-kiosk")
    return {
      id,
      label: "Kiosk Grosir",
      detail: "Belanja sekaligus di kiosk Grosir Toko Cung.",
      icon: "basket",
      position: KIOSK.position,
      interior: true,
    };
  if (id === "prolog-koko")
    return {
      id,
      label: d.text["koko"]!,
      detail: d.text["meet"]!,
      icon: "quest",
      position: [d.koko.x, d.koko.y, d.koko.z],
    };
  if (id === "prolog-motor") {
    const p = useGame.getState().playerPos;
    const motor = (useMobility.getState().vehicles ?? [])
      .filter((v) => !v.personal && bikeModel(v.model) && !v.occupants.length)
      .sort(
        (a, b) =>
          Math.hypot(a.pose.x - p[0], a.pose.z - p[2]) -
          Math.hypot(b.pose.x - p[0], b.pose.z - p[2]),
      )[0];
    if (motor)
      return {
        id,
        label: d.text["trip"]!,
        detail: d.text["trip_help"]!,
        icon: "quest",
        position: [motor.pose.x, motor.pose.y, motor.pose.z],
      };
  }
  return undefined;
}
function inOwnGang() {
  const { data, inside } = useGang.getState();
  return data && inside === data.gang && data.gang === data.home.gang;
}

function homeApproach(): WaypointId {
  return inOwnGang() ? "prolog-home-door" : "prolog-gate";
}

function prologWarungLocation() {
  const homeShop = useGang.getState().data?.houses.find((house) => house.mine)?.warung;
  const { data, lots } = useWarung.getState();
  if (
    homeShop?.lot != null ||
    data?.lotMarket?.some((offer) => offer.mine) ||
    lots.some((card) => card.id === data?.warung?.id)
  )
    return "city";
  return homeShop?.lot === null ? "gang" : null;
}

/** The current prolog leg uses its own waypoint IDs so it can safely clear them on transition. */
export function prologRoute(): WaypointId | null {
  const d = useProlog.getState().data;
  if (!d || d.completedAt) return null;
  const inside = useHome.getState().inside;
  if (d.version === 2 && needsHome(d.step)) return homeApproach();
  switch (d.step) {
    case "window":
      return "prolog-home-window";
    case "box":
      return "prolog-home-box";
    case "sleep":
      return "prolog-home-bed";
    case "gang": {
      if (inside) return "prolog-home-exit";
      if (!inOwnGang()) return "prolog-gate";
      const { talked } = usePulang.getState();
      if (!talked.includes("romlah")) return "prolog-home-romlah";
      if (!talked.includes("kosim")) return "prolog-home-kosim";
      return "prolog-home-mouth";
    }
    case "koko":
    case "meet":
      return inside ? "prolog-home-exit" : "prolog-koko";
    case "return":
      return inside ? null : homeApproach();
    case "goal": {
      if (d.goal.done || d.goal.kind === "open") return null;
      if (inside) return "prolog-home-exit";
      if (d.goal.kind === "trip") return ojekTarget() ? "prolog-ojek" : "prolog-motor";
      if (d.goal.kind === "restock")
        return useGame.getState().inside ? "prolog-restock-kiosk" : "prolog-restock";
      if (useWarung.getState().inside) return null;
      if (prologWarungLocation() === "gang")
        return inOwnGang() ? "prolog-home-shop" : "prolog-gate";
      return "prolog-serve";
    }
    default:
      return null;
  }
}

/** Refresh on new steps or travel legs only, leaving a stopped or manually changed route alone. */
export function startPrologGuidance() {
  let currentLeg: string | null = null;
  let queued = false;
  let live = true;
  const clear = () => {
    const game = useGame.getState();
    if (game.waypoint?.startsWith("prolog-")) game.setWaypoint(null);
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    // A travel action may update the room, position and waypoint stores in the same turn.
    queueMicrotask(() => {
      queued = false;
      if (!live) return;
      const d = useProlog.getState().data;
      if (!d || d.completedAt) {
        currentLeg = null;
        clear();
        return;
      }
      if (!useChannels.getState().playing) return;
      const route = prologRoute();
      const room = useHome.getState().inside ? "home" : (useGang.getState().inside ?? "city");
      const leg = route ? `${d.step}:${room}:${route}` : null;
      if (leg === currentLeg) return;
      currentLeg = leg;
      const game = useGame.getState();
      if (game.waypoint === null || game.waypoint.startsWith("prolog-")) game.setWaypoint(route);
    });
  };
  const stops = [useProlog, useChannels, useHome, useGang, usePulang, useOjek, useWarung].map(
    (store) => store.subscribe(schedule),
  );
  stops.push(
    useGame.subscribe((game, previous) => {
      if (game.inside !== previous.inside) schedule();
    }),
  );
  schedule();
  return () => {
    live = false;
    stops.forEach((stop) => stop());
    clear();
  };
}

export function showPrologGuidance() {
  const route = prologRoute();
  if (!route) return;
  useGame.getState().setWaypoint(route);
}

export function goToPrologWarung() {
  if (useGameUi.getState().traveling || useWarung.getState().inside) return;
  if (useHome.getState().inside) return leaveHome();
  if (prologWarungLocation() === "city") return showPrologGuidance();
  return enterGang();
}
