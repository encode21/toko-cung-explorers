import type { Vec3 } from "../world/layout";
export type Finish =
  | "paint"
  | "metal"
  | "glass"
  | "window"
  | "cardboard"
  | "plastic"
  | "wood"
  | "rubber"
  | "concrete"
  | "fabric";
export type Shape =
  | "bevel"
  | "coach"
  | "box"
  | "cylinder"
  | "cone"
  | "ring"
  | "dome"
  | "sphere"
  | "hood"
  | "arch"
  | "sideWindow"
  | "mpvPanel"
  | "mpvHood"
  | "mpvRoof"
  | "mpvFrontWindow"
  | "truckCab";
export interface AssetPart {
  p: Vec3;
  s: Vec3;
  color: string;
  shape?: Shape;
  finish?: Finish;
  rx?: number;
  ry?: number;
  rz?: number;
}
