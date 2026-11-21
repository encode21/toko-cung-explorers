/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Helipad } from "./Helicopter";
import { MountainLantern as Lantern } from "./MountainLantern";
import { CITY_HELIPAD } from "./model";

/** City-side helipad; kept apart from MountainScene so the mountain bundle loads only when visiting. */
export function CityHelipad() {
  return (
    <group name="CityHelicopterDeparture">
      <Helipad position={CITY_HELIPAD.position} location="city" />
      <RigidBody type="fixed" colliders={false}>
        <mesh receiveShadow position={[67.5, -0.09, 49]}>
          <boxGeometry args={[4.5, 0.22, 4.2]} />
          <meshStandardMaterial color="#d9c9a9" roughness={1} />
        </mesh>
        {/* Top 0.02, below the helipad pad (0.04) it overlaps — avoids z-fighting. */}
        <CuboidCollider args={[2.25, 0.11, 2.1]} position={[67.5, -0.09, 49]} />
      </RigidBody>
      <Lantern position={[66.7, 0.04, 46]} />
      <Lantern position={[66.7, 0.04, 52]} />
    </group>
  );
}
