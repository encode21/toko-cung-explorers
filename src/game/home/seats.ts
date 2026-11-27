import { PLAYER_VISUAL_DROP, type BenchSpot } from "../world/street-props.ts";
import { HOME_ORIGIN, HOME_SOFA } from "./model.ts";

function sofaPoint(x: number, z: number): [number, number, number] {
  const { position, yaw } = HOME_SOFA;
  return [
    HOME_ORIGIN[0] + position[0] + x * Math.cos(yaw) + z * Math.sin(yaw),
    HOME_ORIGIN[1] + position[1],
    HOME_ORIGIN[2] + position[2] - x * Math.sin(yaw) + z * Math.cos(yaw),
  ];
}

/** Private seats use the normal bench pose; city occupancy tracks only public bench IDs. */
export const HOME_SOFA_SEATS: BenchSpot[] = (["left", "right"] as const).map((side) => {
  const direction = side === "left" ? -1 : 1;
  return {
    id: `home-sofa-${side}`,
    label: "Sofa kamar",
    benchId: "home-sofa",
    position: sofaPoint(direction * 0.5, 0.04),
    yaw: HOME_SOFA.yaw,
    seatHeight: HOME_SOFA.seatHeight,
    radius: 1.65,
    // The coffee table takes up the center aisle. Stand at the same end of the sofa as the seat.
    standPosition: sofaPoint(direction * 1.62, 0.55),
  };
});

export function nearbyHomeSofaSeat(player: { x: number; y: number; z: number }) {
  let closest: BenchSpot | undefined;
  let distance = Infinity;
  for (const seat of HOME_SOFA_SEATS) {
    const [x, y, z] = seat.position;
    if (Math.abs(player.y - y - PLAYER_VISUAL_DROP) > 1.8) continue;
    const gap = Math.hypot(player.x - x, player.z - z);
    if (gap >= seat.radius || gap >= distance) continue;
    distance = gap;
    closest = seat;
  }
  return closest;
}
