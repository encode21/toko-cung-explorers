/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { Text } from "@react-three/drei";
import * as T from "three";
import { MOUNTAIN_OUTFITS, MOUNTAIN_OUTFIT_STAND } from "./outfits";
import { createOutfitHat, createOutfitVest, disposeOutfit } from "./outfit-meshes";

/** Three visible loan outfits stand beside the coastal arrival camp. */
export function MountainOutfitStand() {
  const mannequins = useMemo(
    () =>
      MOUNTAIN_OUTFITS.map((p) => {
        const g = new T.Group();
        const box = (
          size: [number, number, number],
          pos: [number, number, number],
          color: string,
        ) => {
          const m = new T.Mesh(
            new T.BoxGeometry(...size),
            new T.MeshStandardMaterial({ color, roughness: 0.9 }),
          );
          m.position.fromArray(pos);
          m.castShadow = true;
          g.add(m);
        };
        box([0.55, 0.62, 0.31], [0, 1.12, 0], p.jacket);
        box([0.39, 0.4, 0.36], [0, 1.66, 0], "#e8e4d9");
        for (const s of [-1, 1]) {
          box([0.24, 0.59, 0.27], [s * 0.41, 1.12, 0], p.jacket);
          box([0.24, 0.19, 0.27], [s * 0.41, 0.73, 0], "#e8e4d9");
          box([0.25, 0.64, 0.28], [s * 0.145, 0.48, 0], p.pants);
          box([0.26, 0.17, 0.38], [s * 0.145, 0.08, 0.045], "#352f28");
        }
        const hat = createOutfitHat(p.id);
        hat.position.y = 1.87;
        g.add(hat);
        const vest = createOutfitVest(p.id);
        vest.position.y = 1.14;
        g.add(vest);
        return g;
      }),
    [],
  );
  useEffect(() => () => mannequins.forEach(disposeOutfit), [mannequins]);
  return (
    <group position={MOUNTAIN_OUTFIT_STAND} name="MountainOutfitStand">
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[8, 0.16, 3.4]} />
        <meshStandardMaterial color="#745a3c" roughness={1} />
      </mesh>
      {MOUNTAIN_OUTFITS.map((p, i) => (
        <group key={p.id} position={[(i - 1) * 2.3, 0.16, 0]}>
          <primitive object={mannequins[i]!} dispose={null} />
          <Text
            position={[0, 0.1, 1.26]}
            rotation-x={-0.6}
            fontSize={0.18}
            color="#fff2ce"
            anchorY="middle"
          >
            {p.name}
          </Text>
        </group>
      ))}
      <mesh position={[0, 2.65, -1.3]}>
        <boxGeometry args={[7.3, 0.56, 0.15]} />
        <meshStandardMaterial color="#3c4430" />
      </mesh>
      <Text position={[0, 2.65, -1.21]} fontSize={0.26} color="#fff2ce" anchorY="middle">
        OUTFIT PENDAKI · PINJAM GRATIS
      </Text>
      {[-3.5, 3.5].map((x) => (
        <mesh key={x} position={[x, 1.4, -1.3]}>
          <boxGeometry args={[0.16, 2.8, 0.16]} />
          <meshStandardMaterial color="#665039" />
        </mesh>
      ))}
    </group>
  );
}
