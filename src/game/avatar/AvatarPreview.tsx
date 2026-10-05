/** @jsxImportSource @/game/jsx */
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { BaseAvatarV2 } from "./BaseAvatarV2";
import type { AvatarConfig } from "@/identity/avatar";

/** Uses the caller's single appearance draft; never owns or saves profile state. */
export default function AvatarPreview({
  avatar,
  character,
}: {
  avatar: AvatarConfig;
  character?: string | null | undefined;
}) {
  return (
    <div style={{ height: 260, touchAction: "none" }} aria-label="Live 3D avatar preview">
      <Canvas dpr={[1, 1.25]} camera={{ position: [1.4, 1.3, 3.6], fov: 34 }}>
        <hemisphereLight args={["#eef6ff", "#baa58d", 2]} />
        <directionalLight position={[3, 4, 4]} intensity={2} />
        <directionalLight position={[-3, 2, -2]} intensity={0.6} />
        <BaseAvatarV2 avatar={avatar} character={character} />
        <OrbitControls
          target={[0, 0.9, 0]}
          enablePan={false}
          minDistance={2.5}
          maxDistance={5}
          maxPolarAngle={Math.PI * 0.55}
        />
      </Canvas>
    </div>
  );
}
