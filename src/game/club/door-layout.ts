import type { WorldTarget } from "@/game/editor/store";
import { PEDESTRIAN_PAVING_Y } from "../world/outdoor-layout.ts";
import { VENUE_FLOOR } from "./venue-layout.ts";

type Vec3 = [number, number, number];
type DoorTarget = Pick<WorldTarget, "position" | "rotation" | "tags">;

export const CLUB_ENTRANCE_SIZE = { width: 3.2, height: 2.82 };

export const CLUB_ROOM = {
  floor: VENUE_FLOOR,
  halfWidth: 12,
  halfDepth: 11,
  wallThickness: 0.4,
  height: 6,
};

/** +Z in door space points toward the player and out of the entrance. */
export function clubDoorLayout(target: DoorTarget) {
  const exit = target.tags.includes("club-exit");
  const width = exit ? 2.55 : CLUB_ENTRANCE_SIZE.width;
  const height = exit ? 2.77 : CLUB_ENTRANCE_SIZE.height;
  const limit = CLUB_ROOM.halfWidth - width / 2 - 0.55;
  const position: Vec3 = exit
    ? [
        Math.max(-limit, Math.min(limit, target.position.x)),
        CLUB_ROOM.floor,
        CLUB_ROOM.halfDepth - CLUB_ROOM.wallThickness / 2 - 0.06,
      ]
    : [target.position.x, target.position.y, target.position.z];
  const yaw = exit ? Math.PI : target.rotation.y;
  const point = (along: number): Vec3 => [
    position[0] + Math.sin(yaw) * along,
    position[1],
    position[2] + Math.cos(yaw) * along,
  ];
  const marker = point(exit ? 2.15 : 2);
  if (!exit) marker[1] += PEDESTRIAN_PAVING_Y;
  return {
    exit,
    position,
    yaw,
    width,
    height,
    marker,
    walkTo: point(exit ? -0.12 : -0.24),
  };
}

/** The positive-Z wall surrounds the opening so geometry and physics use the same notch. */
export function clubExitWallPieces(door?: ReturnType<typeof clubDoorLayout>) {
  const { halfWidth, halfDepth, height, wallThickness } = CLUB_ROOM;
  if (!door) {
    return [
      {
        position: [0, height / 2, halfDepth] as Vec3,
        size: [halfWidth * 2, height, wallThickness] as Vec3,
      },
    ];
  }
  const [x] = door.position;
  const left = x - door.width / 2;
  const right = x + door.width / 2;
  return [
    {
      position: [(left - halfWidth) / 2, height / 2, halfDepth] as Vec3,
      size: [left + halfWidth, height, wallThickness] as Vec3,
    },
    {
      position: [(right + halfWidth) / 2, height / 2, halfDepth] as Vec3,
      size: [halfWidth - right, height, wallThickness] as Vec3,
    },
    {
      position: [x, (height + door.height) / 2, halfDepth] as Vec3,
      size: [door.width, height - door.height, wallThickness] as Vec3,
    },
  ];
}
