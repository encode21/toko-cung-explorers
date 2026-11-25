/** @jsxImportSource @/game/jsx */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { BusPassengers } from "./BusPassengers";
import { getAudioContext } from "@/game/audio/audio-context";
import { audioAudible, audioBus } from "@/game/audio/audio-manager";
import { sharedNoise } from "@/game/audio/sound-palette";
import { createBusSound } from "@/game/audio/bus-sound";
import { BusModel } from "./BusModel";
import { busPose, tickBusRide, useBusRide } from "./bus-ride";
import { busCollision } from "./bus-collision";

/** Drives the paid bus and parks the camera behind it, the way a taxi ride follows the cab. */
export function BusRide() {
  const riding = useBusRide((s) => s.riding);
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
  const lag = useRef({ x: 0, y: 5, z: 0, aimX: 0, aimZ: 0, ready: false });
  // Positive frame priority disables R3F's automatic rendering, even when no ride is active.
  useFrame((_, dt) => {
    tickBusRide(dt, busCollision.blocked ?? (() => true));
    if (!useBusRide.getState().riding) {
      audio.current?.stop();
      audio.current = null;
      lag.current.ready = false;
      return;
    }
    const ctx = getAudioContext();
    if (ctx && audioAudible()) {
      audio.current ??= createBusSound(ctx, audioBus("vehicle"), sharedNoise(ctx));
      audio.current.update(busPose.speed, busPose.door);
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
  if (!riding) return null;
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
