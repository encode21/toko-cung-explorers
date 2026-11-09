/** @jsxImportSource @/game/jsx */
import { Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { Physics, useRapier } from "@react-three/rapier";
import { TokoCung } from "@/game/world/TokoCung";
import { RoadNetwork } from "@/game/world/RoadNetwork";
import { StreetFurniture } from "@/game/world/props/StreetFurniture";
import { ActivityProps } from "@/game/world/props/ActivityProps";
import { SupplierTempPost } from "@/game/world/props/SupplierTempPost";
import { WarehouseReceiveDock } from "@/game/world/props/WarehouseReceiveDock";
import { OutdoorConcert } from "@/game/club/OutdoorConcert";
import { QuestMarkers } from "@/game/core/QuestMarkers";
import { NationalDayDecorations } from "@/game/reactive-world/NationalDayDecorations";
import { receiveWorldSnapshot, advanceWorld, useReactiveWorld } from "@/game/reactive-world/store";
import { useGameCore } from "@/game/core/store";
import { useGame } from "@/state/game-store";
import { useWorldEditor } from "@/game/editor/store";

// Baseline registry targets selected by world:seed-pahlawan-2026; no live account or API.
const targets = [
  ["npc_daily_cung", 2.8, 0, 5.5],
  ["legacy_0204566ef852fded8df43c22", 6.2, 0, -15],
  ["pahlawan_pos_jaga", 17, 0, 11.7],
  ["pahlawan_bendera_1", -14.5, 0, 14.8],
  ["pahlawan_bendera_2", 10.4, 0, -9.75],
  ["pahlawan_bendera_3", 41, 0, 10],
].map(([id, x, y, z]) => ({
  id,
  name: id,
  position: { x, y, z },
  active: true,
  radius: 2.5,
  type: "CLUE",
  scene: "toko-cung-world",
}));
useWorldEditor.setState({ saved: JSON.stringify(targets) });
useGame.setState({ playerPos: [41, 0.83, 10], overlay: "none" });
const w = window as any;
w.core = useGameCore;
w.qa = {
  targets,
  event(status = "ACTIVE", theme = "pahlawan", offset = 0) {
    const now = Date.now();
    const revision = (useReactiveWorld.getState().snapshot?.revision ?? 0) + 1;
    const accepted = receiveWorldSnapshot(
      {
        revision,
        generatedAt: now,
        events: [
          {
            id: "qa-national-day",
            type: "NATIONAL_DAY",
            status,
            intensity: 1,
            startedAt: now - 1000 + offset,
            expiresAt: now + 60000 + offset,
            revision,
            payload: { theme },
          },
        ],
      },
      now,
    );
    advanceWorld(now, 3000);
    return accepted;
  },
  expireLease() {
    advanceWorld(Date.now() + 90001, 3000);
  },
  marker(secret = false, theme = "pahlawan", index = 0) {
    const target = targets[index]!;
    useGameCore.setState({
      snapshot: {
        active: { id: "qa-run", quest_id: "qa-pahlawan", status: "ACTIVE", progress: [0] },
        quests: [
          {
            id: "qa-pahlawan",
            theme,
            category: "WORLD",
            objectives: [
              {
                type: secret ? "FIND" : "TALK",
                targetId: target.id,
                target: target.id,
                required: 1,
                position: Object.values(target.position),
                radius: 2.5,
                ...(secret
                  ? {
                      secret: {
                        interactionType: "TRIVIA",
                        question: "Tahun Pertempuran Surabaya?",
                      },
                    }
                  : {}),
              },
            ],
          },
        ],
      } as any,
    });
  },
};
w.qa.event();
w.qa.marker();

function Probe() {
  const { world, rapier } = useRapier();
  useEffect(() => {
    w.qa.colliderCount = () => world.colliders.len();
    w.qa.blocked = (x: number, z: number) => {
      let blocked = false;
      world.intersectionsWithShape(
        { x, y: 0.92, z },
        { x: 0, y: 0, z: 0, w: 1 },
        new rapier.Capsule(0.45, 0.38),
        (collider) => {
          if (!collider.isSensor()) blocked = true;
          return true;
        },
      );
      return blocked;
    };
  }, [world, rapier]);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <Canvas
    dpr={1}
    camera={{ position: [16, 9, 27], fov: 50 }}
    gl={{ preserveDrawingBuffer: true }}
    onCreated={({ scene, camera, gl }) => {
      camera.lookAt(0, 2.5, 4);
      w.qa.scene = scene;
      w.qa.camera = camera;
      w.qa.renderer = gl;
      w.qa.view = (position: number[], target: number[]) => {
        camera.position.set(...position);
        camera.lookAt(...target);
        camera.updateProjectionMatrix();
      };
    }}
  >
    <color attach="background" args={["#b9d8ef"]} />
    <ambientLight intensity={1.8} />
    <directionalLight position={[10, 25, 18]} intensity={2} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#9da98b" />
    </mesh>
    <Suspense fallback={null}>
      <Physics gravity={[0, -9.81, 0]}>
        <TokoCung />
        <RoadNetwork />
        <StreetFurniture />
        <ActivityProps />
        <SupplierTempPost />
        <WarehouseReceiveDock />
        <OutdoorConcert />
        <NationalDayDecorations />
        <QuestMarkers />
        <Probe />
      </Physics>
    </Suspense>
  </Canvas>,
);
