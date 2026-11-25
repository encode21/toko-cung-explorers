import type { Vec3 } from "../world/layout";
import type { BlueprintShape } from "./blueprint-geometry";
export type Finish =
  | "paint"
  | "autoPaint"
  | "autoGlass"
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
  | BlueprintShape
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
