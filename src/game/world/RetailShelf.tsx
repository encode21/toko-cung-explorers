/** @jsxImportSource @/game/jsx */
import { useLayoutEffect, useMemo, useRef } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CATEGORY_COLORS, type Category } from "./StoreProps";
import { Fixture } from "./Fixture";

const pack = new RoundedBoxGeometry(1, 1, 1, 1, 0.09);
const bottle = new THREE.CylinderGeometry(0.36, 0.46, 1, 10);
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
          const h = drink ? 0.235 : category === "instant" ? 0.15 : 0.225;
          matrix.position.set(side * 0.245, y + h / 2 + 0.025, (c - (columns - 1) / 2) * 0.19);
          matrix.scale.set(0.25, h, 0.155);
          matrix.updateMatrix();
          body.current!.setMatrixAt(n, matrix.matrix);
          const palette = CATEGORY_COLORS[category];
          body.current!.setColorAt(
            n,
            color.set(palette[(Math.floor(c / 4) + row) % palette.length]!),
          );
          matrix.position.x = side * 0.376;
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

export function ShelfRow({ y, length }: { y: number; length: number }) {
  const labels = useRef<THREE.InstancedMesh>(null);
  const count = Math.floor(length / 0.65);
  useLayoutEffect(() => {
    let n = 0;
    const m = new THREE.Matrix4();
    for (const side of [-1, 1])
      for (let i = 0; i < count; i++) {
        m.makeTranslation(side * 0.468, -0.012, -length / 2 + 0.32 + i * 0.65);
        labels.current!.setMatrixAt(n++, m);
      }
    labels.current!.instanceMatrix.needsUpdate = true;
    labels.current!.computeBoundingSphere();
  }, [count, length]);
  return (
    <group position={[0, y, 0]}>
      <instancedMesh ref={labels} args={[priceGeometry, undefined, count * 2]}>
        <meshBasicMaterial color="#f9edc6" />
      </instancedMesh>
      <mesh receiveShadow>
        <boxGeometry args={[0.9, 0.035, length]} />
        <meshStandardMaterial color="#eeeae0" roughness={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.455, -0.015, 0]}>
            <boxGeometry args={[0.02, 0.065, length]} />
            <meshStandardMaterial color="#34474d" />
          </mesh>
        </group>
      ))}
    </group>
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
  return (
    <Fixture {...(assetUrl ? { assetUrl } : {})} height={height}>
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.07, height, length]} />
          <meshStandardMaterial color="#dcded4" />
        </mesh>
        <mesh position={[0, 0.09, 0]} receiveShadow>
          <boxGeometry args={[0.94, 0.18, length + 0.1]} />
          <meshStandardMaterial color="#5c6e6b" />
        </mesh>
        {[-length / 2, length / 2].map((z) => (
          <mesh key={z} position={[0, height / 2, z]} castShadow>
            <boxGeometry args={[0.96, height, 0.055]} />
            <meshStandardMaterial color="#bda686" roughness={0.7} />
          </mesh>
        ))}
        {levels.map((y) => (
          <ShelfRow key={y} y={y} length={length} />
        ))}
        <ProductDisplay length={length} levels={levels} category={category} />
        {label &&
          [-1, 1].map((side) => (
            <group
              key={side}
              position={[0, 1.05, side * (length / 2 + 0.03)]}
              rotation-y={side < 0 ? Math.PI : 0}
            >
              <mesh>
                <boxGeometry args={[0.73, 0.66, 0.015]} />
                <meshStandardMaterial color="#f2e8d0" />
              </mesh>
              <Text
                position={[0, 0.13, 0.011]}
                fontSize={0.1}
                maxWidth={0.64}
                textAlign="center"
                color="#405c59"
              >
                {label.replace("Rak ", "")}
              </Text>
              <Text position={[0, -0.2, 0.011]} fontSize={0.053} color="#9e6249">
                PILIHAN UNTUKMU
              </Text>
            </group>
          ))}
        {label && (
          <group position={[0, height - 0.07, 0]} userData={{ ignoreCameraCollision: true }}>
            <mesh>
              <boxGeometry args={[0.12, 0.19, length]} />
              <meshStandardMaterial color={highlight ? "#d79436" : "#405c59"} />
            </mesh>
            {[-1, 1].map((side) => (
              <Text
                key={side}
                position={[side * 0.066, 0, 0]}
                rotation-y={(side * Math.PI) / 2}
                fontSize={0.115}
                color="#fff8e8"
                maxWidth={length - 0.2}
              >
                {label.toUpperCase()}
              </Text>
            ))}
          </group>
        )}
      </group>
    </Fixture>
  );
}
