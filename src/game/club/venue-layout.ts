/** Indoor club and open-air concert share the existing music session. */
export const VENUE_FLOOR = -14;
export const CONCERT_CENTER = 41;
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
    position: [41, 0, 10],
    detail: "Panggung terbuka · layar, bangku & pasar kuliner",
  },
] as const;
export type VenueId = (typeof VENUE_DESTINATIONS)[number]["id"];
export const CLUB_UPPER_Y = 3.4;
export interface ClubSeat {
 id: string; label: string; position: [number,number,number]; yaw: number; radius: number;
 style: "sofa" | "stool" | "chair"; seatHeight: number;
}
export const LOUNGE_SEATS: ClubSeat[] = [
 ...[-1,1].flatMap(side => [0,3].map((z,i):ClubSeat => ({id:`club-seat-${side}-${i}`,label:"Sofa lounge",position:[side*8,VENUE_FLOOR,z],yaw:-side*Math.PI/2,radius:1.4,style:"sofa",seatHeight:.51}))),
 ...[-9.7,-8.3,-6.9].map((x,i):ClubSeat => ({id:`club-bar-${i}`,label:"Kursi mini bar",position:[x,VENUE_FLOOR,-6.1],yaw:Math.PI,radius:1.1,style:"stool",seatHeight:.75})),
 ...[-8,-4,0,4].map((x,i):ClubSeat => ({id:`club-upper-${i}`,label:"Kursi balkon",position:[x,VENUE_FLOOR+CLUB_UPPER_Y,9],yaw:Math.PI,radius:1.2,style:"chair",seatHeight:.51})),
 ...[-2,1].map((z,i):ClubSeat => ({id:`club-upper-sofa-${i}`,label:"Sofa balkon",position:[-9,VENUE_FLOOR+CLUB_UPPER_Y,z],yaw:Math.PI/2,radius:1.4,style:"sofa",seatHeight:.51})),
];
export const CONCERT_SEATS = [-1, 1].flatMap((side) =>
  [3, 6, 9].map((z, i) => ({
    id: `concert-seat-${side}-${i}`,
    label: "Bangku arena konser",
    position: [CONCERT_CENTER + side * 10, 0, z] as [number, number, number],
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
  return x >= 27 && x <= 55;
}

export function atConcert(p: readonly number[]) {
  return inConcert(p[0]!) && p[1]! > -2 && p[2]! >= -14 && p[2]! <= 12;
}
