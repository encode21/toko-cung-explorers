/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { Group, Vector3 } from "three";
import { readParachuteGrip } from "@/game/obby/parachute-visual";
import { useGame } from "@/state/game-store";
import { useChannels } from "@/net/channel-store";
import { useMountain } from "./store";
import { useSummitLeaderboard } from "./leaderboard";
import { remoteStates } from "@/net/useWorldChannel";
import { sanitizeMountainGear } from "./network-gear";
import { isMountainPosition } from "./model";

/** The plaque follows both animated palms and body yaw, never the orbiting camera. */
export function MountainSummitBoard({ remoteId }: { remoteId?: string }) {
  const root = useRef<Group>(null);
  const palms = useMemo(() => ({ left: new Vector3(), right: new Vector3() }), []);
  useFrame(() => {
    const group = root.current;
    if (!group) return;
    group.visible = false;
    const state = useMountain.getState(),
      board = useSummitLeaderboard.getState(),
      p = useGame.getState().playerPos;
    if (remoteId) {
      const remote = remoteStates.get(remoteId);
      if (!remote || !sanitizeMountainGear(remote, remote.x, remote.z).summitBoard) return;
    } else if (
      !state.summitBoardEquipped ||
      state.flight ||
      !board.loaded ||
      board.ownSummits < 1 ||
      !useChannels.getState().playing ||
      !isMountainPosition(p[0], p[2])
    )
      return;
    const parent = group.parent,
      character = parent?.getObjectByName("CharacterVisual");
    if (
      !parent ||
      !character ||
      !readParachuteGrip(character, "Left", parent, palms.left) ||
      !readParachuteGrip(character, "Right", parent, palms.right)
    )
      return;
    group.position.copy(palms.left).add(palms.right).multiplyScalar(0.5);
    group.position.z += 0.09;
    group.position.y += 0.12;
    group.visible = true;
  });
  return (
    <group
      ref={root}
      name="MountainSummitBoard"
      visible={false}
      userData={{ ignoreCameraCollision: true }}
    >
      <mesh castShadow>
        <boxGeometry args={[0.82, 0.4, 0.045]} />
        <meshStandardMaterial color="#253c39" roughness={0.9} />
      </mesh>
      {[-0.405, 0.405].map((x) => (
        <mesh key={x} position={[x, 0, 0.026]}>
          <boxGeometry args={[0.025, 0.4, 0.02]} />
          <meshStandardMaterial color="#b59662" roughness={1} />
        </mesh>
      ))}
      {[-0.192, 0.192].map((y) => (
        <mesh key={y} position={[0, y, 0.026]}>
          <boxGeometry args={[0.82, 0.022, 0.02]} />
          <meshStandardMaterial color="#b59662" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, -0.3, -0.015]}>
        <boxGeometry args={[0.045, 0.3, 0.04]} />
        <meshStandardMaterial color="#795934" roughness={1} />
      </mesh>
      <Text
        position={[0, 0, 0.029]}
        fontSize={0.107}
        color="#f5ebcb"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.73}
        textAlign="center"
      >
        {"GUNUNG\nCUNG"}
      </Text>
    </group>
  );
}
