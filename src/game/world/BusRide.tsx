/** @jsxImportSource @/game/jsx */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { BusPassengers } from "./BusPassengers";
import { getAudioContext } from "@/game/audio/audio-context";
import { audioAudible, audioBus } from "@/game/audio/audio-manager";
import { sharedNoise } from "@/game/audio/sound-palette";
import { createBusSound } from "@/game/audio/bus-sound";
import { BusModel } from "./BusModel";
import { busPose, tickBusRide, useBusRide } from "./bus-ride";
import { useGame } from "@/state/game-store";
import { tickBusService, type BusServiceScene } from "./bus-service";
import { busCollision } from "./bus-collision";

/** The same visible bus serves pedestrians and passengers; only passengers get the follow camera. */
export function BusRide({ service = null }: { service?: BusServiceScene }) {
  const active = useBusRide((s) => s.active);
  const compact = useBusRide((s) => s.compact);
  const audio = useRef<ReturnType<typeof createBusSound> | null>(null);
  useEffect(
    () => () => {
      audio.current?.stop();
      audio.current = null;
    },
    [],
  );
  const bus = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const projected = useRef(new Vector3());
  const lag = useRef({ x: 0, y: 5, z: 0, aimX: 0, aimZ: 0, ready: false });
  // Positive frame priority disables R3F's automatic rendering, even when no ride is active.
  useFrame((_, dt) => {
    tickBusRide(dt, busCollision.blocked ?? (() => true));
    const player = useGame.getState().playerPos;
    tickBusService(service, dt, busCollision.blocked ?? (() => true), player, (point) => {
      const p = projected.current.set(point.x, 2, point.z).project(camera);
      return p.z > -1 && p.z < 1 && Math.abs(p.x) < 1.2 && Math.abs(p.y) < 1.2;
    });
    const state = useBusRide.getState();
    if (bus.current) bus.current.visible = state.active && state.ready;
    if (!state.active || !state.ready) {
      audio.current?.stop();
      audio.current = null;
      lag.current.ready = false;
      return;
    }
    const ctx = getAudioContext();
    if (ctx && audioAudible()) {
      audio.current ??= createBusSound(ctx, audioBus("vehicle"), sharedNoise(ctx));
      const level = state.riding
        ? 1
        : Math.max(0, 1 - Math.hypot(player[0] - busPose.x, player[2] - busPose.z) / 55) ** 2;
      audio.current.update(busPose.speed, busPose.door, level);
    } else {
      audio.current?.stop();
      audio.current = null;
    }
    const { x, z, yaw } = busPose;
    if (bus.current) {
      bus.current.visible = useBusRide.getState().ready;
      bus.current.position.set(x, 0, z);
      bus.current.rotation.y = yaw;
    }
    if (!state.riding) {
      lag.current.ready = false;
      return;
    }
    const behind = 14;
    const aim = 3;
    const side = busPose.door > 0 ? 5 : 2.5;
    const desiredX = x - Math.sin(yaw) * behind + Math.cos(yaw) * side;
    const desiredZ = z - Math.cos(yaw) * behind - Math.sin(yaw) * side;
    const cam = lag.current;
    if (!cam.ready || Math.hypot(cam.x - desiredX, cam.z - desiredZ) > 100) {
      cam.x = desiredX;
      cam.y = 5.1;
      cam.z = desiredZ;
      cam.aimX = x + Math.sin(yaw) * aim;
      cam.aimZ = z + Math.cos(yaw) * aim;
      cam.ready = true;
    }
    const follow = 1 - Math.exp(-2.4 * Math.min(dt, 0.05));
    cam.x += (desiredX - cam.x) * follow;
    cam.z += (desiredZ - cam.z) * follow;
    cam.y += (4.8 - cam.y) * follow;
    cam.aimX += (x + Math.sin(yaw) * aim - cam.aimX) * follow;
    cam.aimZ += (z + Math.cos(yaw) * aim - cam.aimZ) * follow;
    camera.position.set(cam.x, cam.y, cam.z);
    camera.lookAt(cam.aimX, 1.7, cam.aimZ);
  });
  if (!active) return null;
  return (
    <>
      <BusPassengers />
      <group
        ref={bus}
        name="BusRide"
        visible={useBusRide.getState().ready}
        position={[busPose.x, 0, busPose.z]}
        rotation-y={busPose.yaw}
      >
        <BusModel compact={compact} riding />
      </group>
    </>
  );
}
