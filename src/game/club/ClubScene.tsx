/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { Group } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { useWorldEditor, type WorldTarget } from "@/game/editor/store";
import { useLowQuality } from "@/game/engine/render-budget";
import { LOW_QUALITY } from "@/game/engine/quality";
import { useClub, clubNow } from "./store";
import { trackTitle } from "./model";
import { YOUTUBE_ENABLED } from "./music-provider";
import { setClubYoutubeHost, useClubYoutubeUi } from "./youtube-host";
const COLORS = { neon: "#d977ef", ocean: "#49dcdb", sunset: "#ffaf65" };
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
): AssetPart => ({ p, s, color, shape: "bevel", finish: "paint" });
const roomParts: AssetPart[] = [
  part([0, -0.2, 0], [24, 0.4, 22], "#29283c"),
  part([-12, 3, 0], [0.4, 6, 22], "#403144"),
  part([12, 3, 0], [0.4, 6, 22], "#403144"),
  part([0, 3, -11], [24, 6, 0.4], "#302d42"),
  part([0, 3, 11], [24, 6, 0.4], "#302d42"),
  ...[-1, 1].flatMap((sign) => [
    part([sign * 9, 0.4, 1], [3, 0.8, 7], "#92545e"),
    part([sign * 10, 0.95, 1], [0.5, 1, 7], "#ba776c"),
    part([sign * 6.8, 0.55, 1], [1.2, 1.1, 2], "#a78162"),
  ]),
];
function Lights() {
  const low = useLowQuality();
  const ref = useRef<Group>(null);
  const preset = useClub((s) => s.data?.lighting ?? "neon");
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = Math.sin(clubNow() / 4000) * 0.45;
  });
  return (
    <group ref={ref}>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <group key={`${x}${z}`} position={[x * 4, 0, z * 3]} rotation={[0.3 * x, 0, 0.25 * z]}>
            <mesh position={[0, -2, 0]}>
              <coneGeometry args={[1.5, 4, low ? 6 : 10, 1, true]} />
              <meshBasicMaterial
                color={COLORS[preset]}
                transparent
                opacity={0.1}
                depthWrite={false}
              />
            </mesh>
            <mesh>
              <boxGeometry args={[0.5, 0.25, 0.5]} />
              <meshBasicMaterial color={COLORS[preset]} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}
function ClubEntity({ t }: { t: WorldTarget }) {
  const data = useClub((s) => s.data);
  const color = COLORS[data?.lighting ?? "neon"];
  const booth = useMemo<AssetPart[]>(
    () => [
      part([0, 0.6, 0], [4, 1.2, 1.5], "#84584a"),
      part([0, 1.23, 0], [4.2, 0.12, 1.7], "#272535"),
      part([0, 1.34, 0], [0.8, 0.1, 0.7], "#66657a"),
      ...[-1, 1].flatMap((sign) => [
        {
          ...part([sign * 1.25, 1.34, 0], [0.85, 0.08, 0.85], "#151921"),
          shape: "cylinder" as const,
        },
        part([sign * 2.7, 0.95, 0], [0.8, 1.9, 0.8], "#272535"),
        ...[0, 0.3, 0.6].map((z) =>
          part([sign * 0.22, 1.43, z - 0.3], [0.08, 0.05, 0.12], "#dcaf72"),
        ),
      ]),
    ],
    [],
  );
  return (
    <group
      name={t.id}
      userData={{ entityId: t.id }}
      position={[t.position.x, t.position.y, t.position.z]}
      rotation={[t.rotation.x, t.rotation.y, t.rotation.z]}
      scale={[t.scale.x, t.scale.y, t.scale.z]}
    >
      {t.type === "CLUB_ENTRANCE" && (
        <>
          <StyledBatch
            items={[
              part([-1.3, 1.4, 0], [0.35, 2.8, 0.6], "#935f53"),
              part([1.3, 1.4, 0], [0.35, 2.8, 0.6], "#935f53"),
              part([0, 2.9, 0], [3, 0.5, 0.6], "#302d42"),
            ]}
          />
          <Text position={[0, 2.9, 0.35]} fontSize={0.23} color={color}>
            {t.tags.includes("club-exit") ? "↑ KOTA · EXIT" : "↓ CUNG UNDERGROUND"}
          </Text>
          <Text position={[0, 1.8, 0.1]} fontSize={0.18} color="#ffe8bb">
            {t.tags.includes("club-exit") ? "Sampai jumpa" : "DANCE · LOUNGE · DJ"}
          </Text>
        </>
      )}
      {t.type === "DJ_BOOTH" && (
        <>
          <StyledBatch items={booth} />
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[2, 0.6, 0.75]} position={[0, 0.6, 0]} />
          </RigidBody>
          <Text position={[0, 0.7, 0.78]} fontSize={0.25} color={color}>
            CUNG SELECTORS
          </Text>
        </>
      )}
      {t.type === "DANCE_ZONE" && (
        <group scale={[t.radius / 5, 1, t.radius / 5]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#493b61" />
          </mesh>
          <StyledBatch
            items={Array.from({ length: 36 }, (_, i) =>
              part(
                [(i % 6) * 1.6 - 4, 0.04, Math.floor(i / 6) * 1.6 - 4],
                [1.5, 0.035, 1.5],
                i % 2 ? "#695174" : "#438789",
              ),
            )}
          />
        </group>
      )}
      {t.type === "MUSIC_SCREEN" && (
        <ClubMusicScreen color={color} mediaId={data?.mediaId ?? null} />
      )}
      {t.type === "LIGHT_CONTROLLER" && <Lights />}
      {t.type === "CLUB_SPAWN" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.6, 0.7, 24]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
    </group>
  );
}
function ClubMusicScreen({ color, mediaId }: { color: string; mediaId: string | null }) {
  // Stable callback ref — avoids remounting YouTube on every status re-render.
  const hostCb = useRef((el: HTMLDivElement | null) => {
    setClubYoutubeHost(el);
  }).current;
  const title = trackTitle(mediaId);
  const status = useClubYoutubeUi((s) => s.status);
  const errorCode = useClubYoutubeUi((s) => s.errorCode);
  // Mobile / low-quality: smaller CSS + higher distanceFactor so the wall panel stays on the mesh
  // (world ≈ cssPx * distanceFactor/400). Desktop keeps a slightly larger screen.
  const mobile =
    typeof window !== "undefined" &&
    (LOW_QUALITY || window.matchMedia("(max-width: 900px), (pointer: coarse)").matches);
  const DF = mobile ? 5.2 : 4.4;
  const W = mobile ? 400 : 560;
  const H = mobile ? 168 : 220;

  useEffect(() => () => setClubYoutubeHost(null), []);

  return (
    <>
      <mesh>
        <boxGeometry args={[6.4, 2.25, 0.16]} />
        <meshBasicMaterial color="#0b0d16" />
      </mesh>
      <Text position={[0, 1.22, 0.12]} fontSize={0.14} color={color} anchorX="center">
        CUNG UNDERGROUND · NOW PLAYING
      </Text>
      {YOUTUBE_ENABLED ? (
        <Html
          transform
          distanceFactor={DF}
          position={[0, -0.05, 0.12]}
          style={{ width: W, height: H, pointerEvents: "none" }}
          zIndexRange={[20, 0]}
        >
          <div
            className="pointer-events-none overflow-hidden rounded border border-white/20 bg-black text-white"
            style={{ width: W, height: H }}
          >
            <div className="flex items-center justify-between gap-2 bg-[#15121f]/95 px-2 py-0.5 text-[9px] tracking-wider text-fuchsia-200/90">
              <span>LIVE</span>
              <span className="truncate text-white/70">{title}</span>
              {(status === "unavailable" || status === "failed") && (
                <span className="text-rose-300">err{errorCode != null ? ` ${errorCode}` : ""}</span>
              )}
            </div>
            <div className="relative bg-black" style={{ width: W, height: H - 20 }}>
              <div
                ref={hostCb}
                className="h-full w-full bg-black"
                style={{ minWidth: 200, minHeight: 112 }}
              />
            </div>
          </div>
        </Html>
      ) : (
        <>
          <Text
            position={[0, 0.15, 0.12]}
            fontSize={0.28}
            color="#fff3dc"
            maxWidth={5.5}
            textAlign="center"
          >
            {title}
          </Text>
          <Text position={[0, -0.55, 0.12]} fontSize={0.16} color="#bcb2cd">
            YouTube disabled
          </Text>
        </>
      )}
    </>
  );
}

export function ClubScene() {
  const inside = useClub((s) => s.inside);
  const lighting = useClub((s) => s.data?.lighting ?? "neon");
  const targets = useWorldEditor((s) => s.targets);
  const editing = useWorldEditor((s) => s.mode === "EDITOR");
  return (
    <>
      {inside && (
        <>
          <color attach="background" args={["#141120"]} />
          <fog attach="fog" args={["#141120", 20, 60]} />
          <ambientLight intensity={1.2} />
          <pointLight position={[0, -9, 0]} color={COLORS[lighting]} intensity={65} distance={22} />
          <group position={[0, -14, 0]}>
            <StyledBatch items={roomParts} />
            <RigidBody type="fixed" colliders={false}>
              <CuboidCollider args={[12, 0.2, 11]} position={[0, -0.2, 0]} />
              <CuboidCollider args={[0.2, 3, 11]} position={[-12, 3, 0]} />
              <CuboidCollider args={[0.2, 3, 11]} position={[12, 3, 0]} />
              <CuboidCollider args={[12, 3, 0.2]} position={[0, 3, -11]} />
              <CuboidCollider args={[12, 3, 0.2]} position={[0, 3, 11]} />
              {[-1, 1].map((x) => (
                <CuboidCollider key={x} args={[1.5, 0.5, 3.5]} position={[x * 9, 0.5, 1]} />
              ))}
            </RigidBody>
            <Text
              position={[-10, 2, -5]}
              rotation={[0, Math.PI / 2, 0]}
              fontSize={0.45}
              color="#e3ba94"
            >
              LOUNGE
            </Text>
          </group>
        </>
      )}
      {targets
        .filter(
          (t) =>
            t.active &&
            (inside ? t.position.y < -5 : t.position.y >= -5 || editing) &&
            [
              "CLUB_ENTRANCE",
              "DJ_BOOTH",
              "DANCE_ZONE",
              "MUSIC_SCREEN",
              "CLUB_SPAWN",
              "LIGHT_CONTROLLER",
            ].includes(t.type),
        )
        .map((t) => (
          <ClubEntity key={t.id} t={t} />
        ))}
    </>
  );
}
