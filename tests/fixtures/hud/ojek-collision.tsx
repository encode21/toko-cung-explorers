/** @jsxImportSource @/game/jsx */
import { Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import { PlayerVehicles } from "@/game/vehicles/PlayerVehicles";
import { Npcs } from "@/game/npc/Npc";
import { OjekPassenger } from "@/game/ojek/OjekPassenger";
import { useVehicleInput, renderedVehicles } from "@/game/vehicles/runtime";
import { useMobility } from "@/game/mobility/store";
import { useOjek } from "@/game/ojek/store";
import { useGame } from "@/state/game-store";
import { npcKnocks } from "@/game/traffic/traffic-runtime";
import { connectionId } from "@/net/channel-store";

function Probe() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  Object.assign(window, {
    crashProbe: {
      passenger: () => scene.getObjectByName("OjekPassenger")?.children[0]?.rotation.toArray(),
      pedestrian: () => scene.getObjectByName("npc-pedestrian-1")?.children[0]?.rotation.toArray(),
      pedestrianHit: () => npcKnocks.get("npc-pedestrian-1")?.(0, 5),
      ready: () => npcKnocks.has("ojek-passenger-199") && npcKnocks.has("npc-pedestrian-1"),
      drive: () => useVehicleInput.setState({ throttle: 1, steer: 0, brake: false }),
      stop: () => useVehicleInput.setState({ throttle: 0, brake: true }),
      seed: () => {
        const pose = { x: 40, y: 0, z: 4, yaw: 0, speed: 6 };
        useGame.setState({ overlay: "none", inside: false, playerPos: [40, 0.83, 4] });
        useOjek.setState({
          data: {
            ...useOjek.getState().data!,
            ojek: {
              ...useOjek.getState().data!.ojek,
              order: {
                ...(window as any).qaOffer(),
                id: 199,
                pickup: { id: "qa", name: "Tepi jalan", x: 40, z: 12 },
                acceptedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 240000).toISOString(),
              },
              offer: null,
            },
          },
          onBid: false,
          picked: null,
        });
        useMobility.setState({
          vehicles: [
            {
              id: "collision-bike",
              model: "scooter",
              color: "#2f7d59",
              pose,
              revision: 1,
              personal: true,
              mine: true,
              occupants: [{ connectionId, seat: 0, status: "active" }],
            },
          ],
        });
        camera.position.set(49, 6, 18);
        camera.lookAt(40, 1, 10);
      },
    },
  });
  useFrame(() => {
    const p = renderedVehicles.get("collision-bike");
    if (p) useGame.setState({ playerPos: [p.x, 0.83, p.z] });
  });
  return null;
}
export function OjekCollisionPreview() {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Canvas camera={{ position: [14, 6, 18], fov: 48 }} dpr={1}>
        <ambientLight intensity={2} />
        <directionalLight position={[10, 20, 4]} intensity={2} />
        <Suspense fallback={null}>
          <Physics gravity={[0, -24, 0]}>
            <RigidBody type="fixed" colliders={false}>
              <CuboidCollider args={[100, 0.1, 100]} position={[0, -0.1, 0]} />
              <mesh rotation-x={-Math.PI / 2}>
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial color="#8c9981" />
              </mesh>
            </RigidBody>
            <Npcs />
            <OjekPassenger />
            <PlayerVehicles />
            <Probe />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}
