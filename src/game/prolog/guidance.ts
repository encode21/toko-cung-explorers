import type { ContextAction } from "@/game/interactions/context-action";
import type { MapDestination } from "@/game/navigation/map-destinations";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useWarung } from "@/game/warung/store";
import { useGang } from "@/game/gang/store";
import { useMobility } from "@/game/mobility/store";
import { bikeModel } from "@/game/vehicles/model";
import { ojekTarget } from "@/game/ojek/store";
import { prologCommand, useProlog } from "./store";
import { prologHomeDestination } from "./pulang/steps";

export function nearPrologKoko() {
  const d = useProlog.getState().data;
  if (!d || useWarung.getState().inside || useGang.getState().inside) return false;
  const p = useGame.getState().playerPos,
    k = d.koko;
  return Math.hypot(p[0] - k.x, p[2] - k.z) <= k.radius && Math.abs(p[1] - k.y) < k.radius;
}
export function prologContextActions(): ContextAction[] {
  const s = useProlog.getState(),
    d = s.data;
  if (!d || d.step !== "meet" || !nearPrologKoko()) return [];
  return [
    {
      id: "prolog:koko",
      label: d.text["talk"]!,
      title: d.text["koko"]!,
      priority: 0,
      distance: 0,
      busy: s.busy || !!s.retry,
      error: s.error,
      execute: () => prologCommand("advance", { step: "meet" }),
      anchor: () => [d.koko.x, d.koko.y + 2.3, d.koko.z],
    },
  ];
}
export function prologDestination(id: string): MapDestination | undefined {
  const d = useProlog.getState().data;
  if (!d) return;
  if (id.startsWith("prolog-home")) return prologHomeDestination(id);
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
export function guideProlog() {
  const d = useProlog.getState().data;
  if (!d) return;
  useHud.getState().setSheet(null);
  const target =
    d.step === "meet"
      ? "prolog-koko"
      : d.goal.kind === "trip"
        ? ojekTarget()
          ? "ojek-pickup"
          : "prolog-motor"
        : d.goal.kind === "serve"
          ? "usaha-warung"
          : "map-store";
  useGame.getState().setWaypoint(target);
  if (d.step === "goal" && d.goal.kind === "open") useHud.getState().setSheet("warung");
}
