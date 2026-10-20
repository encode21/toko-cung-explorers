/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import { useHud } from "@/state/hud-store";
import { readParachuteGrip } from "@/game/obby/parachute-visual";
import { usePhoto } from "./photo-store";

/** Anchored to the animated palm, not the canonical physics/player transform. */
export function SelfieStick() {
  const root = useRef<Group>(null);
  const scratch = useMemo(
    () => ({
      palm: new Vector3(),
      end: new Vector3(),
      direction: new Vector3(),
      up: new Vector3(0, 1, 0),
    }),
    [],
  );
  useFrame(() => {
    const group = root.current;
    if (!group) return;
    const photo = usePhoto.getState();
    group.visible = false;
    if (useHud.getState().sheet !== "camera" || photo.mode !== "selfie") return;
    const character = group.parent?.getObjectByName("CharacterVisual");
    if (!character || !group.parent) return;
    // Read in the parent's space so our last frame's translation cannot feed back into the grip.
    if (!readParachuteGrip(character, "Right", group.parent, scratch.palm)) return;
    const side = scratch.palm.x < 0 ? -1 : 1;
    // Keep the phone beside the face. The pole follows the selected selfie angle gently.
    const angle = photo.yaw * 0.35;
    scratch.end.set(
      scratch.palm.x + side * 0.26 + Math.sin(angle) * 0.45,
      scratch.palm.y + 0.34 + photo.pitch * 0.12,
      scratch.palm.z + 1.05,
    );
    scratch.direction.subVectors(scratch.end, scratch.palm).normalize();
    group.position.copy(scratch.palm);
    group.quaternion.setFromUnitVectors(scratch.up, scratch.direction);
    group.visible = true;
  });
  return (
    <group ref={root} name="SelfieStick" visible={false} userData={{ ignoreCameraCollision: true }}>
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.034, 0.038, 0.19, 8]} />
        <meshStandardMaterial color="#303842" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.59, 0]}>
        <cylinderGeometry args={[0.012, 0.021, 1, 8]} />
        <meshStandardMaterial color="#bacbd1" metalness={0.55} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.085, 0]}>
        <boxGeometry args={[0.14, 0.06, 0.055]} />
        <meshStandardMaterial color="#303842" />
      </mesh>
      <group position={[0, 1.19, 0]} rotation={[1.05, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.16, 0.28, 0.035]} />
          <meshStandardMaterial color="#39bedc" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[0.135, 0.24, 0.008]} />
          <meshStandardMaterial color="#183d52" roughness={0.3} />
        </mesh>
        <mesh position={[-0.047, 0.092, 0.022]}>
          <sphereGeometry args={[0.019, 8, 6]} />
          <meshStandardMaterial color="#24313e" />
        </mesh>
      </group>
    </group>
  );
}
