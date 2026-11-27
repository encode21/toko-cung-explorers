/** @jsxImportSource @/game/jsx */
import { useCallback, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Box3, Group, InstancedMesh, PerspectiveCamera, Vector3 } from "three";
import { ArchitectureBatch } from "@/game/world/ArchitectureBatch";
import { gangArchitecture, type HouseFit } from "@/game/gang/architecture";
import type { GangHouse } from "@/game/gang/model";
import { lotHouse } from "./WarungLots";
import { lotFit, warungDoorFront } from "./storefront";
import { WarungClosedDoors } from "./WarungEntranceDoor";

const GAP = 11;
const TARGET_Y = 2;

/** The kampung house at a given warung level; `fit` squeezes it onto a typical city lot. */
function Building({
  house,
  level,
  fit,
}: {
  house: GangHouse;
  level: number;
  fit?: HouseFit | undefined;
}) {
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
      {house.warung?.lot === null && <WarungClosedDoors front={warungDoorFront(fit)} />}
    </>
  );
}

const CITY_LOT = lotHouse({ id: 0, name: "", level: 1, levelName: "" });
const CITY_FIT = lotFit(10.5, 6);

type ComparisonProps = {
  level: number;
  next: number;
  /** The player's gang home when the warung lives there; otherwise the city-lot building is shown. */
  house: GangHouse | null;
};

function Comparison({
  level,
  next,
  house,
  wrapper,
}: ComparisonProps & {
  wrapper: RefObject<HTMLDivElement | null>;
}) {
  const { camera, size, invalidate } = useThree();
  const pair = useRef<Group>(null);
  const corners = useRef<Vector3[]>([]);
  const point = useMemo(() => new Vector3(), []);
  const fitCamera = useCallback(() => {
    if (
      !(camera instanceof PerspectiveCamera) ||
      !size.width ||
      !size.height ||
      !corners.current.length
    )
      return;

    camera.updateMatrixWorld();
    let edge = 0;
    for (const corner of corners.current) {
      point.copy(corner).project(camera);
      edge = Math.max(edge, Math.abs(point.x), Math.abs(point.y));
    }
    // The projection scales linearly with zoom, so fitting leaves the orbit position intact.
    const zoom = Math.min(1.3, (camera.zoom * 0.9) / edge);
    if (Math.abs(camera.zoom - zoom) > 0.0001) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
    const style = wrapper.current?.style;
    style?.setProperty(
      "--warung-preview-current",
      `${(point.set(-GAP / 2, TARGET_Y, 0).project(camera).x + 1) * 50}%`,
    );
    style?.setProperty(
      "--warung-preview-next",
      `${(point.set(GAP / 2, TARGET_Y, 0).project(camera).x + 1) * 50}%`,
    );
    invalidate();
  }, [camera, size.width, size.height, invalidate, point, wrapper]);

  useLayoutEffect(() => {
    corners.current =
      pair.current?.children.flatMap((model) => {
        model.traverse((object) => {
          if (object instanceof InstancedMesh) object.computeBoundingBox();
        });
        const { min, max } = new Box3().setFromObject(model);
        return [min.x, max.x].flatMap((x) =>
          [min.y, max.y].flatMap((y) => [min.z, max.z].map((z) => new Vector3(x, y, z))),
        );
      }) ?? [];
  }, [house, level, next]);

  useLayoutEffect(() => {
    camera.lookAt(0, TARGET_Y, 0);
    fitCamera();
  }, [camera, fitCamera, house, level, next]);

  const scale = house ? 0.7 : 0.9;
  return (
    <>
      <group ref={pair}>
        {[level, next].map((value, index) => (
          <group
            key={index}
            position-x={index === 0 ? -GAP / 2 : GAP / 2}
            scale={scale}
            rotation-y={-0.35}
          >
            <Building house={house ?? CITY_LOT} level={value} fit={house ? undefined : CITY_FIT} />
          </group>
        ))}
      </group>
      <OrbitControls
        target={[0, TARGET_Y, 0]}
        enablePan={false}
        enableZoom={false}
        minAzimuthAngle={-0.6}
        maxAzimuthAngle={0.6}
        minPolarAngle={0.6}
        maxPolarAngle={1.35}
        onChange={fitCamera}
      />
    </>
  );
}

/** "Sekarang | Sesudah" side by side in one small canvas; drag to turn. Mounted only on the upgrade tab. */
export default function UpgradeBuildingPreview(props: ComparisonProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={wrapper}
      className="warung-upgrade-preview"
      role="group"
      aria-label="Pratinjau bangunan sekarang dan sesudah upgrade"
      style={{ position: "relative" }}
    >
      <Canvas
        dpr={[1, 1.5]}
        frameloop="demand"
        camera={{ position: [0, 9, 24], fov: 40, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        style={{ height: "calc(100% - 26px)" }}
      >
        <color attach="background" args={["#dff1f3"]} />
        <hemisphereLight args={["#fff9e9", "#a8bdad", 2.4]} />
        <directionalLight position={[-6, 12, 10]} intensity={2.6} />
        <Comparison {...props} wrapper={wrapper} />
      </Canvas>
      <div className="warung-upgrade-preview-labels">
        <span>Sekarang</span>
        <span>Sesudah</span>
      </div>
    </div>
  );
}
