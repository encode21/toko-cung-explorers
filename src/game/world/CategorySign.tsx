/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CameraFade } from "./CameraFade";
/** Papan gantung lorong — kecil, menyatu dengan plafon. */
export function CategorySign({
  text,
  position,
  rotationY = 0,
  ceiling,
  tone = "#1e2a44",
  width = 1.5,
}: {
  text: string;
  position: [number, number, number];
  rotationY?: number;
  ceiling: number;
  tone?: string;
  width?: number;
}) {
  const drop = ceiling - position[1];
  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      userData={{ ignoreCameraCollision: true }}
    >
      <CameraFade>
        {[-width / 2 + 0.1, width / 2 - 0.1].map((x) => (
          <mesh key={x} position={[x, drop / 2, 0]}>
            <cylinderGeometry args={[0.008, 0.008, drop, 4]} />
            <meshBasicMaterial color="#6f7a80" />
          </mesh>
        ))}
        <mesh>
          <boxGeometry args={[width, 0.3, 0.04]} />
          <meshStandardMaterial color={tone} roughness={0.5} />
        </mesh>
        {[1, -1].map((s) => (
          <Text
            key={s}
            position={[0, 0, s * 0.025]}
            rotation={[0, s > 0 ? 0 : Math.PI, 0]}
            fontSize={0.13}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.06}
          >
            {text.toUpperCase()}
          </Text>
        ))}
      </CameraFade>
    </group>
  );
}
