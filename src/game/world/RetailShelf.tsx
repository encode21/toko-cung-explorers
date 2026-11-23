/** @jsxImportSource @/game/jsx */
import { useLayoutEffect, useMemo, useRef } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { CATEGORY_COLORS, type Category } from "./StoreProps";
import { Fixture } from "./Fixture";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { merchandiseShape } from "@/game/warung/merchandise";

const priceGeometry = new THREE.BoxGeometry(0.006, 0.037, 0.16);

/** Category displays are scenery; the interactive catalog continues to supply actual SKU/price data. */
const CATEGORY_SHAPES: Record<Category, string[]> = {
  instant: ["Mi instan", "Mi instan", "Kopi sachet", "Susu bubuk"],
  drink: ["Air mineral", "Air mineral", "Teh gelas", "Air mineral"],
  snack: ["Kerupuk", "Biskuit", "Makanan ringan", "Wafer"],
  sembako: ["Beras", "Gula", "Minyak goreng", "Telur"],
  household: ["Sabun", "Deterjen", "Sabun", "Pembersih"],
  tobacco: ["Kemasan", "Kemasan", "Kemasan", "Kemasan"],
  carton: ["Dus", "Dus", "Dus", "Dus"],
};

/** Recognisable grocery silhouettes, seams and packaging faces, batched by shared material/shape. */
export function ProductDisplay({
  length,
  levels,
  category,
}: {
  length: number;
  levels: number[];
  category: Category;
}) {
  const group = useRef<THREE.Group>(null);
  const products = useMemo(() => {
    const parts: AssetPart[] = [];
    const columns = Math.max(1, Math.floor((length - 0.2) / 0.26));
    const palette = CATEGORY_COLORS[category];
    for (const side of [-1, 1]) {
      levels.forEach((y, row) => {
        for (let column = 0; column < columns; column++) {
          const name = CATEGORY_SHAPES[category][row % CATEGORY_SHAPES[category].length]!;
          // No price or inventory is depicted by these decorative category facings.
          const appearance = {
            id: name,
            name,
            color: palette[(Math.floor(column / 3) + row) % palette.length]!,
            ...(category === "carton" ? { uom: "dus" as const } : {}),
          };
          const scale = 0.52;
          const offset = (column - (columns - 1) / 2) * 0.26;
          for (const shape of merchandiseShape(appearance, { x: 0, y: 0, z: 0, face: 1 }, 0)) {
            parts.push({
              ...shape,
              p: [
                side * (0.245 + shape.p[2] * scale),
                y + 0.025 + shape.p[1] * scale,
                offset - side * shape.p[0] * scale,
              ],
              s: [shape.s[0] * scale, shape.s[1] * scale, shape.s[2] * scale],
              ry: (shape.ry ?? 0) + (side * Math.PI) / 2,
            });
          }
        }
      });
    }
    return parts;
  }, [length, levels, category]);
  useLayoutEffect(() => {
    // Hundreds of small facings should not enter the sun's shadow pass.
    group.current?.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        object.castShadow = false;
        object.receiveShadow = false;
      }
    });
  }, [products]);
  return (
    <group ref={group} userData={{ ignoreCameraCollision: true }}>
      <StyledBatch items={products} />
    </group>
  );
}

/** Combined price strips for every level of a shelf (1 draw call instead of 1 per row). */
export function ShelfPriceStrips({ levels, length }: { levels: number[]; length: number }) {
  const labels = useRef<THREE.InstancedMesh>(null);
  const perSide = Math.floor(length / 0.65);
  const total = perSide * 2 * levels.length;
  useLayoutEffect(() => {
    if (!labels.current) return;
    let n = 0;
    const m = new THREE.Matrix4();
    for (const y of levels) {
      for (const side of [-1, 1]) {
        for (let i = 0; i < perSide; i++) {
          m.makeTranslation(side * 0.468, y - 0.012, -length / 2 + 0.32 + i * 0.65);
          labels.current.setMatrixAt(n++, m);
        }
      }
    }
    labels.current.instanceMatrix.needsUpdate = true;
    labels.current.computeBoundingSphere();
  }, [levels, perSide, length]);
  return (
    <instancedMesh ref={labels} args={[priceGeometry, undefined, total]} dispose={null}>
      <meshBasicMaterial color="#f9edc6" />
    </instancedMesh>
  );
}

export function RetailShelf({
  length = 3.6,
  height = 1.7,
  category,
  label,
  highlight = false,
  assetUrl,
}: {
  length?: number;
  height?: number;
  category: Category;
  label?: string;
  highlight?: boolean;
  assetUrl?: string;
}) {
  const levels = useMemo(() => [0.18, 0.53, 0.88, 1.23].filter((y) => y < height - 0.15), [height]);
  const structure = useMemo(() => {
    const out: OutdoorPart[] = [
      { p: [0, height / 2, 0], s: [0.07, height, length], color: "#dcded4" },
      { p: [0, 0.09, 0], s: [0.94, 0.18, length + 0.1], color: "#5c6e6b" },
      { p: [0, height / 2, -length / 2], s: [0.96, height, 0.055], color: "#bda686" },
      { p: [0, height / 2, length / 2], s: [0.96, height, 0.055], color: "#bda686" },
    ];
    for (const y of levels) {
      out.push({ p: [0, y, 0], s: [0.9, 0.035, length], color: "#eeeae0" });
      out.push({ p: [-0.455, y - 0.015, 0], s: [0.02, 0.065, length], color: "#34474d" });
      out.push({ p: [0.455, y - 0.015, 0], s: [0.02, 0.065, length], color: "#34474d" });
    }
    if (label) {
      out.push({ p: [0, 1.05, -length / 2 - 0.03], s: [0.73, 0.66, 0.015], color: "#f2e8d0" });
      out.push({ p: [0, 1.05, length / 2 + 0.03], s: [0.73, 0.66, 0.015], color: "#f2e8d0" });
      out.push({
        p: [0, height - 0.07, 0],
        s: [0.12, 0.19, length],
        color: highlight ? "#d79436" : "#405c59",
      });
    }
    return out;
  }, [height, length, levels, label, highlight]);

  return (
    <Fixture {...(assetUrl ? { assetUrl } : {})} height={height}>
      <group>
        <OutdoorBatch items={structure} shape="bevel" shadows={false} />
        <ShelfPriceStrips levels={levels} length={length} />
        <ProductDisplay length={length} levels={levels} category={category} />
        {label &&
          [-1, 1].map((side) => (
            <Text
              key={side}
              position={[side * 0.066, height - 0.07, 0]}
              rotation-y={(side * Math.PI) / 2}
              fontSize={0.115}
              color="#fff8e8"
              maxWidth={length - 0.2}
            >
              {label.toUpperCase()}
            </Text>
          ))}
      </group>
    </Fixture>
  );
}
