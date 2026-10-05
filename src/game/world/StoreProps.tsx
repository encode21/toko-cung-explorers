/** @jsxImportSource @/game/jsx */
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/** Kategori visual produk di rak — warna kemasan khas tiap kategori. */
export const CATEGORY_COLORS = {
  instant: ["#e8b923", "#d8442f", "#f1d36b", "#c63a2b", "#f3e3b0"],
  drink: ["#3a8fd0", "#e6f2fb", "#d63b3b", "#58b368", "#f0b23a"],
  snack: ["#f08a24", "#e04b5a", "#f4cf3a", "#6a49a8", "#3aa0a0"],
  sembako: ["#f4efe2", "#d9c28f", "#e9d8a8", "#c0a370", "#ffffff"],
  household: ["#4aa3d8", "#7bc96f", "#f2f2f2", "#e65d9b", "#5466c2"],
  tobacco: ["#d63b3b", "#f2f2f2", "#2b2b2b", "#2f6fbf", "#e6c65a"],
  carton: ["#c08c4f", "#b47f45", "#cf9c5f"],
} as const;
export type Category = keyof typeof CATEGORY_COLORS;

export interface Item {
  p: [number, number, number];
  s: [number, number, number];
}

/** Banyak kotak produk dalam satu draw call (InstancedMesh). */
export function ProductBlocks({
  items,
  category,
  seed = 1,
}: {
  items: Item[];
  category: Category;
  seed?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    const palette = CATEGORY_COLORS[category];
    items.forEach((it, i) => {
      m.compose(new THREE.Vector3(...it.p), q, new THREE.Vector3(...it.s));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(palette[(Math.floor(i / 4) + seed) % palette.length] ?? "#cccccc"));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items, category, seed]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, items.length]}
      castShadow={false}
      receiveShadow
    >
      <boxGeometry />
      <meshStandardMaterial roughness={0.55} />
    </instancedMesh>
  );
}

/** Tekstur ubin lantai retail — dibuat sekali di canvas, diulang. */
export function useTileTexture(base: string, line: string, repeat: [number, number]) {
  const [repeatX, repeatY] = repeat;
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const v = (x + y) % 2 ? 0 : 2;
        g.fillStyle = base;
        g.fillRect(x * 128, y * 128, 128, 128);
        g.fillStyle = `rgba(0,0,0,${v / 255})`;
        g.fillRect(x * 128, y * 128, 128, 128);
      }
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.03})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    g.strokeStyle = line;
    g.lineWidth = 1;
    g.strokeRect(0, 0, 128, 128);
    g.strokeRect(128, 0, 128, 128);
    g.strokeRect(0, 128, 128, 128);
    g.strokeRect(128, 128, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.anisotropy = 4;
    return t;
  }, [base, line, repeatX, repeatY]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
