/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Object3D, SpotLight, Vector3, type MeshStandardMaterial } from "three";
import { readParachuteGrip } from "@/game/obby/parachute-visual";
import { useClub } from "@/game/club/store";
import { useDungeon } from "@/game/dungeon/store";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { isMountainPosition } from "./model";
import { useMountain } from "./store";

/** One local, shadow-free light, held at the animated palm and aimed with the player's body. */
export function Flashlight() {
  const root = useRef<Group>(null);
  const light = useRef<SpotLight>(null);
  const lens = useRef<MeshStandardMaterial>(null);
  const scratch = useMemo(() => {
    const target = new Object3D();
    // Target belongs to this group, so it follows the barrel without per-frame scene additions.
    target.position.set(0, 20, 0);
    return {
      target,
      palm: new Vector3(),
      direction: new Vector3(0, 0, 1),
      up: new Vector3(0, 1, 0),
    };
  }, []);

  useFrame(() => {
    const group = root.current;
    if (!group || !light.current || !lens.current) return;
    const mountain = useMountain.getState();
    const position = useGame.getState().playerPos;
    group.visible = false;
    light.current.intensity = 0;
    if (
      !mountain.flashlightOwned ||
      !mountain.flashlightEquipped ||
      mountain.flight ||
      !useChannels.getState().playing ||
      useHud.getState().sheet === "camera" ||
      useClub.getState().inside ||
      useDungeon.getState().data?.instance ||
      !isMountainPosition(position[0], position[2])
    )
      return;
    const parent = group.parent;
    const character = parent?.getObjectByName("CharacterVisual");
    if (!parent || !character) return;
    if (!readParachuteGrip(character, "Right", parent, scratch.palm)) return;

    // The visual parent owns body yaw; local +Z stays forward even when the camera orbits.
    group.position.copy(scratch.palm);
    group.quaternion.setFromUnitVectors(scratch.up, scratch.direction);
    group.visible = true;
    light.current.intensity = mountain.flashlightOn ? 34 : 0;
    lens.current.emissiveIntensity = mountain.flashlightOn ? 1.5 : 0;
  });

  return (
    <group
      ref={root}
      name="MountainFlashlight"
      visible={false}
      userData={{ ignoreCameraCollision: true }}
    >
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.065, 0.06, 0.27, 10]} />
        <meshStandardMaterial color="#34474c" roughness={0.75} />
      </mesh>
      <mesh position={[0, -0.115, 0]}>
        <cylinderGeometry args={[0.071, 0.065, 0.035, 10]} />
        <meshStandardMaterial color="#ffac35" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.19, 0]}>
        <cylinderGeometry args={[0.105, 0.065, 0.12, 10]} />
        <meshStandardMaterial color="#e8a03b" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.255, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.035, 10]} />
        <meshStandardMaterial color="#35464c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.275, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.087, 12]} />
        <meshStandardMaterial
          ref={lens}
          color="#fff4cb"
          emissive="#fff0bb"
          emissiveIntensity={0}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 0.1, 0.062]}>
        <boxGeometry args={[0.035, 0.055, 0.015]} />
        <meshStandardMaterial color="#f6eddd" roughness={0.75} />
      </mesh>
      <primitive object={scratch.target} />
      <spotLight
        ref={light}
        name="MountainFlashlightBeam"
        position={[0, 0.29, 0]}
        target={scratch.target}
        color="#fff0cb"
        intensity={0}
        distance={22}
        angle={0.46}
        penumbra={0.65}
        decay={1.2}
        castShadow={false}
      />
    </group>
  );
}
