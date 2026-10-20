/** @jsxImportSource @/game/jsx */
import { Billboard, Html, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useMemo, useRef, useState } from "react";
import { Shape, Vector3, type Camera, type Group, type Object3D } from "three";
import { useProfile } from "@/identity/profile-store";
import { useNet } from "@/net/net-store";
import { useClub } from "@/game/club/store";
import { useHud } from "@/state/hud-store";
import { isWorldLabelVisible, WORLD_HTML_LAYERS } from "@/game/engine/world-html-layers";
import "./player-name-badge.css";

const COLORS = ["#df3f93", "#8941dc", "#167f9f", "#3866d1", "#b337a0"];
/** Other players' names are smaller and vanish near the lens so indoor POV stays clear. */
const REMOTE_SCALE = 0.68;
const REMOTE_HIDE_DISTANCE = 2.6;
const badgeWorld = new Vector3();

function tooCloseToCamera(anchor: Object3D, camera: Camera) {
  anchor.getWorldPosition(badgeWorld);
  return badgeWorld.distanceTo(camera.position) < REMOTE_HIDE_DISTANCE;
}

function badgeColor(seed: string) {
  let hash = 0;
  for (const character of seed) hash = (Math.imul(hash, 31) + character.codePointAt(0)!) | 0;
  return COLORS[(hash >>> 0) % COLORS.length]!;
}

type ResolvedBadge = {
  label: string;
  seed: string;
  color: string;
  local: boolean;
  height: number;
  subtitle: string | undefined;
};

/** Use the DOM layer while a venue video is mounted; keep city/dungeon labels on the GPU. */
export function PlayerNameBadge({
  name,
  seed,
  local = false,
  height = 2.2,
  subtitle,
}: {
  name: string;
  seed: string;
  local?: boolean;
  height?: number;
  subtitle?: string;
}) {
  const videoVenue = useClub((s) => s.inside);
  const photoActive = useHud((s) => s.sheet === "camera");
  if (photoActive) return null;
  const characters = Array.from(name.replace(/\s+/g, " ").trim() || "Pengunjung");
  const label =
    characters.length > 24 ? `${characters.slice(0, 23).join("")}…` : characters.join("");
  const badge = {
    label,
    seed,
    local,
    height,
    subtitle,
    color: local ? "#972eff" : badgeColor(seed),
  };
  return videoVenue ? <HtmlPlayerNameBadge {...badge} /> : <MeshPlayerNameBadge {...badge} />;
}

function HtmlPlayerNameBadge({ label, seed, color, local, height, subtitle }: ResolvedBadge) {
  const anchor = useRef<Group>(null);
  const element = useRef<HTMLDivElement>(null);
  const camera = useThree((s) => s.camera);

  const syncVisibility = useCallback(() => {
    if (!element.current) return;
    element.current.style.visibility =
      anchor.current &&
      isWorldLabelVisible(anchor.current, camera) &&
      (local || !tooCloseToCamera(anchor.current, camera))
        ? "visible"
        : "hidden";
  }, [camera, local]);
  useFrame(syncVisibility);

  return (
    <group
      ref={anchor}
      position={[0, height, 0]}
      name={`player-name-${seed}`}
      userData={{ ignoreCameraCollision: true }}
    >
      <Html
        transform
        sprite
        // 100 CSS pixels per world unit keeps the original 0.43-high badge and 0.23 text.
        distanceFactor={local ? 4 : 4 * REMOTE_SCALE}
        zIndexRange={local ? WORLD_HTML_LAYERS.playerName : WORLD_HTML_LAYERS.remotePlayerName}
        // Venue names are overlays: scene-wide raycasts can hide them behind invisible
        // collision/helper meshes. Avatar visibility and camera clipping are checked above.
        occlude={false}
        pointerEvents="none"
        style={{ pointerEvents: "none" }}
      >
        <div
          ref={element}
          className="player-name-badge"
          data-player-name={seed}
          style={{ visibility: "hidden" }}
        >
          <div
            className="player-name-badge-pill"
            style={{
              backgroundColor: color,
              color: local ? "#b6ff40" : "#ffffff",
            }}
          >
            <span>{label}</span>
          </div>
          {subtitle && <div className="player-name-badge-subtitle">{subtitle}</div>}
        </div>
      </Html>
    </group>
  );
}

function pill(width: number) {
  const radius = 0.43 / 2;
  const left = -width / 2;
  const right = width / 2;
  const shape = new Shape();
  shape.moveTo(left + radius, -radius);
  shape.lineTo(right - radius, -radius);
  shape.absarc(right - radius, 0, radius, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(left + radius, radius);
  shape.absarc(left + radius, 0, radius, Math.PI / 2, (3 * Math.PI) / 2, false);
  shape.closePath();
  return shape;
}

/** Existing mesh badge avoids adding DOM portals and per-name raycasts throughout the city. */
function MeshPlayerNameBadge({ label, seed, color, local, height, subtitle }: ResolvedBadge) {
  const [measured, setMeasured] = useState({ text: "", width: 0 });
  const naturalWidth = measured.text === label ? measured.width : Array.from(label).length * 0.13;
  const textWidth = Math.min(2.5, Math.max(0.25, naturalWidth));
  const textScale = naturalWidth > 2.5 ? 2.5 / naturalWidth : 1;
  const iconWidth = local ? 0 : 0.31;
  const width = Math.max(0.8, textWidth + iconWidth + 0.34);
  const shape = useMemo(() => pill(width), [width]);
  const anchor = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  useFrame(() => {
    if (!local && anchor.current)
      anchor.current.visible = !tooCloseToCamera(anchor.current, camera);
  });
  const pillOrder = local ? 2 : 1;
  const textOrder = local ? 3 : 1;
  const onSync = useCallback(
    (mesh: { textRenderInfo?: { blockBounds: readonly number[] } }) => {
      const bounds = mesh.textRenderInfo?.blockBounds;
      if (!bounds) return;
      const next = bounds[2]! - bounds[0]!;
      if (!Number.isFinite(next) || next <= 0) return;
      setMeasured((current) =>
        current.text === label && Math.abs(current.width - next) < 0.001
          ? current
          : { text: label, width: next },
      );
    },
    [label],
  );

  return (
    <Billboard
      ref={anchor}
      position={[0, height, 0]}
      scale={local ? 1 : REMOTE_SCALE}
      name={`player-name-${seed}`}
      userData={{ ignoreCameraCollision: true }}
    >
      <mesh renderOrder={pillOrder} raycast={() => null}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={color} toneMapped={false} depthWrite={false} />
      </mesh>
      <Text
        position={[iconWidth / 2, 0, 0.015]}
        scale={textScale}
        fontSize={0.23}
        fontWeight={700}
        whiteSpace="nowrap"
        anchorX="center"
        anchorY="middle"
        color={local ? "#b6ff40" : "#ffffff"}
        renderOrder={textOrder}
        raycast={() => null}
        material-depthWrite={false}
        material-toneMapped={false}
        onSync={onSync}
      >
        {label}
      </Text>
      {subtitle && (
        <Text
          position={[0, -0.3, 0.015]}
          fontSize={0.11}
          maxWidth={2.6}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          color="#fff5d6"
          outlineColor="#282035"
          outlineWidth={0.012}
          renderOrder={textOrder}
          raycast={() => null}
          material-depthWrite={false}
          material-toneMapped={false}
        >
          {subtitle}
        </Text>
      )}
    </Billboard>
  );
}

export function LocalPlayerNameBadge({ height }: { height: number }) {
  const profileName = useProfile((state) => state.profile?.displayName);
  const name = useNet((state) => state.name);
  return (
    <PlayerNameBadge
      name={profileName || name || "Pengunjung"}
      seed="local"
      local
      height={height}
    />
  );
}
