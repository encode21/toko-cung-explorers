import { SceneEnvironment } from "@/game/time/SceneEnvironment";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { StreetFurniture } from "@/game/world/props/StreetFurniture";
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
useChannels.setState({ lease: { channel: "CHANNEL-01", connectionId }, playing: true });
useGame.setState({ overlay: "none" });
const defs = [
  ["club_entrance", "CLUB_ENTRANCE", 10.4, 0, 3.8],
  ["club_exit", "CLUB_ENTRANCE", 0, -14, 9],
  ["club_booth", "DJ_BOOTH", 0, -14, -7],
  ["club_dance", "DANCE_ZONE", 0, -14, 0],
  ["club_screen", "MUSIC_SCREEN", 0, -11.35, -8.85],
  ["club_spawn", "CLUB_SPAWN", 0, -14, 6],
  ["club_lights", "LIGHT_CONTROLLER", 0, -9, 0],
];
useWorldEditor.setState({
  targets: defs.map(([id, type, x, y, z]) => ({
    id,
    name: id,
    type,
    position: { x, y, z },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    tags: id === "club_exit" ? ["club-exit"] : ["club"],
    radius: 3,
    active: true,
    scene: "toko-cung-world",
  })),
});
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
          <ContextPanel touch={window.innerWidth < 1000} />
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
