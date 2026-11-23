/** Rumah (F5): one private interior per client, off-grid like the warung (3000) and gang (6000) scenes. */
export const HOME_ORIGIN: [number, number, number] = [9000, 0, 3000];
export const HOME_ROOM = { w: 8, d: 7, h: 3 };
type Spot = [number, number];
/** Local positions (x, z) inside the room; the door wall is at +z. */
export const HOME_SPOTS = {
  spawn: [0.4, 0.6] as Spot,
  window: [-2.6, -3.1] as Spot,
  box: [2.6, -2.4] as Spot,
  bed: [-2.5, 1.5] as Spot,
  door: [1.8, 3.1] as Spot,
};
export function homeWorld([x, z]: Spot): [number, number, number] {
  return [HOME_ORIGIN[0] + x, 0.83, HOME_ORIGIN[2] + z];
}
export function isHomeRoom(x: number, z: number) {
  return Math.abs(x - HOME_ORIGIN[0]) < 20 && Math.abs(z - HOME_ORIGIN[2]) < 20;
}
export function nearHomeSpot(p: readonly number[], spot: Spot, radius = 1.8) {
  const [x, , z] = homeWorld(spot);
  return Math.hypot(p[0]! - x, p[2]! - z) <= radius;
}
