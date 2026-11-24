/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { busPose, tickBusRide, useBusRide } from "./bus-ride";

type V3 = [number, number, number];
function Box({ p, s, color }: { p: V3; s: V3; color: string }) {
  return (
    <mesh position={p} castShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/** Same city bus as the one parked at Halte Toko Cung, long axis along local +Z (the nose). */
function BusBody() {
  return (
    <group>
      <Box p={[0, 1.55, 0]} s={[2.5, 2.5, 11]} color="#e9eef2" />
      <Box p={[0, 0.75, 0]} s={[2.52, 0.5, 11.02]} color="#2c5d8a" />
      <Box p={[0, 2.05, 0]} s={[2.54, 0.9, 10]} color="#bfe3f2" />
      <Box p={[0, 2.9, 5.51]} s={[1.8, 0.3, 0.04]} color="#1d1f22" />
      {[-3.6, 3.6].flatMap((z) =>
        [-1.2, 1.2].map((x) => (
          <mesh key={`${x}${z}`} position={[x, 0.5, z]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.5, 0.5, 0.3, 16]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        )),
      )}
    </group>
  );
}

/** Drives the paid bus and parks the camera behind it, the way a taxi ride follows the cab. */
export function BusRide() {
  const riding = useBusRide((s) => s.riding);
  const bus = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const lag = useRef({ x: 0, y: 5, z: 0, ready: false });
  useFrame((_, dt) => {
    if (!useBusRide.getState().riding) {
      lag.current.ready = false;
      return;
    }
    tickBusRide(dt);
    const { x, z, yaw } = busPose;
    if (bus.current) {
      bus.current.position.set(x, 0, z);
      bus.current.rotation.y = yaw;
    }
    const behind = 12;
    const aim = 8;
    const desiredX = x - Math.sin(yaw) * behind;
    const desiredZ = z - Math.cos(yaw) * behind;
    const cam = lag.current;
    if (!cam.ready) {
      cam.x = desiredX;
      cam.y = 5.1;
      cam.z = desiredZ;
      cam.ready = true;
    }
    const follow = 1 - Math.exp(-2.4 * Math.min(dt, 0.05));
    cam.x += (desiredX - cam.x) * follow;
    cam.z += (desiredZ - cam.z) * follow;
    cam.y += (5.1 + Math.sin(performance.now() / 280) * 0.08 - cam.y) * follow;
    camera.position.set(cam.x, cam.y, cam.z);
    camera.lookAt(x + Math.sin(yaw) * aim, 1.7, z + Math.cos(yaw) * aim);
  }, 1);
  if (!riding) return null;
  return (
    <group ref={bus} name="BusRide" position={[busPose.x, 0, busPose.z]} rotation-y={busPose.yaw}>
      <BusBody />
    </group>
  );
}
