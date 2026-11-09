/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { Group } from "three";
import { useMountain } from "./store";
import type { MountainPoint, WorldLocation } from "./model";

const RED = "#d9473f",
  WHITE = "#fff6dd",
  GLASS = "#193e50";

/** A compact civilian helicopter. Boarding is beside the cabin, clear of the skids. */
export function Helicopter({ location }: { location: WorldLocation }) {
  const rotor = useRef<Group>(null),
    tailRotor = useRef<Group>(null),
    cabin = useRef<Group>(null);
  useFrame((_, delta) => {
    const flight = useMountain.getState().flight;
    const active = !!flight && flight.from === location;
    if (rotor.current) rotor.current.rotation.y += delta * (active ? 38 : 2.2);
    if (tailRotor.current) tailRotor.current.rotation.x += delta * (active ? 44 : 3.2);
    if (cabin.current) {
      const elapsed = flight ? Math.max(0, (Date.now() - flight.startedAt) / 1000) : 0;
      cabin.current.position.y = active ? Math.min(4.5, elapsed * 1.5) : 0;
      cabin.current.rotation.z = active ? Math.sin(elapsed * 2) * 0.025 : 0;
    }
  });
  return (
    <group name={`Helicopter-${location}`}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.05, 0.9, 1.7]} position={[0, 1.5, 0.25]} />
      </RigidBody>
      <group ref={cabin}>
        <mesh castShadow position={[0, 1.55, 0.2]} scale={[1.3, 1.12, 2.3]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color={WHITE} roughness={0.48} />
        </mesh>
        <mesh castShadow position={[0, 1.98, -0.5]} scale={[1.15, 0.7, 1.7]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color={RED} roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.78, 1.48]} scale={[1.08, 0.7, 0.85]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color={GLASS} metalness={0.35} roughness={0.2} />
        </mesh>
        <mesh position={[0, 1.78, 2.15]} rotation-x={-0.28}>
          <boxGeometry args={[0.075, 1.05, 0.07]} />
          <meshStandardMaterial color={WHITE} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh castShadow position={[side * 1.15, 1.7, -0.12]}>
              <boxGeometry args={[0.1, 1.15, 1.45]} />
              <meshStandardMaterial color={RED} />
            </mesh>
            <mesh position={[side * 1.22, 1.93, -0.02]}>
              <boxGeometry args={[0.045, 0.56, 1.04]} />
              <meshStandardMaterial color={GLASS} metalness={0.3} roughness={0.25} />
            </mesh>
            <mesh position={[side * 1.25, 1.49, 0.43]}>
              <boxGeometry args={[0.07, 0.07, 0.26]} />
              <meshStandardMaterial color={WHITE} />
            </mesh>
            <mesh castShadow position={[side * 1.35, 0.28, 0.2]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.085, 0.085, 4.2, 8]} />
              <meshStandardMaterial color="#344b55" metalness={0.4} />
            </mesh>
            {[-0.95, 1.15].map((z) => (
              <mesh key={z} castShadow position={[side * 1.08, 0.67, z]} rotation-z={side * 0.5}>
                <cylinderGeometry args={[0.07, 0.07, 0.95, 8]} />
                <meshStandardMaterial color="#344b55" />
              </mesh>
            ))}
            <mesh position={[side * 1.45, 1.35, -0.8]}>
              <sphereGeometry args={[0.075, 8, 6]} />
              <meshStandardMaterial
                color={side < 0 ? "#ff6d58" : "#7ce3b0"}
                emissive={side < 0 ? "#ff6d58" : "#7ce3b0"}
                emissiveIntensity={0.7}
              />
            </mesh>
          </group>
        ))}
        <mesh castShadow position={[0, 1.93, -3.55]} rotation-x={-Math.PI / 2}>
          <cylinderGeometry args={[0.16, 0.53, 4.8, 8]} />
          <meshStandardMaterial color={RED} roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0, 2.55, -5.75]} rotation-x={-0.3}>
          <boxGeometry args={[0.15, 1.85, 0.75]} />
          <meshStandardMaterial color={RED} />
        </mesh>
        <mesh position={[0, 2.2, -4.5]}>
          <boxGeometry args={[2.1, 0.11, 0.6]} />
          <meshStandardMaterial color={WHITE} />
        </mesh>
        <mesh position={[0, 3.03, -0.3]}>
          <cylinderGeometry args={[0.12, 0.16, 0.8, 8]} />
          <meshStandardMaterial color="#344b55" />
        </mesh>
        <group ref={rotor} position={[0, 3.42, -0.3]}>
          {[0, Math.PI / 2].map((rotation) => (
            <group key={rotation} rotation-y={rotation}>
              <mesh castShadow>
                <boxGeometry args={[9.2, 0.055, 0.26]} />
                <meshStandardMaterial color="#344b55" />
              </mesh>
              {[-1, 1].map((side) => (
                <mesh key={side} position={[side * 4.3, 0.006, 0]}>
                  <boxGeometry args={[0.5, 0.07, 0.27]} />
                  <meshStandardMaterial color="#f4be52" />
                </mesh>
              ))}
            </group>
          ))}
          <mesh>
            <sphereGeometry args={[0.21, 10, 6]} />
            <meshStandardMaterial color={RED} />
          </mesh>
        </group>
        <group ref={tailRotor} position={[0.24, 2.5, -5.6]}>
          {[0, Math.PI / 2].map((rotation) => (
            <mesh key={rotation} rotation-x={rotation}>
              <boxGeometry args={[0.08, 1.45, 0.14]} />
              <meshStandardMaterial color={GLASS} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

export function Helipad({
  position,
  location,
}: {
  position: MountainPoint;
  location: WorldLocation;
}) {
  return (
    <group position={[...position]} name={`Helipad-${location}`}>
      <RigidBody
        type="fixed"
        colliders={false}
        userData={{ mountainTrail: location === "mountain" }}
      >
        <CuboidCollider args={[6.2, 0.25, 6.2]} position={[0, -0.25, 0]} />
        <mesh receiveShadow position={[0, -0.25, 0]}>
          <boxGeometry args={[12.4, 0.5, 12.4]} />
          <meshStandardMaterial color="#747e75" roughness={1} />
        </mesh>
      </RigidBody>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}>
        <ringGeometry args={[5.15, 5.45, 48]} />
        <meshStandardMaterial color="#ffd16b" />
      </mesh>
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 0.015, 0]}>
          <boxGeometry args={[0.65, 0.02, 3.3]} />
          <meshStandardMaterial color={WHITE} />
        </mesh>
      ))}
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[2.4, 0.02, 0.65]} />
        <meshStandardMaterial color={WHITE} />
      </mesh>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <group key={`${x}-${z}`} position={[x * 5.8, 0, z * 5.8]}>
            <mesh position={[0, 0.18, 0]}>
              <cylinderGeometry args={[0.18, 0.22, 0.36, 8]} />
              <meshStandardMaterial color="#354d4b" />
            </mesh>
            <mesh position={[0, 0.4, 0]}>
              <sphereGeometry args={[0.16, 8, 6]} />
              <meshStandardMaterial color="#fff4b9" emissive="#ffc76b" emissiveIntensity={0.8} />
            </mesh>
          </group>
        )),
      )}
      <Helicopter location={location} />
      <group position={[-5.1, 0, 7.3]}>
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[0.16, 1.8, 0.16]} />
          <meshStandardMaterial color="#79584d" />
        </mesh>
        <mesh position={[0, 1.65, 0]}>
          <boxGeometry args={[4.4, 0.9, 0.14]} />
          <meshStandardMaterial color="#f6ebca" />
        </mesh>
        <Text
          position={[0, 1.7, 0.085]}
          fontSize={0.25}
          color="#3f5b4d"
          maxWidth={4}
          textAlign="center"
        >
          {location === "city" ? "HELIPAD · PEGUNUNGAN" : "HELIPAD · PUSAT KOTA"}
        </Text>
        <Text position={[0, 1.4, 0.085]} fontSize={0.14} color="#79584d">
          Naik dari samping helikopter
        </Text>
      </group>
    </group>
  );
}
