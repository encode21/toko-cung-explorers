/** Rumah (F5): one private interior per client, off-grid like the warung (3000) and gang (6000) scenes. */
export const HOME_ORIGIN: [number, number, number] = [9000, 0, 3000];
export const HOME_ROOM = { w: 12, d: 10, h: 4.5 };
export const HOME_BED = { halfWidth: 1, halfDepth: 1.1, top: 0.6 };
export const HOME_SOFA = {
  position: [-3.27, 0, 0.72] as [number, number, number],
  yaw: -Math.PI / 2,
  seatHeight: 0.575,
};
type Spot = [number, number];
/** Local positions (x, z) inside the room; the door wall is at +z. */
export const HOME_SPOTS = {
  spawn: [1.2, 1.6] as Spot,
  window: [-3.6, -4.4] as Spot,
  box: [4.6, -3.6] as Spot,
  bed: [0.2, -3.4] as Spot,
  door: [3.6, 4.4] as Spot,
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
