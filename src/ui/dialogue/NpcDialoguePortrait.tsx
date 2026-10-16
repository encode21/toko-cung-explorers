/** @jsxImportSource @/game/jsx */
import { Canvas } from "@react-three/fiber";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import type { AvatarConfig } from "@/identity/avatar";

/** Uses the same active model and outfit as the world, framed as a transparent portrait. */
export default function NpcDialoguePortrait({
  avatar,
  character,
  playerAvatar = false,
}: {
  avatar: AvatarConfig;
  character?: string | null | undefined;
  playerAvatar?: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.3, 3], fov: 28 }}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0, 1.25, 0);
        gl.setClearColor(0x000000, 0);
      }}
    >
      <hemisphereLight args={["#fff7ed", "#b6a0a0", 2.2]} />
      <directionalLight position={[2, 4, 4]} intensity={2} />
      <directionalLight position={[-3, 2, 1]} intensity={0.6} />
      <BaseAvatarV2
        avatar={avatar}
        character={character}
        playerAvatar={playerAvatar}
        animation="Talk"
      />
    </Canvas>
  );
}
