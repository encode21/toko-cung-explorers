/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { ShapeGeometry, ShapePath } from "three";
import type { Point } from "./outdoor-layout";

/** Triangulate the union outline once, including block holes. No overlapping asphalt quads. */
export function RoadSurface({
  contours,
  height,
  color,
  name,
}: {
  contours: Point[][];
  height: number;
  color: string;
  name: string;
}) {
  const geometry = useMemo(() => {
    const path = new ShapePath();
    for (const loop of contours) {
      if (!loop.length) continue;
      path.moveTo(loop[0]!.x, -loop[0]!.z);
      for (const p of loop.slice(1)) path.lineTo(p.x, -p.z);
      path.lineTo(loop[0]!.x, -loop[0]!.z);
    }
    return new ShapeGeometry(path.toShapes()).rotateX(-Math.PI / 2);
  }, [contours]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh name={name} geometry={geometry} position-y={height} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}
