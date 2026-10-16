/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { Billboard, Html, Text } from "@react-three/drei";
import {
  CuboidCollider,
  RigidBody,
  useBeforePhysicsStep,
  type RapierRigidBody,
} from "@react-three/rapier";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { CameraFade } from "@/game/world/CameraFade";
import {
  getObbyTime,
  checkpointNumber,
  OBBY_BOUNDS,
  OBBY_PLATFORMS,
  platformPosition,
  platformThickness,
  type ObbyPlatform,
} from "./model";
import { constructionPlatform, SITE_PARTS, SITE_SOLIDS, SITE } from "./construction";
import { useObby } from "./store";

const SLAB = 0.32;
const COLORS = [SITE.gold, SITE.ink];
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  ry = 0,
): OutdoorPart => ({ p, s, color, ry });

/** Painted chevrons stay on the platforms; they are not a second navigation system. */
function arrow(x: number, y: number, z: number, yaw: number): OutdoorPart[] {
  return [-1, 1].map((side) => {
    const localX = side * 0.12;
    return part(
      [x + localX * Math.cos(yaw), y, z - localX * Math.sin(yaw)],
      [0.09, 0.012, 0.38],
      "#fffaf0",
      yaw - (side * Math.PI) / 4,
    );
  });
}

const platformParts = constructionPlatform;

const staticPlatforms = OBBY_PLATFORMS.filter((platform) => platform.kind !== "moving");
const staticParts = OBBY_PLATFORMS.flatMap((platform, index) =>
  platform.kind === "moving" ? [] : platformParts(platform, index),
);
const mat: OutdoorPart[] = [
  part(
    [(OBBY_BOUNDS.minX + OBBY_BOUNDS.maxX) / 2, -0.015, (OBBY_BOUNDS.minZ + OBBY_BOUNDS.maxZ) / 2],
    [OBBY_BOUNDS.maxX - OBBY_BOUNDS.minX, 0.02, OBBY_BOUNDS.maxZ - OBBY_BOUNDS.minZ],
    "#baac93",
  ),
  ...Array.from({ length: 12 }, (_, index) =>
    part([29.3 + index * 2, 0.002, -30.04], [0.75, 0.012, 0.18], COLORS[index % COLORS.length]!),
  ),
  // This unobstructed strip returns to the west entrance after Finish.
  part([39.5, 0.002, -16.2], [22, 0.014, 0.55], "#fff0ce"),
  ...[33, 37, 41, 45].flatMap((x) => arrow(x, 0.018, -16.2, -Math.PI / 2)),
];
const entrySign: OutdoorPart[] = [
  part([28.3, 1.05, -11.8], [0.12, 2.1, 0.12], "#79584d"),
  part([28.3, 2.18, -11.8], [2.1, 0.78, 0.12], "#39bedc"),
  part([28.3, 2.65, -11.8], [1.55, 0.14, 0.16], "#ffb546"),
];

function PlatformStamp({ platform, index }: { platform: ObbyPlatform; index: number }) {
  const checkpoint = useObby((state) => state.checkpoint);
  const status = useObby((state) => state.status);
  const moving = platform.kind === "moving";
  const saved = platform.kind === "checkpoint" && status !== "idle" && checkpoint >= index;
  const label =
    platform.kind === "start"
      ? "START"
      : platform.kind === "finish"
        ? "FINISH"
        : platform.kind === "checkpoint"
          ? `${saved ? "✓ " : ""}CHECKPOINT ${checkpointNumber(platform.id)}`
          : String(index);
  return (
    <Text
      position={[
        moving ? 0 : platform.x,
        (moving ? SLAB / 2 : platform.top) + 0.035,
        (moving ? 0 : platform.z) + (platform.kind === "step" || moving ? 0.5 : 0),
      ]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={platform.kind === "checkpoint" ? 0.2 : 0.3}
      color="#344b55"
      anchorX="center"
      anchorY="middle"
    >
      {label}
    </Text>
  );
}

function MovingPlatform({ platform, index }: { platform: ObbyPlatform; index: number }) {
  const body = useRef<RapierRigidBody>(null);
  const initial = useMemo(() => platformPosition(platform, getObbyTime()), [platform]);
  const items = useMemo(() => platformParts(platform, index, true), [platform, index]);
  useBeforePhysicsStep((world) => {
    const rigidBody = body.current;
    if (!rigidBody) return;
    const p = platformPosition(platform, getObbyTime());
    const current = rigidBody.translation();
    // Rejoin the shared phase gently after a background tab or suspended physics tick.
    const maxStep = 0.5 * world.timestep;
    const z = current.z + Math.max(-maxStep, Math.min(maxStep, p.z - current.z));
    rigidBody.setNextKinematicTranslation({ x: p.x, y: p.y - SLAB / 2, z });
  });
  return (
    <RigidBody
      ref={body}
      name={`obby-platform-${platform.id}`}
      type="kinematicPosition"
      colliders={false}
      position={[initial.x, initial.y - SLAB / 2, initial.z]}
      userData={{ obbyPlatform: platform.id, cameraPassThrough: true }}
    >
      <CuboidCollider args={[platform.width / 2, SLAB / 2, platform.depth / 2]} friction={1} />
      <OutdoorBatch items={items} />
      <PlatformStamp platform={platform} index={index} />
    </RigidBody>
  );
}

function CourseFlags() {
  const start = OBBY_PLATFORMS[0]!;
  const finish = OBBY_PLATFORMS.at(-1)!;
  const flags = useMemo(() => {
    const parts: OutdoorPart[] = [];
    for (const platform of [start, finish]) {
      const color = platform.kind === "start" ? "#39bedc" : "#ffb546";
      for (const side of [-1, 1]) {
        const x = platform.x + side * (platform.width / 2 - 0.15);
        parts.push(part([x, platform.top + 1.15, platform.z + 0.8], [0.07, 2.3, 0.07], "#fff0ce"));
        parts.push(
          part([x - side * 0.25, platform.top + 2.1, platform.z + 0.8], [0.5, 0.35, 0.07], color),
        );
      }
    }
    return parts;
  }, [start, finish]);
  return <OutdoorBatch items={flags} shadows={false} />;
}

function CheckpointFlag({ platform, index }: { platform: ObbyPlatform; index: number }) {
  const checkpoint = useObby((state) => state.checkpoint);
  const status = useObby((state) => state.status);
  const saved = status !== "idle" && checkpoint >= index;
  const pole = useMemo(() => [part([0, 0.85, 0], [0.065, 1.7, 0.065], "#fff0ce")], []);
  return (
    <group
      position={[
        platform.x + platform.width / 2 - 0.12,
        platform.top,
        platform.z - platform.depth / 2 + 0.2,
      ]}
    >
      <OutdoorBatch items={pole} shadows={false} />
      {/* The flag faces the approaching camera without rotating the collision or platform. */}
      <Billboard position={[-0.32, 1.55, 0]} lockX lockZ>
        <mesh>
          <boxGeometry args={[0.8, 0.46, 0.055]} />
          <meshStandardMaterial color={saved ? "#9dcf75" : "#39bedc"} roughness={0.85} />
        </mesh>
        <Text position={[0, 0, 0.035]} fontSize={0.19} color="#344b55">
          {`${saved ? "✓ " : ""}CP ${checkpointNumber(platform.id)}`}
        </Text>
      </Billboard>
    </group>
  );
}

/** QA: stand in front of Start and warp to Finish (complete) for parachute tests. */
function FinishTestButton() {
  return (
    <Billboard position={[30.3, 1.35, -15.55]} follow lockX={false} lockZ={false}>
      <Html center transform distanceFactor={8} style={{ pointerEvents: "auto" }}>
        <button
          type="button"
          aria-label="Test: langsung ke Finish"
          onClick={(event) => {
            event.stopPropagation();
            useObby.getState().warpToFinish();
          }}
          style={{
            minHeight: 44,
            padding: "10px 16px",
            border: "2px solid #ffffffcc",
            borderRadius: 12,
            background: "#39bedc",
            color: "#134e63",
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: "0.04em",
            boxShadow: "0 3px 0 #1c6f8640",
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
          }}
        >
          TEST · KE FINISH
        </button>
      </Html>
    </Billboard>
  );
}

/** The city ground stays intact. All platform collision comes from this shared metre-based plan. */
export function PlazaObby() {
  return (
    <group name="PlazaObby">
      <OutdoorBatch items={mat} shadows={false} />
      <OutdoorBatch items={staticParts} />
      <OutdoorBatch items={SITE_PARTS} />
      <RigidBody type="fixed" colliders={false} userData={{ obbyCatchSurface: true }}>
        {SITE_SOLIDS.map((part, index) => (
          <CuboidCollider
            key={index}
            args={[part.s[0] / 2, part.s[1] / 2, part.s[2] / 2]}
            position={part.p}
            rotation={[part.rx ?? 0, part.ry ?? 0, part.rz ?? 0]}
          />
        ))}
      </RigidBody>
      <CourseFlags />
      <FinishTestButton />
      <Text position={[37.9, 6.55, -20.78]} fontSize={0.48} color="#fff5d6">
        CUNG / BUILD
      </Text>
      <Text position={[43.4, 4.25, -19.13]} fontSize={0.26} color="#344b55">
        PROYEK LANGIT
      </Text>
      {staticPlatforms.map((platform) => (
        <RigidBody
          key={platform.id}
          name={`obby-platform-${platform.id}`}
          type="fixed"
          colliders={false}
          position={[platform.x, platform.top - platformThickness(platform) / 2, platform.z]}
          userData={{ obbyPlatform: platform.id, cameraPassThrough: true }}
        >
          <CuboidCollider
            args={[platform.width / 2, platformThickness(platform) / 2, platform.depth / 2]}
            friction={1}
          />
        </RigidBody>
      ))}
      {OBBY_PLATFORMS.map((platform, index) =>
        platform.kind === "moving" ? (
          <MovingPlatform key={platform.id} platform={platform} index={index} />
        ) : (
          <PlatformStamp key={platform.id} platform={platform} index={index} />
        ),
      )}
      {OBBY_PLATFORMS.map((platform, index) =>
        platform.kind === "checkpoint" ? (
          <CheckpointFlag key={platform.id} platform={platform} index={index} />
        ) : null,
      )}
      <RigidBody
        name="obby-entry-ramp"
        type="fixed"
        colliders={false}
        position={[28.2, 0.08, -17.5]}
        rotation={[0, 0, Math.atan2(0.25, 1.4)]}
        userData={{ cameraPassThrough: true }}
      >
        <CuboidCollider args={[0.71, 0.04, 1.2]} />
        <mesh receiveShadow>
          <boxGeometry args={[1.42, 0.08, 2.4]} />
          <meshStandardMaterial color="#fff0ce" roughness={0.85} />
        </mesh>
      </RigidBody>
      <CameraFade>
        <OutdoorBatch items={entrySign} shadows={false} />
        <Text position={[28.3, 2.32, -11.72]} fontSize={0.22} color="#134e63">
          PROYEK LANGIT
        </Text>
        <Text position={[28.3, 2.02, -11.72]} fontSize={0.14} color="#134e63">
          ← LEWAT SISI PANGGUNG
        </Text>
      </CameraFade>
      <Text
        position={[30.3, 0.05, -15.8]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.18}
        color="#79584d"
      >
        {`START · ${OBBY_PLATFORMS.length} PIJAKAN KE LANGIT`}
      </Text>
      <Text
        position={[40.5, 0.03, -21]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.28}
        color="#79584d"
      >
        JATUH? KEMBALI KE CHECKPOINT
      </Text>
      <Text
        position={[49.7, 0.03, -16.15]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.18}
        color="#79584d"
      >
        ← KEMBALI KE PLAZA
      </Text>
    </group>
  );
}
