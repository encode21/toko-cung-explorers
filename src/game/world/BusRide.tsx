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
import { busCollision, BUS_TRAFFIC_ID } from "./bus-collision";
import type { BusObstacle } from "./bus-motion";
import { trafficVehicles } from "@/game/traffic/traffic-runtime";
import { crossingStopGap } from "@/game/traffic/crossing-stop";
import { mobilityNow } from "@/game/mobility/store";
import { addTouchLook, consumeTouchLook, resetTouchLook } from "@/game/player/touch-drive";
import { useCameraZoom } from "@/game/player/camera-zoom";
import { gameUiBlocked } from "@/state/game-ui-store";
import { followNetworkBus, publishBus } from "./bus-sync";

/** The same visible bus serves pedestrians and passengers; only passengers get the follow camera. */
export function BusRide({ service = null }: { service?: BusServiceScene }) {
  const active = useBusRide((s) => s.active);
  const compact = useBusRide((s) => s.compact);
  const riding = useBusRide((s) => s.riding);
  const orbit = useRef({ yaw: 0, pitch: 0.2 });
  useEffect(() => {
    orbit.current = { yaw: 0, pitch: 0.2 };
    resetTouchLook();
    if (!riding) return;
    let pointer: { id: number; x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      if (
        e.pointerType !== "mouse" ||
        gameUiBlocked() ||
        (e.target as HTMLElement)?.closest("button, input, [data-ui-panel]")
      )
        return;
      pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (!pointer || pointer.id !== e.pointerId) return;
      if (!gameUiBlocked()) addTouchLook(e.clientX - pointer.x, e.clientY - pointer.y);
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    const reset = () => {
      pointer = null;
      resetTouchLook();
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", reset);
    window.addEventListener("pointercancel", reset);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", reset);
      window.removeEventListener("pointercancel", reset);
      window.removeEventListener("blur", reset);
      reset();
    };
  }, [riding]);
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
    const player = useGame.getState().playerPos;
    if (!followNetworkBus(service)) {
      const vehicle =
        service === "city" && useBusRide.getState().ready
          ? trafficVehicles.get(BUS_TRAFFIC_ID)
          : undefined;
      const stopGap = vehicle ? crossingStopGap(vehicle, mobilityNow()) : Infinity;
      const blocked: BusObstacle = (point) =>
        (Number.isFinite(stopGap) &&
          Math.hypot(point.x - busPose.x, point.z - busPose.z) >= stopGap) ||
        (busCollision.blocked?.(point) ?? true);
      tickBusRide(dt, blocked);
      tickBusService(service, dt, blocked, player, (point) => {
        const p = projected.current.set(point.x, 2, point.z).project(camera);
        return p.z > -1 && p.z < 1 && Math.abs(p.x) < 1.2 && Math.abs(p.y) < 1.2;
      });
      publishBus();
    }
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
    const look = consumeTouchLook();
    if (!gameUiBlocked()) {
      orbit.current.yaw -= look.x * 0.0055;
      orbit.current.pitch = Math.max(0.03, Math.min(0.9, orbit.current.pitch + look.y * 0.0042));
    }
    const heading = yaw + orbit.current.yaw;
    const radius = 14 * Math.max(0.7, Math.min(1.6, useCameraZoom.getState().distance));
    const behind = radius * Math.cos(orbit.current.pitch);
    const height = 1.7 + radius * Math.sin(orbit.current.pitch);
    const aim = 3;
    const side = busPose.door > 0 ? 5 : 2.5;
    const desiredX = x - Math.sin(heading) * behind + Math.cos(heading) * side;
    const desiredZ = z - Math.cos(heading) * behind - Math.sin(heading) * side;
    const cam = lag.current;
    if (!cam.ready || Math.hypot(cam.x - desiredX, cam.z - desiredZ) > 100) {
      cam.x = desiredX;
      cam.y = height;
      cam.z = desiredZ;
      cam.aimX = x + Math.sin(yaw) * aim;
      cam.aimZ = z + Math.cos(yaw) * aim;
      cam.ready = true;
    }
    const follow = 1 - Math.exp(-2.4 * Math.min(dt, 0.05));
    cam.x += (desiredX - cam.x) * follow;
    cam.z += (desiredZ - cam.z) * follow;
    cam.y += (height - cam.y) * follow;
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
