import { Suspense } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ShopStaff } from "@/game/staff/ShopStaff";
import { useAccount } from "@/auth/useSession";
import type { Scene } from "three";

const qa = window as Window & { staffScene?: Scene; staffAccount?: typeof useAccount };

function Probe() {
  qa.staffScene = useThree().scene;
  qa.staffAccount = useAccount;
  return null;
}

export function StaffFarewellPreview() {
  return (
    <Canvas
      camera={{ position: [6, 5, 15], fov: 45 }}
      onCreated={({ camera }) => camera.lookAt(0, 1, 5)}
    >
      <color attach="background" args={["#b4e0ed"]} />
      <ambientLight intensity={1.8} />
      <directionalLight position={[5, 10, 4]} intensity={2} />
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#b7bf8e" />
      </mesh>
      <Suspense fallback={null}>
        <ShopStaff where="porch" />
      </Suspense>
      <Probe />
    </Canvas>
  );
}
