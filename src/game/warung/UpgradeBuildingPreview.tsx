/** @jsxImportSource @/game/jsx */
import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { StyledBatch } from "@/game/assets/StyledBatch";
import { ArchitectureBatch } from "@/game/world/ArchitectureBatch";
import { gangArchitecture } from "@/game/gang/architecture";
import type { GangHouse } from "@/game/gang/model";
import { warungLotBuilding } from "./WarungLots";
import type { LotCard } from "./model";

const GAP = 11;

/** Gang home at a given warung level, using the same builder as the street. */
function GangBuilding({ house, level }: { house: GangHouse; level: number }) {
  const parts = useMemo(
    () =>
      gangArchitecture({
        ...house,
        warung: house.warung && { ...house.warung, level, renovation: null },
      }),
    [house, level],
  );
  return (
    <>
      <ArchitectureBatch items={parts.masonry} surface="masonry" />
      <ArchitectureBatch items={parts.trim} surface="trim" />
      <ArchitectureBatch items={parts.glazing} surface="glazing" />
    </>
  );
}

/** City-lot warung at a given level (kavling or no gang home). */
function LotBuilding({ level }: { level: number }) {
  const parts = useMemo(
    () =>
      warungLotBuilding(
        {
          id: 0,
          name: "",
          level,
          levelName: "",
          ownerName: null,
          totalSales: 0,
          hiring: false,
          online: true,
          lot: 0,
        } as LotCard,
        10,
        9,
      ),
    [level],
  );
  return <StyledBatch items={parts} />;
}

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
                <GangBuilding house={house} level={lv as number} />
              ) : (
                <LotBuilding level={lv as number} />
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
