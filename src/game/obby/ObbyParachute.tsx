/** @jsxImportSource @/game/jsx */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DynamicDrawUsage, Group, Object3D, Vector3, type InstancedMesh } from "three";
import {
  CANOPY_CELLS,
  canopyPoint,
  createCanopyCell,
  readParachuteGrip,
  setParachuteSegment,
} from "./parachute-visual";

/** Local visual only; Player owns deployment and the existing descent physics. */
export const ObbyParachute = forwardRef<Group>(function ObbyParachute(_, ref) {
  const root = useRef<Group>(null);
  const cords = useRef<InstancedMesh>(null),
    webbing = useRef<InstancedMesh>(null);
  const leftHandle = useRef<Group>(null),
    rightHandle = useRef<Group>(null);
  useImperativeHandle(ref, () => root.current!, []);
  const cells = useMemo(
    () => Array.from({ length: CANOPY_CELLS }, (_, i) => createCanopyCell(i)),
    [],
  );
  const rig = useMemo(
    () => ({
      grips: [new Vector3(), new Vector3()],
      shoulders: [new Vector3(), new Vector3()],
      waist: [new Vector3(), new Vector3()],
      anchors: [-1, 1].map((sign) =>
        Array.from(
          { length: 8 },
          (_, i) =>
            new Vector3(
              ...canopyPoint(
                (sign * (2 + 2 * Math.floor(i / 2))) / 9,
                Math.PI * (i % 2 ? 1.75 : 1.25),
              ),
            ),
        ),
      ),
      junction: new Vector3(),
      direction: new Vector3(),
      scratch: new Object3D(),
    }),
    [],
  );
  useEffect(() => () => cells.forEach((cell) => cell.dispose()), [cells]);

  useFrame(() => {
    const group = root.current;
    if (!group?.visible || !cords.current || !webbing.current) return;
    const character = group.parent?.getObjectByName("CharacterVisual");
    if (!character) return;
    // Read the animated joints. The hand, riser and handle share one live anchor.
    const ready =
      readParachuteGrip(character, "Left", group, rig.grips[0]!) &&
      readParachuteGrip(character, "Right", group, rig.grips[1]!);
    cords.current.visible = webbing.current.visible = ready;
    if (leftHandle.current) leftHandle.current.visible = ready;
    if (rightHandle.current) rightHandle.current.visible = ready;
    if (!ready) return;
    for (let side = 0; side < 2; side++) {
      const name = side === 0 ? "Left" : "Right";
      const grip = rig.grips[side]!;
      const sign = grip.x < 0 ? -1 : 1;
      const shoulder = rig.shoulders[side]!;
      const joint =
        character.getObjectByName(`${name}Arm`) ?? character.getObjectByName(`${name}UpperArm`);
      if (!joint) return;
      joint.getWorldPosition(shoulder);
      group.worldToLocal(shoulder);
      shoulder.x *= 0.78;
      shoulder.z += 0.2;
      const waist = rig.waist[side]!.set(shoulder.x * 0.7, shoulder.y - 0.37, shoulder.z + 0.035);
      rig.junction.copy(grip).y += 0.22;
      const anchors = rig.anchors[sign < 0 ? 0 : 1]!;
      for (let i = 0; i < anchors.length; i++)
        setParachuteSegment(
          cords.current,
          side * 8 + i,
          anchors[i]!,
          rig.junction,
          0.008,
          0.008,
          rig.scratch,
          rig.direction,
        );
      setParachuteSegment(
        webbing.current,
        side * 3,
        rig.junction,
        grip,
        0.045,
        0.018,
        rig.scratch,
        rig.direction,
      );
      setParachuteSegment(
        webbing.current,
        side * 3 + 2,
        shoulder,
        waist,
        0.05,
        0.02,
        rig.scratch,
        rig.direction,
      );
      setParachuteSegment(
        webbing.current,
        side * 3 + 1,
        grip,
        shoulder,
        0.045,
        0.018,
        rig.scratch,
        rig.direction,
      );
      const handle = side === 0 ? leftHandle.current : rightHandle.current;
      handle?.position.copy(grip);
    }
    setParachuteSegment(
      webbing.current,
      6,
      rig.waist[0]!,
      rig.waist[1]!,
      0.06,
      0.025,
      rig.scratch,
      rig.direction,
    );
    cords.current.instanceMatrix.setUsage(DynamicDrawUsage);
    webbing.current.instanceMatrix.setUsage(DynamicDrawUsage);
    cords.current.instanceMatrix.needsUpdate = webbing.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group
      ref={root}
      name="ObbyParachute"
      visible={false}
      userData={{ ignoreCameraCollision: true }}
    >
      {cells.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial
            color={i === 4 ? "#39bedc" : i % 2 ? "#414955" : "#303842"}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      ))}
      <instancedMesh ref={cords} args={[undefined, undefined, 16]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 5]} />
        <meshStandardMaterial color="#b4b5ac" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={webbing} args={[undefined, undefined, 7]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#242b32" roughness={1} />
      </instancedMesh>
      {[leftHandle, rightHandle].map((handle, i) => (
        <group ref={handle} key={i}>
          <mesh position={[0, 0.055, 0]}>
            <torusGeometry args={[0.055, 0.012, 5, 12]} />
            <meshStandardMaterial color="#ffa415" roughness={0.85} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.11, 0.026, 0.035]} />
            <meshStandardMaterial color="#242b32" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
});
