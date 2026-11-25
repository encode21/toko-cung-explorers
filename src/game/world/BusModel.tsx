/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { Shape, ShapeGeometry, type Group, type Mesh } from "three";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";
import { busPose } from "./bus-ride";
import { busLivery } from "./bus-livery";

function RoundedBox({
  args,
  radius,
  children,
  ...props
}: Omit<ThreeElements["mesh"], "args"> & { args: [number, number, number]; radius: number }) {
  const [width, height, depth] = args;
  const geometry = useMemo(
    () => new RoundedBoxGeometry(width, height, depth, 2, radius),
    [width, height, depth, radius],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh {...props} geometry={geometry}>
      {children}
    </mesh>
  );
}

const BLUE = "#0879dc";
const TRIM = "#101d29";
const AXLES = [-3.45, 3.45];
const rimHoles: OutdoorPart[] = Array.from({ length: 8 }, (_, i) => ({
  p: [Math.cos((i * Math.PI) / 4) * 0.195, Math.sin((i * Math.PI) / 4) * 0.195, 0.157],
  s: [0.064, 0.006, 0.064],
  rx: Math.PI / 2,
  color: "#25313d",
}));
const details: OutdoorPart[] = [
  { p: [0, 0.43, 0], s: [2.1, 0.16, 10.5], color: TRIM },
  { p: [0, 1.25, 0], s: [2.25, 0.12, 10.6], color: TRIM },
  { p: [0, 0.35, 5.43], s: [2.23, 0.12, 0.1], color: "#075297" },
  { p: [0, 0.35, -5.43], s: [2.23, 0.12, 0.1], color: "#075297" },
  // Roof battery/HVAC louvers and the windshield wipers.
  ...[-1, -0.7, -0.4, -0.1, 0.2, 0.5, 0.8, 1.1].map((z) => ({
    p: [0, 3.52, z] as [number, number, number],
    s: [1.22, 0.02, 0.06] as [number, number, number],
    color: "#6f818d",
  })),
  ...[-1, 1].flatMap((side): OutdoorPart[] => [
    { p: [side * 0.55, 1.4, 5.54], s: [0.72, 0.035, 0.035], color: TRIM, rz: side * 0.35 },
    { p: [side * 1.39, 2.84, 4.98], s: [0.42, 0.055, 0.08], color: TRIM },
    { p: [side * 1.58, 2.63, 5.0], s: [0.07, 0.46, 0.08], color: TRIM },
    { p: [side * 1.59, 2.48, 5.02], s: [0.18, 0.42, 0.24], color: TRIM },
    { p: [side * 1.59, 2.48, 4.89], s: [0.13, 0.32, 0.025], color: "#829fae" },
  ]),
];

function sidePanel(lengthScale: number) {
  const archWidth = 0.65 / lengthScale;
  const s = new Shape();
  s.moveTo(-5.38, 0.32);
  for (const axle of AXLES) {
    s.lineTo(axle - archWidth, 0.32);
    s.lineTo(axle - archWidth, 0.57);
    s.absellipse(axle, 0.57, archWidth, 0.65, Math.PI, 0, true, 0);
    s.lineTo(axle + archWidth, 0.32);
  }
  s.lineTo(5.38, 0.32);
  s.quadraticCurveTo(5.5, 0.32, 5.5, 0.5);
  s.lineTo(5.5, 3.02);
  s.quadraticCurveTo(5.5, 3.25, 5.25, 3.25);
  s.lineTo(-5.25, 3.25);
  s.quadraticCurveTo(-5.5, 3.25, -5.5, 3.02);
  s.lineTo(-5.5, 0.5);
  s.quadraticCurveTo(-5.5, 0.32, -5.38, 0.32);
  const geometry = new ShapeGeometry(s, 12);
  const positions = geometry.attributes["position"]!;
  const uv = geometry.attributes["uv"]!;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, (positions.getX(i) + 5.5) / 11, positions.getY(i) / 3.28);
  return geometry;
}

/** TransJakarta-inspired electric city bus. Nose is local +Z; doors are on the Indonesian curb side (+X). */
export function BusModel({
  compact = false,
  riding = false,
}: {
  compact?: boolean;
  riding?: boolean;
}) {
  const wheels = useRef<(Group | null)[]>([]);
  const doors = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    if (!riding) return;
    wheels.current.forEach((wheel, i) => {
      if (!wheel) return;
      const side = i % 2 === 0 ? -1 : 1;
      wheel.rotation.z = -side * busPose.wheelAngle;
      wheel.rotation.y = (side * Math.PI) / 2 + (i >= 2 ? busPose.steer : 0);
    });
    doors.current.forEach((door, i) => {
      if (door)
        door.position.z =
          (i < 2 ? 4.67 : 0.765) + (i % 2 === 0 ? -1 : 1) * (0.28 + busPose.door * 0.45);
    });
  });
  const lengthScale = compact ? 8 / 11 : 1;
  const panels = useMemo(
    () => ({
      geometry: sidePanel(lengthScale),
      left: busLivery("left"),
      right: busLivery("right"),
      front: busLivery("front"),
      rear: busLivery("rear"),
    }),
    [lengthScale],
  );
  useEffect(
    () => () => {
      for (const resource of Object.values(panels)) resource.dispose();
    },
    [panels],
  );
  return (
    <group name="TransJakartaBus" scale={[compact ? 0.96 : 1, 1, lengthScale]}>
      <OutdoorBatch items={details} />
      <RoundedBox
        args={[2.48, 1.93, 10.95]}
        position={[0, 2.28, 0]}
        radius={0.18}

        castShadow
      >
        <meshStandardMaterial color="#0c202b" roughness={0.24} metalness={0.3} />
      </RoundedBox>
      <RoundedBox
        args={[2.5, 0.2, 11]}
        position={[0, 3.22, 0]}
        radius={0.09}

        castShadow
      >
        <meshStandardMaterial color={BLUE} roughness={0.36} metalness={0.18} />
      </RoundedBox>
      <RoundedBox
        args={[1.7, 0.25, 3.7]}
        position={[0, 3.4, -0.5]}
        radius={0.1}

        castShadow
      >
        <meshStandardMaterial color="#dde5e8" roughness={0.55} />
      </RoundedBox>
      {([-1, 1] as const).map((side) => (
        <mesh
          key={side}
          geometry={panels.geometry}
          position={[side * 1.251, 0, 0]}
          rotation-y={(side * Math.PI) / 2}
          castShadow
        >
          <meshStandardMaterial
            map={side === -1 ? panels.left : panels.right}
            roughness={0.38}
            metalness={0.16}
          />
        </mesh>
      ))}
      {([-1, 1] as const).map((end) => (
        <group key={end} position={[0, 0, end * 5.35]} rotation-y={end === 1 ? 0 : Math.PI}>
          <RoundedBox
            args={[2.49, 0.95, 0.3]}
            position={[0, 0.79, 0]}
            radius={0.14}

            castShadow
          >
            <meshStandardMaterial color={BLUE} roughness={0.32} metalness={0.2} />
          </RoundedBox>
          <mesh position={[0, 1.77, 0.159]}>
            <planeGeometry args={[2.26, 2.9]} />
            <meshStandardMaterial
              map={end === 1 ? panels.front : panels.rear}
              roughness={0.25}
              metalness={0.2}
            />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.96, 0.79, 0.178]}>
              <RoundedBox args={[0.36, 0.22, 0.08]} radius={0.06}>
                <meshStandardMaterial color={TRIM} />
              </RoundedBox>
              <mesh position={[0, 0.015, 0.045]}>
                <boxGeometry args={[0.27, 0.055, 0.025]} />
                <meshStandardMaterial
                  color={end === 1 ? "#e3f5ff" : "#e43336"}
                  emissive={end === 1 ? "#a8daff" : "#e92222"}
                  emissiveIntensity={0.65}
                />
              </mesh>
              <mesh position={[side * 0.085, -0.065, 0.045]}>
                <boxGeometry args={[0.09, 0.04, 0.025]} />
                <meshStandardMaterial color="#f2ae34" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {[4.67, 0.765].flatMap((z, doorIndex) =>
        [-1, 1].map((side, leaf) => (
          <mesh
            key={`${z}:${side}`}
            ref={(node) => {
              doors.current[doorIndex * 2 + leaf] = node;
            }}
            position={[1.285, 1.66, z + side * 0.28]}
            name="BusDoor"
          >
            <boxGeometry args={[0.055, 2.8, 0.54]} />
            <meshStandardMaterial color="#102834" roughness={0.25} metalness={0.25} />
            <mesh position={[0.04, -0.05, -side * 0.18]}>
              <boxGeometry args={[0.035, 0.65, 0.035]} />
              <meshStandardMaterial color="#e7bc4c" />
            </mesh>
            <mesh position={[0.035, -1.28, 0]}>
              <boxGeometry args={[0.02, 0.05, 0.5]} />
              <meshStandardMaterial color="#a7b3b8" />
            </mesh>
          </mesh>
        )),
      )}
      {AXLES.flatMap((z, axle) =>
        [-1, 1].map((side, wheelIndex) => (
          <group
            key={`${z}:${side}`}
            ref={(node) => {
              wheels.current[axle * 2 + wheelIndex] = node;
            }}
            position={[side * 1.18, 0.56, z]}
            rotation-y={(side * Math.PI) / 2}
            scale-x={1 / lengthScale}
          >
            <mesh castShadow>
              <torusGeometry args={[0.405, 0.145, 8, 24]} />
              <meshStandardMaterial color="#161c22" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0, 0.09]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.32, 0.32, 0.12, 24]} />
              <meshStandardMaterial color="#b4c3cc" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.16]}>
              <torusGeometry args={[0.25, 0.022, 6, 24]} />
              <meshStandardMaterial color="#5c6c78" metalness={0.55} roughness={0.45} />
            </mesh>
            <mesh position={[0, 0, 0.17]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.11, 0.13, 0.07, 12]} />
              <meshStandardMaterial color="#cad5dc" metalness={0.75} roughness={0.28} />
            </mesh>
            <OutdoorBatch items={rimHoles} shape="round" shadows={false} />
          </group>
        )),
      )}
    </group>
  );
}
