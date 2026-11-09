/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { useReactiveWorld } from "./store";

const RED = "#d9303e";
const WHITE = "#fff9ed";
const parts: OutdoorPart[] = [];
for (const [x, z] of [
  [-8, 4.2],
  [8, 4.2],
  [29, 10],
  [53, 10],
  [29, -10],
  [53, -10],
]) {
  parts.push(
    { p: [x!, 1.5, z!], s: [0.07, 3, 0.07], color: WHITE },
    { p: [x! + 0.55, 2.65, z!], s: [1.1, 0.36, 0.04], color: RED },
    { p: [x! + 0.55, 2.29, z!], s: [1.1, 0.36, 0.04], color: WHITE },
  );
}
for (const [x, z] of [
  [-10, 11],
  [10, 11],
  [28, 0],
  [54, 0],
]) {
  parts.push(
    { p: [x!, 1.65, z!], s: [0.06, 3.3, 0.06], color: WHITE },
    { p: [x! + 0.2, 2.65, z!], s: [0.4, 1, 0.035], color: RED },
    { p: [x! + 0.2, 1.65, z!], s: [0.4, 1, 0.035], color: WHITE },
  );
}
parts.push(
  { p: [-4.6, 2.2, 7.2], s: [0.08, 4.4, 0.08], color: WHITE },
  { p: [4.6, 2.2, 7.2], s: [0.08, 4.4, 0.08], color: WHITE },
  { p: [0, 3.9, 7.2], s: [9.2, 1, 0.06], color: RED },
  { p: [0, 3.45, 7.24], s: [9.2, 0.1, 0.02], color: WHITE },
);
const marker: OutdoorPart[] = [
  { p: [0, 0.65, 0], s: [0.045, 1.3, 0.045], color: WHITE },
  { p: [0.34, 1.08, 0], s: [0.68, 0.23, 0.04], color: RED },
  { p: [0.34, 0.85, 0], s: [0.68, 0.23, 0.04], color: WHITE },
];

export function PahlawanQuestFlag() {
  return (
    <group name="pahlawan-quest-flag" position={[0, 1.35, 0]}>
      <OutdoorBatch items={marker} shadows={false} />
    </group>
  );
}

/** One static instance batch, one text mesh, no lights, shadows or colliders. */
export function NationalDayDecorations() {
  const active = useReactiveWorld((s) =>
    s.events.some((e) => e.type === "NATIONAL_DAY" && e.payload.theme === "pahlawan"),
  );
  if (!active) return null;
  return (
    <group name="national-day-pahlawan">
      <OutdoorBatch items={parts} shadows={false} />
      <Text
        position={[0, 3.94, 7.25]}
        fontSize={0.48}
        color={WHITE}
        maxWidth={8.8}
        textAlign="center"
      >
        Selamat Hari Pahlawan
      </Text>
    </group>
  );
}
