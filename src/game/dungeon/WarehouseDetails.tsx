/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
/** Decorative modular fittings share the existing floor/colliders. Nothing here marks a clue. */
export function WarehouseDetails() {
  return (
    <group>
      {/* Expansion joints and weathered concrete tile bands. */}
      {Array.from({ length: 11 }, (_, i) => i * 3 - 15).map((n) => (
        <group key={n}>
          <mesh position={[n, 0.005, 0]}>
            <boxGeometry args={[0.025, 0.008, 35.5]} />
            <meshStandardMaterial color="#3d5158" />
          </mesh>
          <mesh position={[0, 0.005, n]}>
            <boxGeometry args={[35.5, 0.008, 0.025]} />
            <meshStandardMaterial color="#3d5158" />
          </mesh>
          <mesh position={[n, 4, -17.7]}>
            <boxGeometry args={[0.15, 8, 0.12]} />
            <meshStandardMaterial color="#45616a" />
          </mesh>
        </group>
      ))}
      {/* Marked reception, sorting, and loading surfaces. */}
      {[
        { p: [-10, 0.02, 10] as const, s: [7, 5] as const, c: "#375b61", label: "01 / RECEPTION" },
        { p: [9, 0.02, 12] as const, s: [9, 7] as const, c: "#6b705d", label: "03 / DISPATCH" },
      ].map((zone) => (
        <group key={zone.label}>
          <mesh position={[...zone.p]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[...zone.s]} />
            <meshStandardMaterial color={zone.c} />
          </mesh>
          <Text
            position={[zone.p[0], 0.035, zone.p[2] + 1.8]}
            rotation-x={-Math.PI / 2}
            fontSize={0.38}
            color="#d4bd83"
          >
            {zone.label}
          </Text>
        </group>
      ))}
      {[-16, -4, 6, 17].map((x) => (
        <group key={x}>
          <mesh position={[x, 7.7, -10]}>
            <boxGeometry args={[0.25, 0.4, 15]} />
            <meshStandardMaterial color="#263e48" />
          </mesh>
          <mesh position={[x, 7.45, -7]}>
            <boxGeometry args={[0.38, 0.12, 2]} />
            <meshStandardMaterial color="#e6f4ed" emissive="#d8ede0" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}
      {/* Window-like office panels, bulletin sheets, desks and monitors. */}
      {[0, 3, 8, 11, 14].map((x) => (
        <group key={x}>
          <mesh position={[x, 5.7, -17.72]}>
            <boxGeometry args={[2.4, 2.2, 0.06]} />
            <meshStandardMaterial color="#82a7b1" metalness={0.4} roughness={0.3} />
          </mesh>
          <mesh position={[x, 5.7, -17.66]}>
            <boxGeometry args={[0.07, 2.2, 0.04]} />
            <meshStandardMaterial color="#243e4b" />
          </mesh>
        </group>
      ))}
      {[2, 8].map((x) => (
        <group key={x}>
          <mesh position={[x, 5.4, -10.7]}>
            <boxGeometry args={[0.9, 0.65, 0.12]} />
            <meshStandardMaterial color="#152d39" />
          </mesh>
          <mesh position={[x, 5.42, -10.62]}>
            <planeGeometry args={[0.75, 0.48]} />
            <meshStandardMaterial color="#68b3b1" emissive="#46898a" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[x + 0.85, 5.1, -10.5]}>
            <boxGeometry args={[0.36, 0.1, 0.48]} />
            <meshStandardMaterial color="#e0d2b0" />
          </mesh>
        </group>
      ))}
      <mesh position={[-10, 2.1, 13.1]}>
        <boxGeometry args={[3.6, 1.3, 0.16]} />
        <meshStandardMaterial color="#916d4d" />
      </mesh>
      {[-11, -10, -9].map((x) => (
        <mesh key={x} position={[x, 2.1, 13.2]}>
          <boxGeometry args={[0.55, 0.85, 0.02]} />
          <meshStandardMaterial color="#ded3b9" />
        </mesh>
      ))}
      <Text position={[-10, 3.2, 13.22]} fontSize={0.24} color="#e8d9ac">
        MISSION DESK
      </Text>
      {/* Loading shutter and hazard stripes, away from the travel interaction point. */}
      {Array.from({ length: 12 }, (_, n) => (
        <mesh key={n} position={[9, 0.28 + n * 0.35, 17.74]}>
          <boxGeometry args={[8, 0.3, 0.15]} />
          <meshStandardMaterial color={n % 2 ? "#5b7680" : "#455e67"} />
        </mesh>
      ))}
      {Array.from({ length: 10 }, (_, n) => (
        <mesh key={n} position={[4.5 + n, 0.04, 16]} rotation-y={-0.5}>
          <boxGeometry args={[0.35, 0.02, 1]} />
          <meshStandardMaterial color="#dcb263" />
        </mesh>
      ))}
      {/* A fire cabinet and exposed conduit give the corridors a human scale. */}
      <mesh position={[-3.77, 1.6, 2]}>
        <boxGeometry args={[0.2, 0.85, 0.55]} />
        <meshStandardMaterial color="#a34c3c" />
      </mesh>
      <mesh position={[-3.75, 3.5, -8]}>
        <boxGeometry args={[0.12, 0.12, 18]} />
        <meshStandardMaterial color="#a8a091" />
      </mesh>
      <mesh position={[17.75, 4.6, 4]}>
        <boxGeometry args={[0.15, 0.15, 24]} />
        <meshStandardMaterial color="#a8a091" />
      </mesh>
    </group>
  );
}
