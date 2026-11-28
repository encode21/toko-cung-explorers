/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { CanvasTexture, SRGBColorSpace } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart, Finish } from "@/game/assets/parts";
import { vehicleParts, type VehicleKind } from "@/game/assets/vehicles";
import type { Vec3 } from "@/game/world/layout";
import { PEDESTRIAN_PAVING_Y } from "@/game/world/outdoor-layout";
import { MOTOR_VENUE, SHOWROOM_LOT, SHOWROOM_ROOM, type ShowroomVenue } from "./layout";
import { SHOWROOM_MODELS } from "./models";

/** Identitas per dealer; bangunan, pintu dan kaca etalase memakai geometri yang sama. */
interface FacadeTheme {
  accent: string;
  accentLight: string;
  sign: { bg: string; line: string; title: string; subtitle: string; subtitleColor: string };
  stands: [VehicleKind, string][];
}
const THEMES: Record<ShowroomVenue["id"], FacadeTheme> = {
  motor: {
    accent: "#da464b",
    accentLight: "#ff766f",
    sign: {
      bg: "#26323a",
      line: "#2e3c43",
      title: "CUNG MOTOR",
      subtitle: "S H O W R O O M",
      subtitleColor: "#efb6a5",
    },
    stands: [
      ["cung-velocity", SHOWROOM_MODELS["cung-velocity"].color],
      ["cung-imperial", SHOWROOM_MODELS["cung-imperial"].color],
    ],
  },
  niaga: {
    accent: "#e9a91f",
    accentLight: "#ffd25e",
    sign: {
      bg: "#1f3a2b",
      line: "#264534",
      title: "CUNG NIAGA",
      subtitle: "V I A R · P I C K U P · T R U K",
      subtitleColor: "#f6d58a",
    },
    stands: [
      ["viar", "#e6a817"],
      ["pickup", "#f4f1ea"],
    ],
  },
};

const { width, depth } = SHOWROOM_LOT;
const front = depth / 2;
const baseHeight = 8.45;
const { doorWidth, doorHeight } = SHOWROOM_ROOM;
const windowWidth = (width - doorWidth) / 2;
const windowCenter = (doorWidth + windowWidth) / 2;
const dark = "#222931";
const metal = "#343d45";
const silver = "#dfe4e3";

function panel(p: Vec3, s: Vec3, color: string, finish: Finish = "metal"): AssetPart {
  return { p, s, color, finish, shape: "box" };
}

// Front glazing and the header share the same four-metre opening as the portal.
const floor = panel([0, PEDESTRIAN_PAVING_Y - 0.15, 0], [width, 0.3, depth], "#657176", "concrete");
const wallHeight = baseHeight - PEDESTRIAN_PAVING_Y;
const wallCenter = PEDESTRIAN_PAVING_Y + wallHeight / 2;
const shell: AssetPart[] = [
  floor,
  // The facade's one-metre apron joins the city path at the lot boundary.
  panel([0, PEDESTRIAN_PAVING_Y - 0.025, front + 0.5], [4.8, 0.05, 1], "#dbd3bf", "concrete"),
  panel([0, wallCenter, -front + 0.14], [width, wallHeight, 0.28], dark),
  ...[-1, 1].map((side) =>
    panel([side * (width / 2 - 0.14), wallCenter, 0], [0.28, wallHeight, depth], dark),
  ),
  panel([0, baseHeight - 0.15, 0], [width, 0.3, depth], metal),
  panel(
    [0, (baseHeight + doorHeight + PEDESTRIAN_PAVING_Y) / 2, front - 0.12],
    [width, baseHeight - doorHeight - PEDESTRIAN_PAVING_Y, 0.24],
    dark,
  ),
];

const curveCenter = -2.28;
const curveRadiusX = 3.38;
const curveRadiusZ = 3.79;
const curveBottom = 7.9;
const curveTop = 11.94;
const curveSegments = 16;
const glazing = ["#607984", "#536b76", "#718b94", "#435b66"];
const curvePanels = Array.from({ length: curveSegments }, (_, i) => {
  const start = (i * 2 * Math.PI) / curveSegments;
  const end = ((i + 1) * 2 * Math.PI) / curveSegments;
  const x0 = curveCenter + curveRadiusX * Math.sin(start);
  const z0 = curveRadiusZ * Math.cos(start);
  const x1 = curveCenter + curveRadiusX * Math.sin(end);
  const z1 = curveRadiusZ * Math.cos(end);
  const span = Math.hypot(x1 - x0, z1 - z0);
  const y = (curveBottom + curveTop) / 2;
  const height = curveTop - curveBottom;
  return [
    {
      ...panel([(x0 + x1) / 2, y, (z0 + z1) / 2], [span + 0.02, height, 0.15], glazing[i % 4]!),
      ry: -Math.atan2(z1 - z0, x1 - x0),
    },
    panel([x0, y, z0], [0.13, height, 0.15], dark),
  ];
}).flat();

const standSlots = [
  { x: -windowCenter, rotation: 0.29 },
  { x: windowCenter, rotation: -0.3 },
];
const stands = (theme: FacadeTheme) =>
  standSlots.map((slot, i) => ({ ...slot, car: vehicleParts(...theme.stands[i]!) }));
const standParts = (coral: string) =>
  standSlots.flatMap(({ x }) => [
    panel([x, 0.17, 1.45], [3.1, 0.2, 5.1], "#4f5960"),
    panel([x, 0.265, 4.02], [3, 0.022, 0.085], coral, "paint"),
    panel([x, 2.05, -1.25], [3.35, 3.65, 0.2], "#849193"),
    panel([x, 3.56, 1.32], [3.05, 0.1, 5.3], "#3d4a52"),
  ]);
const architecturalPanels = ({ accent: coral, accentLight }: FacadeTheme): AssetPart[] => [
  ...shell,
  ...curvePanels,
  ...standParts(coral),
  // Thin canopy with coral edging, brushed steel brow and structural piers.
  panel([0, 4.3, front + 0.27], [width + 0.32, 0.42, 0.98], "#1b222b"),
  panel([0, 4.49, front + 0.756], [width + 0.32, 0.085, 0.05], silver),
  panel([0, 4.1, front + 0.755], [width + 0.32, 0.07, 0.055], coral, "paint"),
  panel([0, baseHeight + 0.11, front - 0.07], [width + 0.25, 0.24, 0.46], silver),
  ...[-1, 1].flatMap((side) => [
    panel([side * (width / 2 - 0.13), 2.06, front + 0.04], [0.26, 4.12, 0.32], metal),
    panel([side * 2.17, 2.0, front + 0.035], [0.3, 4.0, 0.3], coral, "paint"),
    panel([side * windowCenter, 0.17, front + 0.015], [windowWidth, 0.16, 0.23], metal),
    panel([side * windowCenter, 2.04, front + 0.043], [0.075, 3.79, 0.1], metal),
    ...[0.1, 0.55, 1].map((offset) =>
      panel([side * (width / 2 + 0.035), 4.98 + offset, -1.6], [0.08, 0.08, 5.45], "#49525b"),
    ),
  ]),
  // One tall accent fin ties the entry trim to the roof ornament.
  panel([-2.66, 7.8, front + 0.095], [0.67, 7.45, 0.35], coral, "paint"),
  panel([-2.97, 7.8, front + 0.283], [0.075, 7.45, 0.075], accentLight, "paint"),
  ...Array.from({ length: 13 }, (_, i) =>
    panel([-4.34, 4.83 + i * 0.236, front + 0.05], [2.35, 0.055, 0.13], "#46515b"),
  ),
];

/** A local wordmark avoids a font download during city scene loading. */
function ShowroomSign({ theme }: { theme: FacadeTheme }) {
  const { sign, accent } = theme;
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 384;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = sign.bg;
    ctx.fillRect(0, 0, 1024, 384);
    ctx.fillStyle = sign.line;
    for (let y = 14; y < 370; y += 14) ctx.fillRect(0, y, 1024, 2);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 370, 1024, 14);
    ctx.save();
    ctx.translate(131, 184);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(0, -85);
    ctx.lineTo(83, -39);
    ctx.lineTo(83, 40);
    ctx.lineTo(0, 85);
    ctx.lineTo(-83, 40);
    ctx.lineTo(-83, -39);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#fff5e7";
    ctx.lineWidth = 15;
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.moveTo(-48, 36);
    ctx.lineTo(-10, -33);
    ctx.lineTo(14, -33);
    ctx.moveTo(-5, 36);
    ctx.lineTo(33, -33);
    ctx.lineTo(56, -33);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#fff4e6";
    ctx.font = "900 126px system-ui, sans-serif";
    ctx.fillText(sign.title, 254, 194, 724);
    ctx.fillStyle = sign.subtitleColor;
    ctx.font = "700 63px system-ui, sans-serif";
    ctx.fillText(sign.subtitle, 261, 282, 711);
    const next = new CanvasTexture(canvas);
    next.colorSpace = SRGBColorSpace;
    next.anisotropy = 4;
    return next;
  }, [sign, accent]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={[1.2, 6.59, front + 0.13]}>
      <mesh castShadow>
        <boxGeometry args={[6.9, 2.7, 0.24]} />
        <meshStandardMaterial color="#303b43" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0, 0.125]}>
        <planeGeometry args={[6.88, 2.69]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

const spokeParts: AssetPart[] = Array.from({ length: 5 }, (_, i) => {
  const angle = (i * Math.PI * 2) / 5;
  return [-0.21, 0.21].map((offset) => {
    const theta = angle + offset;
    return {
      ...panel([-Math.sin(theta) * 0.62, Math.cos(theta) * 0.62, 0.12], [0.14, 0.89, 0.15], silver),
      rz: theta,
    };
  });
}).flat();

function RoofWheel() {
  return (
    <group name="Cung Motor Roof Wheel" position={[curveCenter, 12.98, 2.09]} rotation-y={-0.12}>
      <mesh castShadow>
        <torusGeometry args={[1.12, 0.3, 8, 28]} />
        <meshStandardMaterial color="#161b22" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, 0.09]}>
        <torusGeometry args={[0.895, 0.091, 6, 24]} />
        <meshStandardMaterial color="#a9b9bc" roughness={0.28} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.18]}>
        <torusGeometry args={[0.245, 0.052, 6, 18]} />
        <meshBasicMaterial color="#fc635f" />
      </mesh>
      <StyledBatch items={spokeParts} />
    </group>
  );
}

/** Mini truk di atap Cung Niaga, pengganti roda Cung Motor. */
const roofTruck = vehicleParts("truck", "#e9a91f");

export function ShowroomFacade({ venue = MOTOR_VENUE }: { venue?: ShowroomVenue }) {
  const theme = THEMES[venue.id];
  const panels = useMemo(() => architecturalPanels(theme), [theme]);
  const standCars = useMemo(() => stands(theme), [theme]);
  const { lot } = venue;
  return (
    <group
      name={`${venue.id}-ShowroomFacade`}
      position={[lot.x, 0, lot.z]}
      rotation-y={lot.rotation}
    >
      <StyledBatch items={panels} />
      <mesh
        position={[curveCenter, curveTop + 0.055, 0]}
        scale={[1, 1, curveRadiusZ / curveRadiusX]}
        castShadow
      >
        <cylinderGeometry args={[curveRadiusX + 0.2, curveRadiusX + 0.2, 0.19, curveSegments]} />
        <meshStandardMaterial color="#293139" roughness={0.47} metalness={0.25} />
      </mesh>
      <mesh
        position={[curveCenter, curveTop + 0.193, 0]}
        scale={[1, 1, curveRadiusZ / curveRadiusX]}
      >
        <cylinderGeometry args={[curveRadiusX + 0.07, curveRadiusX + 0.13, 0.08, curveSegments]} />
        <meshStandardMaterial color="#c8d1d1" roughness={0.42} metalness={0.24} />
      </mesh>
      {venue.id === "motor" ? (
        <RoofWheel />
      ) : (
        <group position={[curveCenter, 12.08, 0.4]} rotation-y={-0.5} scale={0.62}>
          <StyledBatch items={roofTruck} />
        </group>
      )}
      <ShowroomSign theme={theme} />
      {standCars.map(({ x, rotation, car }) => (
        <group key={x}>
          <mesh position={[x, 2.029, front + 0.048]} renderOrder={3}>
            <planeGeometry args={[windowWidth - 0.28, 3.69]} />
            <meshStandardMaterial color="#a0c4cc" transparent opacity={0.17} depthWrite={false} />
          </mesh>
          <mesh position={[x, 3.51, 2.05]}>
            <boxGeometry args={[2.54, 0.055, 2.25]} />
            <meshBasicMaterial color="#fff2cf" />
          </mesh>
          <mesh position={[x, 4.064, front + 0.48]}>
            <boxGeometry args={[2.9, 0.048, 0.11]} />
            <meshBasicMaterial color="#fff3df" />
          </mesh>
          <group position={[x, 0.278, 1.37]} rotation-y={rotation}>
            <StyledBatch items={car} />
          </group>
        </group>
      ))}
      <mesh position={[0, 4.063, front + 0.46]}>
        <boxGeometry args={[3.4, 0.05, 0.15]} />
        <meshBasicMaterial color="#fff3df" />
      </mesh>
      <RigidBody name={`${venue.id}-ShowroomFacadeStructure`} type="fixed" colliders={false}>
        {shell.map(({ p, s }, i) => (
          <CuboidCollider key={i} position={p} args={[s[0] / 2, s[1] / 2, s[2] / 2]} />
        ))}
        {[-windowCenter, windowCenter].map((x) => (
          <CuboidCollider
            key={x}
            position={[x, PEDESTRIAN_PAVING_Y + doorHeight / 2, front - 0.02]}
            args={[windowWidth / 2, doorHeight / 2, 0.11]}
          />
        ))}
      </RigidBody>
    </group>
  );
}
