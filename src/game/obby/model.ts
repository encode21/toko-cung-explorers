/** Construction climbing course on the empty north side of the concert Plaza. Metres. */
export interface ObbyPlatform {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  top: number;
  surface?: "crate" | "container" | undefined;
  thickness?: number;
  kind: "start" | "step" | "bridge" | "moving" | "checkpoint" | "finish";
}

const LOWER_COURSE: readonly ObbyPlatform[] = [
  { id: "start", x: 30.3, z: -17.5, width: 3, depth: 3, top: 0.25, kind: "start" },
  { id: "step1", x: 30.3, z: -21, width: 2.9, depth: 2.9, top: 0.8, kind: "step" },
  { id: "step2", x: 30.3, z: -24.7, width: 2.9, depth: 2.9, top: 1.35, kind: "step" },
  { id: "checkpoint1", x: 30.3, z: -28.2, width: 3, depth: 3, top: 1.9, kind: "checkpoint" },
  { id: "bridge", x: 34, z: -28.2, width: 4.5, depth: 0.95, top: 1.9, kind: "bridge" },
  { id: "step3", x: 38.5, z: -28.2, width: 2.9, depth: 2.9, top: 2.45, kind: "step" },
  { id: "moving", x: 42.3, z: -28.2, width: 2.8, depth: 2.8, top: 2.95, kind: "moving" },
  { id: "checkpoint2", x: 46.1, z: -28.2, width: 3, depth: 3, top: 3.45, kind: "checkpoint" },
  { id: "step4", x: 49.8, z: -26.8, width: 2.9, depth: 3.1, top: 4, kind: "step" },
  { id: "step5", x: 49.8, z: -23, width: 2.9, depth: 3.1, top: 4.55, kind: "step" },
  { id: "checkpoint3", x: 49.8, z: -19, width: 3.4, depth: 3.4, top: 5.1, kind: "checkpoint" },
];

// Three full ascending circuits give 8.8 m of headroom per lap, including container bodies.
// Each leg has an alignment corridor and rises only 0.55 m: the original jump needs no buff.
const UPPER_CIRCUIT = [
  [46, -17.6],
  [42.2, -17.6],
  [38.4, -17.6],
  [34.6, -17.6],
  [30.3, -17.6],
  [30.3, -21],
  [30.3, -24.7],
  [30.3, -28.2],
  [34.2, -28.2],
  [38.1, -28.2],
  [42.2, -28.2],
  [46.1, -28.2],
  [49.8, -28.2],
  [49.8, -24.6],
  [49.8, -21],
  [49.8, -17.6],
] as const;
export const OBBY_PLATFORMS: readonly ObbyPlatform[] = [
  ...LOWER_COURSE,
  ...Array.from({ length: 48 }, (_, i): ObbyPlatform => {
    const leg = i % UPPER_CIRCUIT.length;
    const [x, z] = UPPER_CIRCUIT[leg]!;
    const checkpoint = leg % 4 === 3;
    const beam = leg === 1 || leg === 9;
    const cargo = leg === 2 || leg === 10;
    const finish = i === 47;
    return {
      id: finish ? "finish" : checkpoint ? `checkpoint${4 + Math.floor(i / 4)}` : `sky-${i + 1}`,
      x,
      z,
      width: finish ? 3.4 : 3.2,
      depth: beam ? 1.05 : 2.8,
      top: Number((5.1 + (i + 1) * 0.55).toFixed(2)),
      kind: finish ? "finish" : checkpoint ? "checkpoint" : beam ? "bridge" : "step",
      surface: cargo ? "container" : !checkpoint && !beam && !finish ? "crate" : undefined,
      thickness: cargo ? 2.1 : !checkpoint && !beam && !finish ? 0.85 : 0.32,
    };
  }),
];
export const OBBY_CHECKPOINTS = OBBY_PLATFORMS.filter((p) => p.kind === "checkpoint");
export const checkpointNumber = (id: string) => OBBY_CHECKPOINTS.findIndex((p) => p.id === id) + 1;

/** Recover promptly on a tall course, before landing on an earlier storey or waiting to hit ground. */
export function belowObbyRoute(step: number, feetY: number) {
  return feetY < Math.max(0.12, (OBBY_PLATFORMS[step]?.top ?? 0) - 1.5);
}

export const OBBY_BOUNDS = { minX: 28.5, maxX: 52.5, minZ: -30.3, maxZ: -15.8 };
export const OBBY_TITLE = "Proyek Langit · Plaza";
export const getObbyTime = () => Date.now() / 1000;

/** Wall-clock phase is shared by clients; slow motion remains within the safe jump envelope. */
export function platformPosition(platform: ObbyPlatform, seconds = getObbyTime()) {
  return {
    x: platform.x,
    y: platform.top,
    z: platform.z + (platform.kind === "moving" ? Math.sin(seconds * 0.8) * 0.55 : 0),
  };
}

export function inObbyBounds(x: number, z: number, padding = 0) {
  return (
    x >= OBBY_BOUNDS.minX - padding &&
    x <= OBBY_BOUNDS.maxX + padding &&
    z >= OBBY_BOUNDS.minZ - padding &&
    z <= OBBY_BOUNDS.maxZ + padding
  );
}

/** A wide ground-level exit by Start lets a player leave intentionally without a menu. */
export function atObbyExit(x: number, z: number, feetY = 0) {
  return feetY < 0.5 && x < OBBY_BOUNDS.minX && z > -19.5 && z < -15;
}

export interface ObbyRun {
  status: "idle" | "active" | "complete";
  step: number;
  checkpoint: number;
  startedAt: number;
  respawns: number;
}
export const emptyObbyRun = (): ObbyRun => ({
  status: "idle",
  step: 0,
  checkpoint: 0,
  startedAt: 0,
  respawns: 0,
});

/** Only grounded, ordered visits count. Walking underneath or touching a side never advances. */
export function landOnObby(run: ObbyRun, id: string, now: number): ObbyRun {
  const index = OBBY_PLATFORMS.findIndex((platform) => platform.id === id);
  if (index < 0) return run;
  if (index === 0 && run.status !== "active") {
    return { ...emptyObbyRun(), status: "active", startedAt: now };
  }
  if (run.status !== "active" || index !== run.step + 1) return run;
  const platform = OBBY_PLATFORMS[index]!;
  return {
    ...run,
    step: index,
    checkpoint: platform.kind === "checkpoint" ? index : run.checkpoint,
    status: platform.kind === "finish" ? "complete" : "active",
  };
}

export function respawnObbyRun(run: ObbyRun): ObbyRun {
  return run.status === "active"
    ? { ...run, step: run.checkpoint, respawns: run.respawns + 1 }
    : run;
}

/** Match the solid crate/container bodies, not just a thin floating top collider. */
export function platformThickness(p: ObbyPlatform) {
  if (p.thickness !== undefined) return p.thickness;
  if (p.id === "step3" || p.id === "checkpoint2") return Math.min(2.3, p.top);
  if (p.kind === "step") return p.top - (p.top > 3 ? 3.45 : 0);
  return 0.32;
}
