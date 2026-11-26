import { HOME_BED, HOME_SPOTS, homeWorld } from "./model";

type Position = { x: number; y: number; z: number };

const STEP_SECONDS = 0.72;
const TURN_SECONDS = 0.32;
const LIE_SECONDS = 0.92;
const WALK_SPEED = 2.5;
const CLEARANCE = 0.45;
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/** A short walk to the closest accessible edge, then a step up and a hold in LieDown. */
export function createHomeBedMotion(start: Position) {
  const [x, floor, z] = homeWorld(HOME_SPOTS.bed);
  const mattress = { x, y: floor + HOME_BED.top + 0.01, z: z + 0.12 };
  const onBed =
    Math.abs(start.x - x) <= HOME_BED.halfWidth &&
    Math.abs(start.z - z) <= HOME_BED.halfDepth &&
    start.y > floor + HOME_BED.top - 0.12;
  const fromSide = Math.abs(start.x - x) >= HOME_BED.halfWidth && start.z < z + HOME_BED.halfDepth;
  const floorEdge = fromSide
    ? { x: x + Math.sign(start.x - x) * (HOME_BED.halfWidth + CLEARANCE), y: floor, z }
    : { x, y: floor, z: z + HOME_BED.halfDepth + CLEARANCE };
  const edge = onBed ? start : floorEdge;
  const walkDistance = Math.hypot(edge.x - start.x, edge.z - start.z);
  const walkSeconds = walkDistance / WALK_SPEED;
  const walkYaw = Math.atan2(edge.x - start.x, edge.z - start.z);
  const stepYaw = Math.atan2(mattress.x - edge.x, mattress.z - edge.z);
  const lieStart = walkSeconds + STEP_SECONDS + TURN_SECONDS;
  let elapsed = 0;

  return {
    floorEdge,
    update(delta: number) {
      elapsed += delta;
      if (elapsed < walkSeconds) {
        const t = elapsed / walkSeconds;
        return {
          position: {
            x: lerp(start.x, edge.x, t),
            y: lerp(start.y, edge.y, t),
            z: lerp(start.z, edge.z, t),
          },
          yaw: walkYaw,
          moving: true,
          lying: false,
          ready: false,
        };
      }

      const step = (elapsed - walkSeconds) / STEP_SECONDS;
      const across = smooth((step - 0.16) / 0.84);
      return {
        position: {
          x: lerp(edge.x, mattress.x, across),
          y: lerp(edge.y, mattress.y, smooth(step / 0.62)),
          z: lerp(edge.z, mattress.z, across),
        },
        yaw: step < 1 ? stepYaw : 0,
        moving: step < 1,
        lying: elapsed >= lieStart,
        ready: elapsed >= lieStart + LIE_SECONDS,
      };
    },
  };
}
