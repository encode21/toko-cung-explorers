/** @jsxImportSource @/game/jsx */
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { LodAvatar } from "@/game/npc/LodAvatar";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { trafficAudio } from "@/game/traffic/traffic-runtime";
import { SpeechBubble } from "@/game/net/PlayerChatBubble";
import { useGame } from "@/state/game-store";
import { incidentScene, type Incident } from "./model";
import { incidentNow, useIncidents } from "./store";

function Actor({ event, role }: { event: Incident; role: "a" | "b" | "guard" }) {
  const root = useRef<Group>(null);
  const animation = useRef<AvatarAnimation>("Idle");
  const speed = useRef(0);
  const [line, setLine] = useState<string | null>(null);
  useFrame(() => {
    if (!root.current) return;
    const scene = incidentScene(event, incidentNow());
    const pose = scene[role];
    root.current.position.set(pose.x, pose.y, pose.z);
    root.current.rotation.y = pose.yaw;
    animation.current = pose.animation;
    speed.current = pose.animation === "Walk" ? 1 : 0;
    const spoken = scene.speaker === { a: 0, b: 1, guard: 2 }[role] ? scene.line : null;
    if (spoken !== line) setLine(spoken);
  });
  return (
    <group ref={root}>
      <LodAvatar
        lodId={"incident-" + event.id + "-" + role}
        avatarId={
          role === "guard" ? "npc-satpam" : role === "a" ? "npc-pedestrian-1" : "npc-pedestrian-2"
        }
        animation={animation}
        speed={speed}
      />
      {line && <SpeechBubble senderId={"incident-" + event.id + role} text={line} height={2.3} />}
    </group>
  );
}
function Scene({ event }: { event: Incident }) {
  const root = useRef<Group>(null),
    motor = useRef<Group>(null),
    truck = useRef<Group>(null);
  const lastAge = useRef((incidentNow() - event.startsAt) / 1000);
  const preview = incidentScene(event, event.startsAt);
  useFrame(() => {
    const now = incidentNow();
    const scene = incidentScene(event, now);
    const p = useGame.getState().playerPos;
    if (root.current)
      root.current.visible =
        !useGame.getState().inside && Math.hypot(p[0] - event.at[0], p[2] - event.at[2]) < 80;
    for (const [ref, pose] of [
      [motor, scene.motor],
      [truck, scene.truck],
    ] as const) {
      if (!ref.current) continue;
      ref.current.position.set(pose.x, pose.y, pose.z);
      ref.current.rotation.set(0, pose.yaw, pose.lean);
    }
    const age = (now - event.startsAt) / 1000;
    if (lastAge.current < 10 && age >= 10 && age < 11 && scene.traffic)
      trafficAudio.emit(
        "impact",
        { x: event.at[0], z: event.at[2] },
        { kind: scene.showTruck ? "truck" : "motorcycle" },
      );
    lastAge.current = age;
  });
  return (
    <group ref={root} position={event.at} name={"incident-" + event.id}>
      <Actor event={event} role="a" />
      <Actor event={event} role="b" />
      <Actor event={event} role="guard" />
      {preview.showMotor && (
        <group ref={motor}>
          <VehicleModel kind="motorcycle" color="#d95940" />
        </group>
      )}
      {preview.showTruck && (
        <group ref={truck}>
          <VehicleModel kind="truck" color="#d3ac43" emptyBed />
        </group>
      )}
    </group>
  );
}
export function IncidentScene() {
  const event = useIncidents((s) => s.active);
  return event ? <Scene key={event.id} event={event} /> : null;
}
