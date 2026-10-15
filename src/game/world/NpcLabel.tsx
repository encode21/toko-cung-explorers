/** @jsxImportSource @/game/jsx */
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useGame } from "@/state/game-store";

const SHOW = 4.2;
const FULL = 2.6;
const MAX_TEXT_WIDTH = 2.2;
const v = new THREE.Vector3();
const ignoreRaycast = () => null;

type LabelText = THREE.Mesh & {
  textRenderInfo?: { blockBounds: ArrayLike<number> };
};

function shortLabel(value: string, limit: number) {
  const characters = Array.from(value.replace(/\s+/g, " ").trim());
  return characters.length > limit
    ? `${characters.slice(0, limit - 1).join("")}…`
    : characters.join("");
}

function fitText(mesh: LabelText, setWidth: (width: number) => void) {
  const bounds = mesh.textRenderInfo?.blockBounds;
  if (!bounds) return;
  const width = bounds[2]! - bounds[0]!;
  if (!Number.isFinite(width) || width <= 0) return;
  const scale = Math.min(1, MAX_TEXT_WIDTH / width);
  mesh.scale.setScalar(scale);
  setWidth(width * scale);
}

function pillShape(width: number, height: number) {
  const shape = new THREE.Shape();
  const x = width / 2;
  const y = height / 2;
  shape.moveTo(-x + y, -y);
  shape.lineTo(x - y, -y);
  shape.quadraticCurveTo(x, -y, x, 0);
  shape.quadraticCurveTo(x, y, x - y, y);
  shape.lineTo(-x + y, y);
  shape.quadraticCurveTo(-x, y, -x, 0);
  shape.quadraticCurveTo(-x, -y, -x + y, -y);
  shape.closePath();
  return shape;
}

/** Label nama kecil di atas NPC — muncul halus hanya saat pemain dekat. */
export function NpcLabel({ text, height = 2.08 }: { text: string; height?: number }) {
  const ref = useRef<THREE.Group>(null);
  const background = useRef<THREE.MeshBasicMaterial>(null);
  const nameText = useRef<LabelText>(null);
  const roleText = useRef<LabelText>(null);
  const opacity = useRef(0);
  const [rawName = "", ...roles] = text.split(" · ");
  const name = shortLabel(rawName, 24);
  const role = shortLabel(roles.join(" · "), 30);
  const [nameWidth, setNameWidth] = useState(0);
  const [roleWidth, setRoleWidth] = useState(0);
  const width = Math.min(
    MAX_TEXT_WIDTH + 0.3,
    Math.max(
      0.65,
      Math.max(nameWidth || name.length * 0.09, role ? roleWidth || role.length * 0.055 : 0) + 0.3,
    ),
  );
  const badgeHeight = role ? 0.32 : 0.25;
  const outline = useMemo(() => pillShape(width, badgeHeight), [width, badgeHeight]);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.getWorldPosition(v);
    const [x, , z] = useGame.getState().playerPos;
    const d = Math.hypot(v.x - x, v.z - z);
    const target = d > SHOW ? 0 : d < FULL ? 1 : 1 - (d - FULL) / (SHOW - FULL);
    const s = THREE.MathUtils.damp(opacity.current, target, 10, dt);
    opacity.current = s;
    if (background.current) background.current.opacity = 0.62 * s;
    for (const mesh of [nameText.current, roleText.current]) {
      if (!mesh) continue;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((m) => {
        m.opacity = s;
      });
    }
    g.visible = s > 0.02;
  });

  return (
    <Billboard position={[0, height, 0]} userData={{ ignoreCameraCollision: true }}>
      <group ref={ref} visible={false}>
        <mesh renderOrder={2} raycast={ignoreRaycast}>
          <shapeGeometry args={[outline]} />
          <meshBasicMaterial
            ref={background}
            color="#11110e"
            transparent
            opacity={0}
            depthTest
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <Text
          ref={nameText}
          position={[0, role ? 0.06 : 0, 0.01]}
          fontSize={0.155}
          fontWeight={600}
          lineHeight={1}
          whiteSpace="nowrap"
          anchorX="center"
          anchorY="middle"
          color="#ffe27a"
          renderOrder={3}
          raycast={ignoreRaycast}
          onSync={(mesh: LabelText) => fitText(mesh, setNameWidth)}
          material-transparent
          material-opacity={0}
          material-depthTest
          material-depthWrite={false}
          material-toneMapped={false}
        >
          {name}
        </Text>
        {role && (
          <Text
            ref={roleText}
            position={[0, -0.08, 0.01]}
            fontSize={0.095}
            lineHeight={1}
            whiteSpace="nowrap"
            anchorX="center"
            anchorY="middle"
            color="#ecca68"
            renderOrder={3}
            raycast={ignoreRaycast}
            onSync={(mesh: LabelText) => fitText(mesh, setRoleWidth)}
            material-transparent
            material-opacity={0}
            material-depthTest
            material-depthWrite={false}
            material-toneMapped={false}
          >
            {role}
          </Text>
        )}
      </group>
    </Billboard>
  );
}
