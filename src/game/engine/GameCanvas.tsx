/** @jsxImportSource @/game/jsx */
import { OutdoorLocations } from "./OutdoorLocations";
import { useMountainLocation } from "./location";
import { MountainScene, CityHelipad } from "@/game/mountain/MountainScene";
import { SwimmingBeach } from "@/game/swimming/SwimmingBeach";
import { FishingSpot } from "@/game/fishing/FishingSpot";
import { PlazaObby } from "@/game/obby/PlazaObby";
import { WORLD_GRAVITY } from "@/game/player/movement";
import { ClubScene } from "@/game/club/ClubScene";
import { useClub } from "@/game/club/store";
import { AuthoredNpcs } from "@/game/editor/AuthoredNpcs";
import { EditorLayer } from "@/game/editor/EditorLayer";
import { EditorPanel } from "@/game/editor/EditorPanel";
import { useWorldEditor } from "@/game/editor/store";
import { DungeonScene, PrincipalBuilding } from "@/game/dungeon/DungeonScene";
import { ClubFacade } from "@/game/club/ClubFacade";
import { useDungeon } from "@/game/dungeon/store";
import { useChannels } from "@/net/channel-store";
import { QuestMarkers } from "@/game/core/QuestMarkers";
import { NationalDayDecorations } from "@/game/reactive-world/NationalDayDecorations";
import { DailyObjectiveMarker } from "@/game/daily/DailyObjectiveMarker";
import { QuestGuidance } from "@/game/core/QuestGuidance";
import { Canvas } from "@react-three/fiber";
import { PhotoCapture } from "@/game/photo/PhotoCapture";
import { Environment, Lightformer } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useEffect, Suspense, lazy } from "react";
import { OutdoorNeighborhood } from "@/game/world/OutdoorNeighborhood";
import { WorldZones } from "@/game/world/WorldZones";
import { TokoCung } from "@/game/world/TokoCung";
import { ActivityProps } from "@/game/world/props/ActivityProps";
import { SupplierTempPost } from "@/game/world/props/SupplierTempPost";
import { WarehouseReceiveDock } from "@/game/world/props/WarehouseReceiveDock";
import { Npcs } from "@/game/npc/Npc";
import { NakamaOps } from "@/game/simulation/NakamaOps";
import { Player } from "@/game/player/Player";
import { Waypoint } from "@/game/navigation/Waypoint";
import { PlayerTap } from "@/game/net/PlayerTap";
import { ActionProjection } from "@/game/interactions/ActionProjection";
import { RemotePlayers } from "@/game/net/RemotePlayers";
import { LOW_QUALITY, renderDpr, outdoorViewDistance } from "@/game/engine/quality";
import { AdaptiveQuality, selectBudgetTier, useRenderBudget } from "./AdaptiveQuality";

import { VehicleExhaust } from "@/game/traffic/VehicleExhaust";
import { SceneTimeDebug } from "@/game/time/SceneTimeDebug";
import { SceneEnvironment } from "@/game/time/SceneEnvironment";
import { SkyEnvironment } from "@/game/world/SkyEnvironment";
const ReactiveWorldDebug = import.meta.env.DEV
  ? lazy(() =>
      import("@/game/reactive-world/ReactiveWorldDebug").then((m) => ({
        default: m.ReactiveWorldDebug,
      })),
    )
  : null;
const DungeonDebug =
  import.meta.env.DEV && import.meta.env["VITE_DUNGEON_DEBUG"] === "true"
    ? lazy(() => import("@/game/dungeon/DungeonDebug").then((m) => ({ default: m.DungeonDebug })))
    : null;
function SceneReady() {
  useEffect(() => {
    useChannels.setState({ sceneReady: true });
    return () => {
      useChannels.setState({ sceneReady: false });
    };
  }, []);
  return null;
}
const SKY = "#b9d8ef";

export function GameCanvas() {
  const mountain = useMountainLocation();
  const editor = useWorldEditor();
  const club = useClub((s) => s.inside && !s.outdoor);
  const runtime = editor.mode === "PLAYER";
  const tier = useRenderBudget(selectBudgetTier);
  const low = runtime ? tier === "LOW" : LOW_QUALITY;
  const view = outdoorViewDistance(mountain, low);
  const dungeon = useDungeon((s) => !!s.data?.instance && s.data.instance.realm !== "WORLD");
  const revision = useDungeon((s) => s.sceneRevision);

  return (
    <>
      <Canvas
        style={{ background: SKY }}
        shadows={!low}
        dpr={runtime ? renderDpr(tier) : low ? 1 : [1, 1.5]}
        performance={{ min: 0.4 }}
        camera={{ position: [0, 4, 20], fov: 58, near: 0.1, far: view.far }}
        gl={{
          antialias: !LOW_QUALITY,
          // Default on phones avoids pinning the GPU clocks while the outdoor scene is heavy.
          powerPreference: LOW_QUALITY ? "default" : "high-performance",
          stencil: false,
          depth: true,
        }}
      >
        <color attach="background" args={[SKY]} />
        <fog attach="fog" args={[SKY, view.fogNear, view.fogFar]} />

        {!dungeon && !club && <SceneEnvironment />}
        {!low && (
          <Environment>
            <Lightformer
              intensity={1.6}
              position={[0, 12, 0]}
              scale={[24, 24, 1]}
              color="#ffffff"
            />
            <Lightformer
              intensity={0.9}
              color="#bcdcf5"
              position={[-14, 4, -6]}
              rotation-y={Math.PI / 2}
              scale={[30, 6, 1]}
            />
          </Environment>
        )}

        {!dungeon && !club && <SkyEnvironment />}
        <Suspense fallback={null}>
          <Physics
            key={`physics-${revision}`}
            debug={editor.canEdit && editor.mode !== "PLAYER" && !!editor.show["colliders"]}
            gravity={[0, WORLD_GRAVITY, 0]}
            timeStep={low ? 1 / 40 : 1 / 60}
          >
            {dungeon ? (
              <DungeonScene />
            ) : club ? (
              <ClubScene />
            ) : (
              <OutdoorLocations
                mountain={<MountainScene />}
                city={
                  <>
                    <ClubScene />
                    <OutdoorNeighborhood />
                    <CityHelipad />
                    <NationalDayDecorations />
                    <PlazaObby />
                    <FishingSpot />
                    <SwimmingBeach />
                    <PrincipalBuilding />
                    <ClubFacade />
                    <TokoCung />
                    <WorldZones />
                    <QuestMarkers />
                    <SupplierTempPost />
                    <WarehouseReceiveDock />
                    <Npcs />
                    <AuthoredNpcs />
                    <ActivityProps />
                    <NakamaOps />
                  </>
                }
              />
            )}
            <Player />
            <RemotePlayers />
          </Physics>
          {runtime && !club && !mountain && (
            <>
              <QuestGuidance />
              <DailyObjectiveMarker />
            </>
          )}
          {!dungeon && !club && (
            <>
              {!mountain && <Waypoint />}
              {!mountain && !LOW_QUALITY && <VehicleExhaust />}
            </>
          )}
        </Suspense>
        {/* Outside Suspense: Rapier/assets can hang; overlay must not wait forever. */}
        <SceneReady key={`ready-${revision}`} />
        {!dungeon && !mountain && <EditorLayer />}
        {runtime && <AdaptiveQuality />}
        {runtime && <PlayerTap />}
        {runtime && <ActionProjection />}
        {runtime && <PhotoCapture />}
      </Canvas>
      <EditorPanel dungeon={dungeon} />
      {DungeonDebug && (
        <Suspense fallback={null}>
          <DungeonDebug />
        </Suspense>
      )}
      {import.meta.env.DEV && <SceneTimeDebug />}
      {ReactiveWorldDebug && (
        <Suspense fallback={null}>
          <ReactiveWorldDebug />
        </Suspense>
      )}
    </>
  );
}
