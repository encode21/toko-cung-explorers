/** Club and concert are connected rooms in the same server-authoritative music session. */
export const VENUE_FLOOR = -14;
export const CONCERT_CENTER = 34;
export const VENUE_ENTRANCE = [10.4, 0, 3.8] as const;
export const VENUE_DESTINATIONS = [
  {
    id: "venue-club",
    label: "Cung Underground",
    position: VENUE_ENTRANCE,
    detail: "DJ, dance floor & lounge",
  },
  {
    id: "venue-concert",
    label: "Cung Live · Arena konser",
    position: VENUE_ENTRANCE,
    detail: "Panggung komunitas · akses lewat Underground",
  },
] as const;
export type VenueId = (typeof VENUE_DESTINATIONS)[number]["id"];
export const LOUNGE_SEATS = [-1, 1].flatMap((side) =>
  [-1, 1, 3].map((z, i) => ({
    id: `club-seat-${side}-${i}`,
    label: "Sofa lounge",
    position: [side * 9, VENUE_FLOOR, z] as [number, number, number],
    yaw: (-side * Math.PI) / 2,
    radius: 1.5,
  })),
);
export const CONCERT_SEATS = [-1, 1].flatMap((side) =>
  [3, 6, 9].map((z, i) => ({
    id: `concert-seat-${side}-${i}`,
    label: "Bangku arena konser",
    position: [CONCERT_CENTER + side * 10, VENUE_FLOOR, z] as [number, number, number],
    yaw: Math.PI,
    radius: 1.6,
  })),
);
export function atBar(position: readonly number[]) {
  return (
    Math.abs(position[1]! - (VENUE_FLOOR + 0.83)) < 1.5 &&
    Math.hypot(position[0]! + 8, position[2]! + 6) < 2.6
  );
}
export function inConcert(x: number) {
  return x > 18;
}
