import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { SosmedApp } from "@/ui/hud/SosmedApp";
import { useProfile } from "@/identity/profile-store";
import { avatarFromSeed } from "@/identity/avatar";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useSosmed } from "@/game/sosmed/store";
import { useClip } from "@/game/sosmed/clip";
import { ClipCapture } from "@/game/sosmed/ClipCapture";
import { ClipRecorder, RekamButton } from "@/ui/hud/Rekam";
import { IncidentScene } from "@/game/incidents/IncidentScene";
import {
  syncIncidentClock,
  tickIncidents,
  useIncidents,
  incidentNow,
} from "@/game/incidents/store";
import { incidentScene, type Incident, type IncidentType } from "@/game/incidents/model";
import { CrossingSignals } from "@/game/world/CrossingSignals";
import { worldRequest } from "@/services/world/client";
import { incidentTrafficZones, solidTrafficBlocked } from "@/game/traffic/traffic-runtime";
import "@/styles.css";
const user = new URLSearchParams(location.search).get("user") || "1";
const type = new URLSearchParams(location.search).get("scene") as IncidentType | null;
useProfile.setState({
  profile: {
    id: "00000000-0000-4000-8000-00000000000" + user,
    displayName: user === "1" ? "Sari" : "Budi",
    username: "player" + user,
    bio: "",
    role: "pengunjung",
    avatar: avatarFromSeed(user),
    equippedCharacter: null,
    joinedAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
});
const schedule = type ? await worldRequest<{ incidents: Incident[] }>("incidents") : null;
const event = schedule?.incidents.find((e) => e.type === type) ?? {
  id: "unused",
  type: "red-light-crash" as IncidentType,
  startsAt: Date.now(),
  endsAt: Date.now() + 120000,
  at: [104, 0, 20] as [number, number, number],
  location: "Pasar",
};
useGame.setState({
  overlay: "none",
  inside: false,
  playerPos: [event.at[0], 0.83, event.at[2] - 7],
});
if (type) {
  syncIncidentClock(event.startsAt, 0);
  useIncidents.setState({ events: [event], active: event, visible: event });
}
Object.assign(window, {
  sosmed: useSosmed,
  clip: useClip,
  profile: useProfile,
  setSceneTime: (seconds: number) => {
    syncIncidentClock(event.startsAt + seconds * 1000, 0);
    tickIncidents();
  },
  sceneState: () => incidentScene(event, incidentNow()),
  incident: event,
  testReservation: () => {
    const pose = (x: number) => ({ x, z: 20, dx: 1, dz: 0, speed: 2 });
    incidentTrafficZones.set("qa", { ...pose(104), speed: 0, halfLength: 10, halfWidth: 7 });
    const entering = solidTrafficBlocked(pose(90), pose(95));
    const leaving = solidTrafficBlocked(pose(104), pose(120));
    incidentTrafficZones.clear();
    return [entering, leaving, solidTrafficBlocked(pose(90), pose(95))];
  },
});
function Camera() {
  useThree((s) => s.camera).lookAt(event.at[0], 0.8, event.at[2] - 2);
  return null;
}
function Fixture() {
  const sheet = useHud((s) => s.sheet);
  const phone = !type || sheet === "sosmed";
  return (
    <main
      style={{
        height: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#dce7cc",
        fontFamily: "sans-serif",
        padding: 8,
      }}
    >
      {type && (
        <div style={{ position: "absolute", inset: 0 }}>
          <Canvas
            camera={{ position: [event.at[0] + 10, 9, event.at[2] + 14], fov: 50 }}
            gl={{ preserveDrawingBuffer: true }}
          >
            <Camera />
            <ambientLight intensity={1.8} />
            <directionalLight position={[event.at[0] + 6, 15, event.at[2] + 5]} intensity={2} />
            <Suspense fallback={null}>
              <mesh rotation-x={-Math.PI / 2} position={[event.at[0], -0.01, event.at[2]]}>
                <planeGeometry args={[90, 90]} />
                <meshStandardMaterial color="#92ac72" />
              </mesh>
              <mesh rotation-x={-Math.PI / 2} position={[event.at[0], 0, 20]}>
                <planeGeometry args={[80, 12.8]} />
                <meshStandardMaterial color="#616b72" />
              </mesh>
              <Physics>
                <CrossingSignals />
                <IncidentScene />
              </Physics>
            </Suspense>
            <ClipCapture />
          </Canvas>
        </div>
      )}
      {phone ? (
        <div
          style={{
            position: "relative",
            width: "min(400px, calc(100vw - 16px))",
            height: "min(780px, calc(100dvh - 16px))",
            display: "flex",
          }}
        >
          <SosmedApp />
        </div>
      ) : (
        <>
          <RekamButton />
          <ClipRecorder />
        </>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
