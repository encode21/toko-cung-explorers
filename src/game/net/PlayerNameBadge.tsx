/** @jsxImportSource @/game/jsx */
import { Billboard, Text } from "@react-three/drei";
import { useCallback, useMemo, useState } from "react";
import { Shape } from "three";
import { useProfile } from "@/identity/profile-store";
import { useNet } from "@/net/net-store";

const COLORS = ["#df3f93", "#8941dc", "#167f9f", "#3866d1", "#b337a0"];
const HEIGHT = 0.43;
const MAX_TEXT_WIDTH = 2.5;

function badgeColor(seed: string) {
  let hash = 0;
  for (const character of seed) hash = (Math.imul(hash, 31) + character.codePointAt(0)!) | 0;
  return COLORS[(hash >>> 0) % COLORS.length]!;
}

function pill(width: number) {
  const radius = HEIGHT / 2;
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

const heart = new Shape();
heart.moveTo(0, -0.1);
heart.bezierCurveTo(-0.035, -0.065, -0.11, -0.01, -0.11, 0.045);
heart.bezierCurveTo(-0.11, 0.12, -0.035, 0.13, 0, 0.07);
heart.bezierCurveTo(0.035, 0.13, 0.11, 0.12, 0.11, 0.045);
heart.bezierCurveTo(0.11, -0.01, 0.035, -0.065, 0, -0.1);
heart.closePath();

/** A small world-space name badge that follows the avatar's interpolated root. */
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
  const characters = Array.from(name.replace(/\s+/g, " ").trim() || "Pengunjung");
  const label =
    characters.length > 24 ? `${characters.slice(0, 23).join("")}…` : characters.join("");
  const [measured, setMeasured] = useState({ text: "", width: 0 });
  const naturalWidth = measured.text === label ? measured.width : Array.from(label).length * 0.13;
  const textWidth = Math.min(MAX_TEXT_WIDTH, Math.max(0.25, naturalWidth));
  const textScale = naturalWidth > MAX_TEXT_WIDTH ? MAX_TEXT_WIDTH / naturalWidth : 1;
  const iconWidth = local ? 0 : 0.31;
  const width = Math.max(0.8, textWidth + iconWidth + 0.34);
  const shape = useMemo(() => pill(width), [width]);
  const color = local ? "#972eff" : badgeColor(seed);
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
      position={[0, height, 0]}
      name={`player-name-${seed}`}
      userData={{ ignoreCameraCollision: true }}
    >
      <mesh renderOrder={2} raycast={() => null}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={color} toneMapped={false} depthWrite={false} />
      </mesh>
      {!local && (
        <mesh
          position={[-(textWidth + iconWidth) / 2 + 0.11, 0, 0.012]}
          renderOrder={3}
          raycast={() => null}
        >
          <shapeGeometry args={[heart]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      <Text
        position={[iconWidth / 2, 0, 0.015]}
        scale={textScale}
        fontSize={0.23}
        fontWeight={700}
        whiteSpace="nowrap"
        anchorX="center"
        anchorY="middle"
        color={local ? "#b6ff40" : "#ffffff"}
        renderOrder={3}
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
          renderOrder={3}
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
