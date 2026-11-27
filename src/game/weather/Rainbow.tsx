/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
} from "three";
import { sceneLighting } from "@/game/time/lighting";
import { currentWeather } from "./store";
import { weatherSheltered } from "./exposure";

/** One translucent arc, fixed opposite the sun and shared across outdoor regions. */
export function Rainbow() {
  const mesh = useRef<Mesh>(null);
  const geometry = useMemo(() => {
    const g = new RingGeometry(38, 43, 64, 14, 0, Math.PI);
    const colors = [
      "#9b7ae0",
      "#7085eb",
      "#6ab8ea",
      "#80d99b",
      "#ffdf7b",
      "#ffb073",
      "#ef858e",
    ].map((c) => new Color(c));
    const position = g.getAttribute("position");
    const values = new Float32Array(position.count * 3);
    const color = new Color();
    for (let i = 0; i < position.count; i++) {
      const t = Math.max(
        0,
        Math.min(6, ((Math.hypot(position.getX(i), position.getY(i)) - 38) / 5) * 6),
      );
      const band = Math.min(5, Math.floor(t));
      color
        .copy(colors[band]!)
        .lerp(colors[band + 1]!, t - band)
        .toArray(values, i * 3);
    }
    g.setAttribute("color", new Float32BufferAttribute(values, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ camera }) => {
    const arc = mesh.current;
    if (!arc) return;
    const strength = weatherSheltered() ? 0 : currentWeather().rainbow;
    arc.visible = strength > 0;
    if (!arc.visible) return;
    const yaw = Math.atan2(sceneLighting.direction.x, sceneLighting.direction.z);
    arc.rotation.y = yaw;
    arc.position.set(
      camera.position.x - Math.sin(yaw) * 105,
      camera.position.y - 4,
      camera.position.z - Math.cos(yaw) * 105,
    );
    (arc.material as MeshBasicMaterial).opacity = strength * 0.58;
  });
  return (
    <mesh
      name="WeatherRainbow"
      ref={mesh}
      geometry={geometry}
      visible={false}
      userData={{ ignoreCameraCollision: true }}
    >
      <meshBasicMaterial
        vertexColors
        side={DoubleSide}
        transparent
        opacity={0}
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  );
}
