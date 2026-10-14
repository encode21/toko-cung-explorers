/** @jsxImportSource @/game/jsx */
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

interface ModelProps {
  url: string;
  /** Tinggi target dalam meter — model dinormalisasi otomatis. */
  height?: number;
  /** Skala manual, dipakai kalau height tidak diberikan. */
  scale?: number;
  position?: [number, number, number];
  rotationY?: number;
  /** Letakkan dasar model di y = position.y (default true). */
  groundAlign?: boolean;
}

/**
 * Pemuat GLB dengan normalisasi ukuran: bounding box dihitung sekali lalu model
 * diskalakan ke tinggi yang diminta dan didudukkan di lantai. Ini membuat model
 * dari pack berbeda (atau GLB Toko Cung asli) langsung pas tanpa tuning manual.
 */
export function Model({ url, height, scale, position = [0, 0, 0], rotationY = 0, groundAlign = true }: ModelProps) {
  const { scene } = useGLTF(url);

  const { object, factor, offsetY } = useMemo(() => {
    const clone = cloneSkeleton(scene);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const f = height && size.y > 0.0001 ? height / size.y : (scale ?? 1);
    return { object: clone, factor: f, offsetY: groundAlign ? -box.min.y * f : 0 };
  }, [scene, height, scale, groundAlign, url]);

  return (
    <group position={[position[0], position[1] + offsetY, position[2]]} rotation={[0, rotationY, 0]}>
      <group scale={factor}>
        <primitive object={object} />
      </group>
    </group>
  );
}
