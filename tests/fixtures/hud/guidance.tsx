/** @jsxImportSource @/game/jsx */
import { PlayerChatBubble } from "@/game/net/PlayerChatBubble";
import { playerId } from "@/net/useWorldChannel";
import { Canvas } from "@react-three/fiber";
import { Physics, useRapier } from "@react-three/rapier";
import { TokoCung } from "@/game/world/TokoCung";
import { DailyObjectiveMarker } from "@/game/daily/DailyObjectiveMarker";
import { Suspense, useEffect } from "react";
import { QuestGuidance } from "@/game/core/QuestGuidance";
import { ActionProjection } from "@/game/interactions/ActionProjection";
import { RoadNetwork } from "@/game/world/RoadNetwork";
import { useGame } from "@/state/game-store";
function StoreProbe() {
  const { world, rapier } = useRapier();
  useEffect(() => {
    window.storeRay = (origin, direction) => {
      const hit = world.castRay(new rapier.Ray(origin, direction), 100, true);
      return hit?.timeOfImpact ?? null;
    };
    return () => {
      delete window.storeRay;
    };
  }, [world, rapier]);
  return null;
}
export function GuidancePreview() {
  const store = new URLSearchParams(location.search).has("store");
  const pos = useGame((s) => s.playerPos);
  const bright = new URLSearchParams(location.search).has("bright");
  const road = new URLSearchParams(location.search).has("road");
  return (
    <Canvas
      gl={{ preserveDrawingBuffer: true }}
      camera={{ position: store ? [0, 2.7, 2] : road ? [5, 7, 29] : [5, 7, 9], fov: 45 }}
      onCreated={({ scene, camera, gl }) => {
        camera.lookAt(0, store ? 1.8 : 0, store ? -8 : road ? 20 : 0);
        window.guidanceScene = scene;
        window.guidanceCamera = camera;
        window.guidanceRenderer = gl;
      }}
    >
      <color attach="background" args={["#253543"]} />
      <ambientLight intensity={2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshBasicMaterial color={bright ? "#ede9db" : "#42564e"} />
      </mesh>
      {road && (
        <Suspense fallback={null}>
          <RoadNetwork />
        </Suspense>
      )}
      <group name="Player" position={pos}>
        <group position={[0, -0.83, 0]}>
          <mesh name="guidance-test-body" position={[0, 0.7, 0]}>
            <boxGeometry args={[0.5, 1.3, 0.35]} />
            <meshBasicMaterial color="#549cca" />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <sphereGeometry args={[0.22, 12, 8]} />
            <meshBasicMaterial color="#efd1a1" />
          </mesh>
        </group>
        <PlayerChatBubble senderId={playerId} height={1.67} />
      </group>
      <group name="bubble-remote-fixture" position={[3, 0, 0]}>
        <PlayerChatBubble senderId="bubble-remote" />
      </group>
      {store && (
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]}>
            <TokoCung />
            <StoreProbe />
          </Physics>
        </Suspense>
      )}
      <Suspense fallback={null}>
        <DailyObjectiveMarker />
      </Suspense>
      <QuestGuidance />
      <ActionProjection />
    </Canvas>
  );
}
