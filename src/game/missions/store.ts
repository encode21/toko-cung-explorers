import { create } from "zustand";
import { emptySession, type MissionSession, type MissionType } from "./model";
export const useMissions = create(() => ({
  session: emptySession(),
  available: [] as { type: MissionType; sourceEventId: string; expiresAt: number }[],
  pending: false,
  error: "",
  ready: false,
  pulseAt: 0,
}));
export type MissionSignal = {
  name:
    | "mission_offered"
    | "mission_accepted"
    | "mission_progress"
    | "mission_completed"
    | "mission_cancelled"
    | "mission_expired";
  missionId: string;
  at: number;
  progress: number;
};
const listeners = new Set<(signal: MissionSignal) => void>();
export function onMissionSignal(listener: (signal: MissionSignal) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function emitMissionSignal(signal: MissionSignal) {
  for (const listener of listeners) {
    try {
      listener(signal);
    } catch {
      /* Analytics must never interrupt the game. */
    }
  }
}
export function sessionChanges(old: MissionSession, next: MissionSession) {
  if (next.active && old.active?.id !== next.active.id)
    emitMissionSignal({
      name: "mission_accepted",
      missionId: next.active.id,
      at: Date.now(),
      progress: next.active.progress,
    });
  if (
    next.active &&
    old.active?.id === next.active.id &&
    next.active.progress > old.active.progress
  )
    emitMissionSignal({
      name: "mission_progress",
      missionId: next.active.id,
      at: Date.now(),
      progress: next.active.progress,
    });
  if (next.last && old.active?.id === next.last.id && next.last.progress > old.active.progress)
    emitMissionSignal({
      name: "mission_progress",
      missionId: next.last.id,
      at: Date.now(),
      progress: next.last.progress,
    });
  if (next.last && (old.last?.id !== next.last.id || old.last.status !== next.last.status)) {
    const name =
      next.last.status === "COMPLETED"
        ? "mission_completed"
        : next.last.status === "CANCELLED"
          ? "mission_cancelled"
          : "mission_expired";
    emitMissionSignal({
      name,
      missionId: next.last.id,
      at: Date.now(),
      progress: next.last.progress,
    });
  }
}
