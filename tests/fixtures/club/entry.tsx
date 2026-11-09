import { ContextActionButton } from "@/ui/hud/ContextActionButton";
import { SceneEnvironment } from "@/game/time/SceneEnvironment";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { StreetFurniture } from "@/game/world/props/StreetFurniture";
import { ActionProjection } from "@/game/interactions/ActionProjection";
import { remoteStates } from "@/net/useWorldChannel";
import { PlayerTap } from "@/game/net/PlayerTap";
import { useTouchDrive } from "@/game/player/touch-drive";
import { ActionDock } from "@/ui/hud/ActionDock";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { WorldMap } from "@/ui/minimap/WorldMap";
import { MobileControls } from "@/ui/hud/MobileControls";
import { ContextPanel } from "@/ui/hud/ContextPanel";
import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { ClubFacade } from "@/game/club/ClubFacade";
import { ClubScene } from "@/game/club/ClubScene";
import { ClubHud } from "@/ui/hud/ClubHud";
import { Player } from "@/game/player/Player";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { useClub, clubCommand } from "@/game/club/store";
import { useChannels, connectionId } from "@/net/channel-store";
import { useWorldEditor } from "@/game/editor/store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useNet } from "@/net/net-store";
import "@/styles.css";
useNet.setState({ connected: true });
remoteStates.set("bob", { id: "bob", name: "Budi", x: -2, y: -13.17, z: 0, ry: 0 });
useChannels.setState({ lease: { channel: "CHANNEL-01", connectionId }, playing: true });
useGame.setState({ overlay: "none" });
void useWorldEditor.getState().load();
window.editor = useWorldEditor;
window.look = useTouchDrive;
window.club = useClub;
window.game = useGame;
window.hud = useHud;
window.cmd = clubCommand;
window.playerId = connectionId;
function Probe() {
  window.three = useThree();
  return null;
}
const nightOnly = new URLSearchParams(location.search).has("night");
const mapOnly = new URLSearchParams(location.search).has("map");
createRoot(document.getElementById("root")).render(
  mapOnly ? (
    <main className="world-viewport game-ui">
      <WorldMap />
    </main>
  ) : (
    <main
      className="world-viewport game-ui"
      data-game-ui-root
      style={{ height: "100vh", background: "#141120" }}
    >
      <Canvas camera={{ position: [0, -8, 14] }}>
        <Probe />
        <ActionProjection />
        <PlayerTap />
        <Suspense fallback={null}>
          <Physics gravity={[0, -20, 0]}>
            {nightOnly ? (
              <>
                <SceneEnvironment />
                <StreetFurniture />
                <group position={[35, 0, 8]}>
                  <VehicleModel kind="car" />
                </group>
                <group position={[46, 0, 9]}>
                  <VehicleModel kind="motorcycle" />
                </group>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[200, 200]} />
                  <meshStandardMaterial color="#69786a" />
                </mesh>
              </>
            ) : (
              <ambientLight intensity={1.2} />
            )}
            <RigidBody type="fixed" colliders={false}>
              <CuboidCollider args={[100, 0.2, 100]} position={[0, -0.2, 0]} />
            </RigidBody>
            <ClubFacade />
            <ClubScene />
            <Player />
            <group position={[-2, -14, 0]}>
              <BaseAvatarV2 playerAvatar dancePlayerId="bob" />
            </group>
            <group position={[2, -14, 0]}>
              <BaseAvatarV2 playerAvatar dancePlayerId="ani" />
            </group>
          </Physics>
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-0">
        <div
          className="mmo-hud pointer-events-none absolute inset-0"
          data-touch={window.innerWidth < 1000}
        >
          <ClubHud />
          <ActionDock />
          <ContextPanel />
          <ContextActionButton />
        </div>
        <MobileControls />
      </div>
    </main>
  ),
);
if (!mapOnly)
  setTimeout(
    () => (nightOnly ? useGame.setState({ pendingTeleport: [41, 0.83, 7] }) : clubCommand("enter")),
    500,
  );
