/** @jsxImportSource @/game/jsx */
import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { ArchitectureBatch } from "@/game/world/ArchitectureBatch";
import { gangArchitecture, type HouseFit } from "@/game/gang/architecture";
import type { GangHouse } from "@/game/gang/model";
import { lotFit, lotHouse } from "./WarungLots";

const GAP = 11;

/** The kampung house at a given warung level; `fit` squeezes it onto a typical city lot. */
function Building({ house, level, fit }: { house: GangHouse; level: number; fit?: HouseFit }) {
  const parts = useMemo(
    () =>
      gangArchitecture(
        { ...house, warung: house.warung && { ...house.warung, level, renovation: null } },
        fit,
      ),
    [house, level, fit],
  );
  return (
    <>
      <ArchitectureBatch items={parts.masonry} surface="masonry" />
      <ArchitectureBatch items={parts.trim} surface="trim" />
      <ArchitectureBatch items={parts.glazing} surface="glazing" />
    </>
  );
}

const CITY_LOT = lotHouse({ id: 0, name: "", level: 1, levelName: "" });
const CITY_FIT = lotFit(10.5, 6);

/** "Sekarang | Sesudah" side by side in one small canvas; drag to turn. Mounted only on the upgrade tab. */
export default function UpgradeBuildingPreview({
  level,
  next,
  house,
}: {
  level: number;
  next: number;
  /** The player's gang home when the warung lives there; otherwise the city-lot building is shown. */
  house: GangHouse | null;
}) {
  const scale = house ? 0.7 : 0.9;
  return (
    <div
      className="warung-upgrade-preview"
      aria-label="Pratinjau bangunan sekarang dan sesudah upgrade"
    >
      <Canvas
        dpr={[1, 1.5]}
        frameloop="demand"
        camera={{ position: [0, 9, 24], fov: 40, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={["#dff1f3"]} />
          <hemisphereLight args={["#fff9e9", "#a8bdad", 2.4]} />
          <directionalLight position={[-6, 12, 10]} intensity={2.6} />
          {[
            [level, -GAP / 2, "Sekarang"],
            [next, GAP / 2, "Sesudah"],
          ].map(([lv, x, label]) => (
            <group
              key={label as string}
              position={[x as number, 0, 0]}
              scale={scale}
              rotation-y={-0.35}
            >
              {house ? (
                <Building house={house} level={lv as number} />
              ) : (
                <Building house={CITY_LOT} level={lv as number} fit={CITY_FIT} />
              )}
              <Text position={[0, -0.9, 8]} fontSize={0.9} color="#5b3d33" anchorX="center">
                {label as string}
              </Text>
            </group>
          ))}
          <OrbitControls
            target={[0, 2, 0]}
            enablePan={false}
            enableZoom={false}
            minPolarAngle={0.6}
            maxPolarAngle={1.35}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
