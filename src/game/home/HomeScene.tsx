/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierCollider } from "@react-three/rapier";
import * as THREE from "three";
import { useGame } from "@/state/game-store";
import { useProlog } from "@/game/prolog/store";
import { canLeaveHome, HOME_ORIGIN, HOME_ROOM, HOME_SPOTS, nearHomeSpot } from "./model";
import { leaveHome, useHome } from "./store";
import { EntryRing } from "./EntryRing";
import { HomeFurniture, HomeFurnitureColliders } from "./HomeFurniture";
import { HomeMountainYard } from "./HomeMountainYard";

const { w, d, h } = HOME_ROOM;
const [doorX] = HOME_SPOTS.door;
const [windowX] = HOME_SPOTS.window;
const DOOR_W = 1.3;
const DOOR_H = 2.7;
const WALL_DEPTH = 0.3;
const BASEBOARD_Y = 0.07;
const WINDOW_W = 3.5;
const WINDOW_H = 2.2;
const WINDOW_Y = 2.55;
const PLASTER = "#f3e8d6";
const FRAME = "#2e454f";
const BASEBOARD = "#f9f2e6";
const BACK_Z = -d / 2;
const FRONT_Z = d / 2;
const LEFT_X = -w / 2;
const RIGHT_X = w / 2;
const LEFT_JAMB = doorX - DOOR_W / 2;
const RIGHT_JAMB = doorX + DOOR_W / 2;
const PLANT_X = RIGHT_X - 0.48;
const PLANT_Z = -1.55;

type Vec3 = [number, number, number];

const WALL_FOOTPRINTS: { p: Vec3; s: Vec3 }[] = [
  { p: [0, 0, BACK_Z - WALL_DEPTH / 2], s: [w + WALL_DEPTH * 2, h, WALL_DEPTH] },
  { p: [LEFT_X - WALL_DEPTH / 2, 0, 0], s: [WALL_DEPTH, h, d] },
  { p: [RIGHT_X + WALL_DEPTH / 2, 0, 0], s: [WALL_DEPTH, h, d] },
  {
    p: [(LEFT_X + LEFT_JAMB) / 2, 0, FRONT_Z + WALL_DEPTH / 2],
    s: [LEFT_JAMB - LEFT_X, h, WALL_DEPTH],
  },
  {
    p: [(RIGHT_X + RIGHT_JAMB) / 2, 0, FRONT_Z + WALL_DEPTH / 2],
    s: [RIGHT_X - RIGHT_JAMB, h, WALL_DEPTH],
  },
];

function Block({
  p,
  s,
  color,
  castShadow = false,
}: {
  p: Vec3;
  s: Vec3;
  color: string;
  castShadow?: boolean;
}) {
  return (
    <mesh position={p} castShadow={castShadow} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

function useRoomTexture(
  draw: (ctx: CanvasRenderingContext2D) => void,
  width: number,
  height: number,
) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext("2d")!);
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    result.anisotropy = 4;
    return result;
  }, [draw, height, width]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function drawOak(ctx: CanvasRenderingContext2D) {
  const { width, height } = ctx.canvas;
  const plankWidth = width / 30;
  const plankLength = height / 6;
  const oak = ["#c9a57f", "#d8b58f", "#d0ae85", "#ddbd97", "#d4b48d"];
  ctx.fillStyle = "#b39876";
  ctx.fillRect(0, 0, width, height);
  for (let column = 0; column < 30; column += 1) {
    const x = column * plankWidth;
    for (let row = -1; row < 6; row += 1) {
      const y = row * plankLength + (column % 3) * (plankLength / 3);
      ctx.fillStyle = oak[(column * 11 + (row + 1) * 7) % oak.length]!;
      ctx.fillRect(x + 1.5, y + 1.5, plankWidth - 2, plankLength - 2);
      ctx.fillStyle = "#fff4d81e";
      ctx.fillRect(x + 3, y + 4, 1.5, plankLength - 9);
      ctx.fillStyle = "#8d694619";
      ctx.fillRect(x + 8, y + ((column * 47) % 72), 1, 32 + ((column * 13) % 40));
    }
  }
}

function HomeExitDoor() {
  const hinge = useRef<THREE.Group>(null);
  const backdrop = useRef<THREE.Mesh>(null);
  const barrier = useRef<RapierCollider>(null);
  const open = useRef(false);
  const width = DOOR_W - 0.09;
  const height = DOOR_H - 0.08;
  const depth = 0.095;
  const doorZ = FRONT_Z + WALL_DEPTH - 0.065;

  useFrame((_, delta) => {
    const { playerPos, pendingTeleport } = useGame.getState();
    const { inside, leaving } = useHome.getState();
    const localX = playerPos[0] - HOME_ORIGIN[0] - doorX;
    const localZ = playerPos[2] - HOME_ORIGIN[2];
    // Keep a short buffer on the threshold so the panel cannot close on a crossing player.
    const crossing =
      Math.abs(localX) < DOOR_W / 2 && localZ >= FRONT_Z - 0.25 && localZ < FRONT_Z + 0.9;
    const exitAllowed = canLeaveHome(useProlog.getState().data);
    const shouldOpen =
      exitAllowed &&
      inside &&
      !pendingTeleport &&
      (leaving || crossing || nearHomeSpot(playerPos, HOME_SPOTS.door, open.current ? 2.02 : 1.8));
    open.current = shouldOpen;
    if (barrier.current?.isEnabled() === shouldOpen) barrier.current.setEnabled(!shouldOpen);
    if (hinge.current) {
      hinge.current.rotation.y = THREE.MathUtils.damp(
        hinge.current.rotation.y,
        shouldOpen ? -Math.PI * 0.58 : 0,
        15,
        delta,
      );
      if (backdrop.current) backdrop.current.visible = Math.abs(hinge.current.rotation.y) > 0.04;
    }
    if (shouldOpen && !leaving && crossing && localZ > FRONT_Z + 0.35) void leaveHome();
  });

  return (
    <group name="HomeExitDoor">
      <mesh
        ref={backdrop}
        name="HomeExitWhiteBackdrop"
        visible={false}
        position={[doorX, DOOR_H / 2, FRONT_Z + WALL_DEPTH + 0.015]}
        rotation-y={Math.PI}
      >
        <planeGeometry args={[DOOR_W + 0.24, DOOR_H + 0.14]} />
        <meshBasicMaterial color="#ffffff" fog={false} toneMapped={false} />
      </mesh>
      <group ref={hinge} position={[doorX - width / 2, 0, doorZ]} name="HomeExitDoorHinge">
        <Block p={[width / 2, height / 2 + 0.03, 0]} s={[width, height, depth]} color="#805446" />
        {[0.29, 0.71].flatMap((column) =>
          [
            { y: 1.825, h: 1.285 },
            { y: 0.573, h: 0.8 },
          ].map(({ y, h: panelHeight }) => (
            <group
              key={`${column}-${y}`}
              position={[width * column, y, 0]}
              name="HomeExitInsetPanel"
            >
              <Block p={[0, 0, -0.05]} s={[0.423, panelHeight, 0.028]} color="#623d32" />
              <Block p={[0, 0, -0.067]} s={[0.366, panelHeight - 0.057, 0.019]} color="#986751" />
              <Block p={[0, 0, -0.077]} s={[0.327, panelHeight - 0.095, 0.016]} color="#794d40" />
            </group>
          )),
        )}
        {[-1, 1].map((face) => (
          <group key={face} position={[width - 0.1, 1.078, face * 0.07]}>
            <mesh rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.053, 0.053, 0.037, 12]} />
              <meshStandardMaterial color="#d9a456" metalness={0.35} roughness={0.48} />
            </mesh>
            <Block p={[-0.072, 0, face * 0.037]} s={[0.16, 0.04, 0.044]} color="#eac079" />
          </group>
        ))}
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          ref={barrier}
          args={[width / 2, height / 2, depth / 2]}
          position={[doorX, height / 2 + 0.03, doorZ]}
        />
      </RigidBody>
    </group>
  );
}

function SolidWall({ length, color = PLASTER }: { length: number; color?: string }) {
  return (
    <>
      <Block p={[0, h / 2, -WALL_DEPTH / 2]} s={[length, h, WALL_DEPTH]} color={color} />
      <Block p={[0, BASEBOARD_Y, 0.025]} s={[length, 0.08, 0.06]} color={BASEBOARD} />
      <Block p={[0, h - 0.16, 0.028]} s={[length, 0.12, 0.07]} color={BASEBOARD} />
    </>
  );
}

function WallPrint({
  position,
  color,
  scale = 1,
}: {
  position: Vec3;
  color: string;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <Block p={[0, 0, 0]} s={[0.84, 1.09, 0.085]} color="#9b7659" />
      <Block p={[0, 0, 0.045]} s={[0.75, 1, 0.02]} color="#fff4df" />
      <Block p={[0, 0, 0.059]} s={[0.59, 0.81, 0.014]} color={color} />
      <mesh position={[0.095, 0.15, 0.073]}>
        <circleGeometry args={[0.139, 20]} />
        <meshStandardMaterial color="#f4ce85" />
      </mesh>
      <Block p={[0, -0.193, 0.074]} s={[0.59, 0.42, 0.017]} color="#335e63" />
      <Block p={[0, -0.115, 0.088]} s={[0.49, 0.026, 0.012]} color="#e4c49a" />
      <Block p={[0, -0.227, 0.088]} s={[0.33, 0.026, 0.012]} color="#94bcac" />
      <Block p={[0, -0.339, 0.088]} s={[0.21, 0.026, 0.012]} color="#e4c49a" />
    </group>
  );
}

function CornerPlant() {
  return (
    <group position={[PLANT_X, 0, PLANT_Z]} name="HomeCornerPlant">
      <mesh position={[0, 0.185, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.29, 0.22, 0.37, 12]} />
        <meshStandardMaterial color="#ca8867" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.359, 0]}>
        <cylinderGeometry args={[0.255, 0.255, 0.025, 12]} />
        <meshStandardMaterial color="#695545" />
      </mesh>
      {[0.3, 1.65, 2.95, 4.2, 5.3].map((angle, index) => (
        <group key={angle} rotation-y={angle}>
          <mesh
            position={[0.17, 0.64 + (index % 2) * 0.08, 0]}
            rotation-z={-0.53}
            scale={[0.18, 0.63, 0.11]}
            castShadow
          >
            <sphereGeometry args={[0.5, 7, 5]} />
            <meshStandardMaterial color={index % 2 ? "#69916d" : "#497765"} roughness={0.83} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Panorama({ open }: { open: boolean }) {
  return (
    <group position={[windowX, WINDOW_Y, 0]} name="HomePanorama">
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block
            p={[(side * WINDOW_W) / 2, 0, -0.06]}
            s={[0.12, WINDOW_H + 0.12, 0.38]}
            color={FRAME}
          />
          <Block p={[0, (side * WINDOW_H) / 2, -0.06]} s={[WINDOW_W, 0.12, 0.38]} color={FRAME} />
          <group
            position={[side * (WINDOW_W / 2 - 0.055), 0, -0.23]}
            rotation-y={open ? -side * 0.82 : 0}
          >
            <group position={[-side * (WINDOW_W / 4 - 0.02), 0, 0]}>
              <mesh>
                <planeGeometry args={[WINDOW_W / 2 - 0.14, WINDOW_H - 0.16]} />
                <meshBasicMaterial
                  color="#a7d9e6"
                  transparent
                  opacity={0.11}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
              <Block
                p={[-side * (WINDOW_W / 4 - 0.09), 0, 0]}
                s={[0.065, WINDOW_H - 0.1, 0.06]}
                color={FRAME}
              />
              <Block p={[0, 0.04, 0]} s={[WINDOW_W / 2 - 0.12, 0.045, 0.055]} color={FRAME} />
              {[-1, 1].map((rail) => (
                <Block
                  key={rail}
                  p={[0, rail * (WINDOW_H / 2 - 0.07), 0]}
                  s={[WINDOW_W / 2 - 0.12, 0.065, 0.07]}
                  color={FRAME}
                />
              ))}
            </group>
          </group>
        </group>
      ))}
      <Block
        p={[0, -WINDOW_H / 2 - 0.07, 0.035]}
        s={[WINDOW_W + 0.3, 0.13, 0.53]}
        color="#d5af83"
      />
      <Block p={[0, WINDOW_H / 2 + 0.23, 0.05]} s={[WINDOW_W + 0.28, 0.13, 0.18]} color="#e3d0b4" />
    </group>
  );
}

function BackWall({ windowOpen }: { windowOpen: boolean }) {
  const windowLeft = windowX - WINDOW_W / 2;
  const windowRight = windowX + WINDOW_W / 2;
  const left = LEFT_X - WALL_DEPTH;
  const right = RIGHT_X + WALL_DEPTH;
  const sill = WINDOW_Y - WINDOW_H / 2;
  const head = WINDOW_Y + WINDOW_H / 2;
  return (
    <group position={[0, 0, BACK_Z]}>
      <Block
        p={[(left + windowLeft) / 2, h / 2, -WALL_DEPTH / 2]}
        s={[windowLeft - left, h, WALL_DEPTH]}
        color={PLASTER}
      />
      <Block
        p={[(right + windowRight) / 2, h / 2, -WALL_DEPTH / 2]}
        s={[right - windowRight, h, WALL_DEPTH]}
        color={PLASTER}
      />
      <Block
        p={[windowX, sill / 2, -WALL_DEPTH / 2]}
        s={[WINDOW_W, sill, WALL_DEPTH]}
        color={PLASTER}
      />
      <Block
        p={[windowX, (h + head) / 2, -WALL_DEPTH / 2]}
        s={[WINDOW_W, h - head, WALL_DEPTH]}
        color={PLASTER}
      />
      <Block p={[0, BASEBOARD_Y, 0.025]} s={[w, 0.08, 0.06]} color={BASEBOARD} />
      <Block p={[0, h - 0.16, 0.028]} s={[w, 0.12, 0.07]} color={BASEBOARD} />
      <Panorama open={windowOpen} />
      <group position={[0.2, 0, 0.04]}>
        <Block p={[0, h / 2, 0]} s={[3, h, 0.08]} color="#56766f" />
        {Array.from({ length: 13 }, (_, index) => (
          <Block
            key={index}
            p={[(index - 6) * 0.215, h / 2, 0.06]}
            s={[0.11, h - 0.4, 0.055]}
            color={index % 3 === 0 ? "#bc9672" : "#cda985"}
          />
        ))}
      </group>
    </group>
  );
}

function FrontWall() {
  return (
    <group position={[0, 0, FRONT_Z]} rotation-y={Math.PI}>
      <group position={[-(LEFT_X + LEFT_JAMB) / 2, 0, 0]}>
        <SolidWall length={LEFT_JAMB - LEFT_X} />
      </group>
      <group position={[-(RIGHT_X + RIGHT_JAMB) / 2, 0, 0]}>
        <SolidWall length={RIGHT_X - RIGHT_JAMB} />
      </group>
      <group position={[-doorX, 0, 0]}>
        <Block
          p={[0, (h + DOOR_H) / 2, -WALL_DEPTH / 2]}
          s={[DOOR_W, h - DOOR_H, WALL_DEPTH]}
          color={PLASTER}
        />
        <Block p={[0, DOOR_H, 0.015]} s={[DOOR_W + 0.22, 0.14, 0.33]} color={BASEBOARD} />
        {[-1, 1].map((side) => (
          <Block
            key={side}
            p={[side * (DOOR_W / 2 + 0.055), DOOR_H / 2, 0.015]}
            s={[0.11, DOOR_H, 0.33]}
            color={BASEBOARD}
          />
        ))}
      </group>
    </group>
  );
}

function Ceiling() {
  return (
    <group name="HomeCeiling" position={[0, h, 0]}>
      <Block p={[0, 0.13, 0]} s={[w + WALL_DEPTH * 2, 0.26, d + WALL_DEPTH * 2]} color="#f4ecdc" />
      <Block p={[0, 0.29, 0]} s={[w + 0.84, 0.12, d + 0.84]} color="#6d7b79" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block p={[side * (w / 2 - 0.14), -0.055, 0]} s={[0.28, 0.13, d]} color="#fff3df" />
          <Block
            p={[0, -0.055, side * (d / 2 - 0.14)]}
            s={[w - 0.56, 0.13, 0.28]}
            color="#fff3df"
          />
          <mesh position={[side * 2.5, -0.018, -0.35]} rotation-x={Math.PI / 2}>
            <planeGeometry args={[0.13, 4.8]} />
            <meshBasicMaterial color="#fff0ce" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FloorFinish() {
  const oak = useRoomTexture(drawOak, 1024, 1024);
  return (
    <>
      <Block p={[0, -0.2, 0]} s={[w + 0.65, 0.32, d + 0.65]} color="#a38264" />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={oak} roughness={0.91} />
      </mesh>
      <Block p={[doorX, -0.07, FRONT_Z + 0.74]} s={[2.3, 0.13, 1.8]} color="#af8970" />
      <Block p={[doorX, 0.014, FRONT_Z - 0.73]} s={[1.46, 0.028, 0.55]} color="#52716f" />
      <group position={[-3.85, 0, 0.7]} name="HomeRug">
        <Block p={[0, 0.014, 0]} s={[3.85, 0.028, 3.8]} color="#b57b54" />
        <Block p={[0, 0.026, 0]} s={[3.68, 0.012, 3.63]} color="#f3ddbc" />
        <Block p={[0, 0.033, 0]} s={[3.3, 0.009, 3.26]} color="#d8b88b" />
        <Block p={[0, 0.039, 0]} s={[3.23, 0.007, 3.19]} color="#ead0ad" />
        {[-1, 1].map((side) => (
          <group key={side} position={[0, 0, side * 1.36]}>
            <Block p={[0, 0.045, 0]} s={[2.9, 0.007, 0.055]} color="#f4e2c4" />
            {[-1.02, 0, 1.02].map((x) => (
              <group key={x} position={[x, 0.045, 0]} rotation-y={Math.PI / 4}>
                <Block p={[0, 0, 0]} s={[0.26, 0.012, 0.26]} color="#b97b59" />
                <Block p={[0, 0.007, 0]} s={[0.12, 0.01, 0.12]} color="#f3ddbc" />
              </group>
            ))}
          </group>
        ))}
      </group>
    </>
  );
}

export function HomeScene() {
  const windowOpen = useHome((s) => s.windowOpen);
  const exitAllowed = useProlog((s) => canLeaveHome(s.data));
  return (
    <>
      {exitAllowed && (
        <EntryRing
          position={[HOME_ORIGIN[0] + doorX, 0, HOME_ORIGIN[2] + FRONT_Z - 0.6]}
          label="Keluar rumah"
        />
      )}
      <group position={HOME_ORIGIN} name="HomeScene">
        <HomeMountainYard />
        <HomeExitDoor />
        <FloorFinish />
        <Ceiling />
        <group name="HomeWall-back">
          <BackWall windowOpen={windowOpen} />
        </group>
        <group name="HomeWall-left">
          <group position={[LEFT_X, 0, 0]} rotation-y={Math.PI / 2}>
            <SolidWall length={d} color="#f0e1cd" />
            <WallPrint position={[-1.08, 2.45, 0.025]} color="#9ab2a5" />
            <WallPrint position={[-0.08, 2.38, 0.025]} color="#d79e83" scale={0.77} />
            <WallPrint position={[2.6, 2.34, 0.025]} color="#82a7b7" scale={0.75} />
          </group>
        </group>
        <group name="HomeWall-right">
          <group position={[RIGHT_X, 0, 0]} rotation-y={-Math.PI / 2}>
            <SolidWall length={d} color="#e3e8da" />
          </group>
        </group>
        <group name="HomeWall-front">
          <FrontWall />
        </group>
        <HomeFurniture />
        <CornerPlant />
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[w / 2, 0.05, d / 2]} position={[0, -0.05, 0]} />
          <CuboidCollider args={[2, 0.05, 1.5]} position={[doorX, -0.05, FRONT_Z + 1]} />
          <CuboidCollider args={[w / 2, 0.05, d / 2]} position={[0, h + 0.05, 0]} />
          <CuboidCollider args={[0.28, 0.18, 0.28]} position={[PLANT_X, 0.18, PLANT_Z]} />
          <CuboidCollider
            args={[DOOR_W / 2, (h - DOOR_H) / 2, WALL_DEPTH / 2]}
            position={[doorX, (h + DOOR_H) / 2, FRONT_Z + WALL_DEPTH / 2]}
          />
          {WALL_FOOTPRINTS.map(({ p, s }, index) => (
            <CuboidCollider
              key={index}
              args={[s[0] / 2, s[1] / 2, s[2] / 2]}
              position={[p[0], h / 2, p[2]]}
            />
          ))}
          <HomeFurnitureColliders />
        </RigidBody>
        <hemisphereLight color="#fff1d6" groundColor="#aa8b81" intensity={0.7} />
        <pointLight position={[0, h - 0.42, 0]} intensity={20} distance={12} color="#ffe7c6" />
        <pointLight
          position={[windowX, 2.85, BACK_Z + 1.2]}
          intensity={windowOpen ? 22 : 9}
          distance={11}
          color="#e1f6ff"
        />
      </group>
    </>
  );
}
