/** @jsxImportSource @/game/jsx */
import { useLayoutEffect, useMemo, useRef } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { CATEGORY_COLORS, type Category } from "./StoreProps";
import { Fixture } from "./Fixture";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";

const pack = new THREE.BoxGeometry(1, 1, 1);
const bottle = new THREE.CylinderGeometry(0.36, 0.46, 1, 6);
const priceGeometry = new THREE.BoxGeometry(0.006, 0.037, 0.16);
const matrix = new THREE.Object3D();

/** Four facings per SKU, repeated identically on both sides, with packaging bands. */
export function ProductDisplay({
  length,
  levels,
  category,
}: {
  length: number;
  levels: number[];
  category: Category;
}) {
  const body = useRef<THREE.InstancedMesh>(null);
  const labels = useRef<THREE.InstancedMesh>(null);
  const caps = useRef<THREE.InstancedMesh>(null);
  const columns = Math.floor((length - 0.15) / 0.19);
  const count = columns * levels.length * 2;
  const drink = category === "drink" || category === "household";
  useLayoutEffect(() => {
    const color = new THREE.Color();
    let n = 0;
    for (const side of [-1, 1])
      levels.forEach((y, row) => {
        for (let c = 0; c < columns; c++) {
          const variation = 0.88 + ((Math.floor(c / 3) + row) % 3) * 0.09;
          const h = (drink ? 0.235 : category === "instant" ? 0.15 : 0.225) * variation;
          matrix.position.set(side * 0.245, y + h / 2 + 0.025, (c - (columns - 1) / 2) * 0.19);
          matrix.scale.set(
            category === "snack" ? 0.2 : 0.25,
            h,
            category === "instant" ? 0.17 : 0.155,
          );
          matrix.updateMatrix();
          body.current!.setMatrixAt(n, matrix.matrix);
          const palette = CATEGORY_COLORS[category];
          body.current!.setColorAt(
            n,
            color.set(palette[(Math.floor(c / 4) + row) % palette.length]!),
          );
          matrix.position.x = side * (category === "snack" ? 0.351 : 0.376);
          matrix.scale.set(0.008, h * 0.32, 0.12);
          matrix.updateMatrix();
          labels.current!.setMatrixAt(n, matrix.matrix);
          if (caps.current) {
            matrix.position.x = side * 0.245;
            matrix.position.y = y + h + 0.035;
            matrix.scale.set(0.085, 0.035, 0.075);
            matrix.updateMatrix();
            caps.current.setMatrixAt(n, matrix.matrix);
          }
          n++;
        }
      });
    [body, labels, caps].forEach((ref) => {
      if (!ref.current) return;
      ref.current.instanceMatrix.needsUpdate = true;
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
      ref.current.computeBoundingSphere();
    });
  }, [columns, levels, category, drink]);
  return (
    <group userData={{ ignoreCameraCollision: true }}>
      <instancedMesh ref={body} args={[drink ? bottle : pack, undefined, count]}>
        <meshStandardMaterial roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={labels} args={[pack, undefined, count]}>
        <meshStandardMaterial color="#fff4d8" roughness={0.8} />
      </instancedMesh>
      {drink && (
        <instancedMesh ref={caps} args={[bottle, undefined, count]}>
          <meshStandardMaterial color="#f4f0e8" />
        </instancedMesh>
      )}
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
