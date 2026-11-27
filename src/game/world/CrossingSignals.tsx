/** @jsxImportSource @/game/jsx */
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useRef, useState } from "react";
import { MeshBasicMaterial } from "three";
import { mobilityNow } from "../mobility/store";
import { crossingPhase, type CrossingPhase } from "../traffic/crossing-signals";
import { CROSSWALKS } from "./outdoor-layout";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";

// Along-road offsets for the two curb posts, ordered from the low to the high curb.
// The eastbound Timur post sits
// at the end of the sidewalk, beyond the JPO stair exit and pickup driveway.
// Both Gang posts must sit south of the Jalan Utama junction.
const poleOffsets: Partial<Record<string, [number, number]>> = {
  timur: [3.4, -2],
  gang: [-2, -2],
};

const curbSetback = 0.9;
const sites = CROSSWALKS.flatMap((crossing) => {
  const width = crossing.maxX - crossing.minX;
  const depth = crossing.maxZ - crossing.minZ;
  const alongX = width < depth;
  const halfRoad = Math.max(width, depth) / 2;
  const cx = (crossing.minX + crossing.maxX) / 2;
  const cz = (crossing.minZ + crossing.maxZ) / 2;
  const offsets = poleOffsets[crossing.id] ?? [-2, 2];
  return ([-1, 1] as const).map((side) => {
    const along = offsets[side < 0 ? 0 : 1];
    const across = side * (halfRoad + curbSetback);
    return {
      x: cx + (alongX ? along : across),
      z: cz + (alongX ? across : along),
      // Local +X extends over the road. Local +Z faces the approaching left-hand lane.
      yaw: alongX ? (side * Math.PI) / 2 : side < 0 ? 0 : Math.PI,
      reach: curbSetback + halfRoad * 0.72,
      alongX,
    };
  });
});

const posts: OutdoorPart[] = [];
const frames: OutdoorPart[] = [];
const pedestrianFaces: OutdoorPart[] = [];
const lenses: Record<"x" | "z", Record<CrossingPhase["vehicle"], OutdoorPart[]>> = {
  x: { red: [], amber: [], green: [] },
  z: { red: [], amber: [], green: [] },
};
const figures: Record<CrossingPhase["pedestrian"], OutdoorPart[]> = {
  stop: [],
  walk: [],
};
const faceMaterial = new MeshBasicMaterial({ toneMapped: false });
const lampColors = {
  red: ["#ff4e50", "#561f29"],
  amber: ["#ffca39", "#554021"],
  green: ["#42ff99", "#174239"],
} as const;
// Lit segments in the curbside display. Shape cues keep the two signals distinct at night.
const symbols = {
  stop: [
    "..###..",
    "..###..",
    "...#...",
    ".#####.",
    ".#####.",
    ".#.#.#.",
    "...#...",
    "..#.#..",
    "..#.#..",
  ],
  walk: [
    "....##.",
    "....##.",
    "...##..",
    "..###..",
    ".#.#.#.",
    "...#...",
    "..#.#..",
    ".#...#.",
    "##...##",
  ],
};

for (const { x, z, yaw, reach, alongX } of sites) {
  const part = (
    lx: number,
    y: number,
    lz: number,
    w: number,
    h: number,
    d: number,
    color: string,
  ): OutdoorPart => ({
    p: [
      x + Math.cos(yaw) * lx + Math.sin(yaw) * lz,
      y,
      z - Math.sin(yaw) * lx + Math.cos(yaw) * lz,
    ],
    s: alongX ? [d, h, w] : [w, h, d],
    color,
  });
  posts.push(
    part(0, 0.22, 0, 0.38, 0.42, 0.38, "#242a30"),
    part(0, 3, 0, 0.16, 5.88, 0.16, "#2b3035"),
    part(0, 0.72, 0, 0.24, 0.88, 0.24, "#343c43"),
    part(0, 5.68, 0, 0.21, 0.55, 0.21, "#87969d"),
  );
  frames.push(
    part(reach / 2, 5.88, 0, reach + 0.16, 0.15, 0.15, "#b6cbd0"),
    part(reach, 5.68, 0, 0.13, 0.34, 0.13, "#516873"),
    part(reach, 4.83, 0, 0.62, 1.48, 0.3, "#e3a642"),
    part(reach, 4.83, 0.15, 0.54, 1.4, 0.14, "#17292e"),
  );

  for (const [index, lamp] of (["red", "amber", "green"] as const).entries()) {
    const y = 5.27 - index * 0.44;
    frames.push(part(reach, y + 0.195, 0.28, 0.47, 0.065, 0.32, "#2a3e44"));
    for (const active of ["red", "amber", "green"] as const) {
      const lens = part(
        reach,
        y,
        0.235,
        0.37,
        0.048,
        0.37,
        lampColors[lamp][active === lamp ? 0 : 1],
      );
      // OutdoorBatch cylinders stand on Y. Tilt the thin lens onto the road-facing plane.
      if (alongX) lens.rz = Math.PI / 2;
      else lens.rx = Math.PI / 2;
      lenses[alongX ? "x" : "z"][active].push(lens);
    }
  }

  // Two permanent yellow housings, each with its own dark circular lens.
  // Local +X faces pedestrians across the street; the brackets sit beside the pole.
  for (const [index, state] of (["stop", "walk"] as const).entries()) {
    const y = 3.05 - index * 0.85;
    frames.push(
      part(0, y, 0, 0.24, 0.19, 0.24, "#89969d"),
      part(0, y, 0.25, 0.12, 0.13, 0.5, "#65747d"),
      part(0.08, y, 0.5, 0.28, 0.8, 0.68, "#f5b933"),
      part(0.08, y + 0.44, 0.5, 0.13, 0.08, 0.13, "#343c43"),
    );
    const face = part(0.24, y, 0.5, 0.58, 0.045, 0.58, "#11191d");
    // The cylinder's axis is Y; turn it toward the opposite curb.
    if (alongX) face.rx = Math.PI / 2;
    else face.rz = Math.PI / 2;
    pedestrianFaces.push(face);

    for (const active of ["stop", "walk"] as const) {
      const colors = state === "walk" ? lampColors.green : lampColors.red;
      const color = colors[active === state ? 0 : 1];
      symbols[state].forEach((row, i) => {
        // Merge adjacent LED pixels into one box.
        for (const run of row.matchAll(/#+/g)) {
          const center = run.index + (run[0].length - 1) / 2;
          figures[active].push(
            part(
              0.275,
              y + (4 - i) * 0.052,
              0.5 + (center - 3) * 0.052,
              0.025,
              0.052,
              run[0].length * 0.052,
              color,
            ),
          );
        }
      });
    }
  }
}

export function CrossingSignals() {
  const [phase, setPhase] = useState(() => ({
    x: crossingPhase(mobilityNow(), "x"),
    z: crossingPhase(mobilityNow(), "z"),
  }));
  const displayed = useRef(phase);
  useFrame(() => {
    const now = mobilityNow();
    const x = crossingPhase(now, "x"),
      z = crossingPhase(now, "z");
    if (displayed.current.x !== x || displayed.current.z !== z) {
      displayed.current = { x, z };
      setPhase(displayed.current);
    }
  });
  return (
    <group name="CrossingSignals">
      <OutdoorBatch items={posts} shape="round" />
      <OutdoorBatch items={frames} shape="bevel" />
      <OutdoorBatch
        items={lenses.x[phase.x.vehicle]}
        shape="round"
        shadows={false}
        material={faceMaterial}
      />
      <OutdoorBatch
        items={lenses.z[phase.z.vehicle]}
        shape="round"
        shadows={false}
        material={faceMaterial}
      />
      <OutdoorBatch items={pedestrianFaces} shape="round" shadows={false} material={faceMaterial} />
      <OutdoorBatch items={figures[phase.x.pedestrian]} shadows={false} material={faceMaterial} />
      <RigidBody type="fixed" colliders={false}>
        {sites.map(({ x, z }) => (
          <CuboidCollider key={`${x}/${z}`} args={[0.12, 2.94, 0.12]} position={[x, 3, z]} />
        ))}
      </RigidBody>
    </group>
  );
}
