import type { AssetPart } from "@/game/assets/parts";
import type { Vec3 } from "../layout";
export type PropKind =
  | "cart"
  | "parcels"
  | "crate"
  | "trolley"
  | "bin"
  | "cone"
  | "bag"
  | "tape"
  | "wheel-stop"
  | "utility"
  | "cage"
  | "pallet-jack";
export interface ActivityProp {
  id: string;
  kind: PropKind;
  zone: string;
  position: Vec3;
  assetUrl?: string;
}
/** Replace a visual with assetUrl later; placement and collision stay stable. */
export const ACTIVITY_PROPS: ActivityProp[] = [
  { id: "loading-cage", kind: "cage", zone: "delivery", position: [-8.6, 0, -24.9] },
  { id: "loading-pallet-jack", kind: "pallet-jack", zone: "delivery", position: [-2.8, 0, -26] },
  { id: "customer-cart", kind: "cart", zone: "retail", position: [-8.1, 0, 0] },
  { id: "checkout-bag", kind: "bag", zone: "cashier", position: [6.8, 1.07, 1.1] },
  { id: "stock-crates", kind: "crate", zone: "warehouse", position: [-7.6, 0, -17.2] },
  { id: "warehouse-parcels", kind: "parcels", zone: "warehouse", position: [-7.3, 0, -14.8] },
  { id: "warehouse-trolley", kind: "trolley", zone: "warehouse", position: [-8, 0, -19] },
  { id: "packing-tape", kind: "tape", zone: "warehouse", position: [-4.15, 0.89, -16.1] },
  { id: "pickup-parcels", kind: "parcels", zone: "delivery", position: [12.8, 0, 10.5] },
  { id: "pickup-trolley", kind: "trolley", zone: "delivery", position: [14.1, 0, 9.6] },
  { id: "pickup-cone", kind: "cone", zone: "delivery", position: [15.2, 0, 10.4] },
  { id: "front-bin", kind: "bin", zone: "street", position: [6.5, 0, 12.3] },
  { id: "parking-stop-a", kind: "wheel-stop", zone: "street", position: [-10.25, 0, 5.1] },
  { id: "parking-stop-b", kind: "wheel-stop", zone: "street", position: [-7.75, 0, 5.1] },
  { id: "utility-box", kind: "utility", zone: "street", position: [17.8, 0, -7] },
];
export const PROP_SIZES: Record<PropKind, Vec3> = {
  cage: [0.8, 1.5, 0.8],
  "pallet-jack": [0.7, 1.2, 1.5],
  cart: [0.7, 0.95, 1],
  parcels: [1, 1.05, 0.8],
  crate: [0.8, 1.05, 0.7],
  trolley: [0.55, 1.2, 0.55],
  bin: [0.5, 0.85, 0.5],
  cone: [0.4, 0.65, 0.4],
  bag: [0.28, 0.42, 0.2],
  tape: [0.18, 0.1, 0.18],
  "wheel-stop": [1.5, 0.12, 0.18],
  utility: [0.65, 1.3, 0.45],
};
export function propParts(kind: PropKind): AssetPart[] {
  const out: AssetPart[] = [];
  const add = (p: Vec3, s: Vec3, color: string, extra: Partial<AssetPart> = {}) =>
    out.push({ p, s, color, ...extra });
  const metal = "#73858a",
    carton = "#bda078";
  const wheel = (x: number, z: number) =>
    add([x, 0.13, z], [0.16, 0.06, 0.16], "#344348", {
      shape: "cylinder",
      rz: Math.PI / 2,
      finish: "rubber",
    });
  if (kind === "parcels") {
    for (const x of [-0.4, 0, 0.4])
      add([x, 0.05, 0], [0.16, 0.1, 0.78], "#887358", { finish: "wood" });
    for (const z of [-0.31, -0.1, 0.1, 0.31])
      add([0, 0.13, z], [1, 0.055, 0.15], "#ab906d", { finish: "wood" });
    for (let i = 0; i < 3; i++) {
      const x = i === 2 ? 0.05 : i ? 0.25 : -0.25,
        y = i === 2 ? 0.81 : 0.385,
        h = i === 2 ? 0.38 : 0.44;
      add([x, y, 0], [i === 2 ? 0.68 : 0.46, h, 0.65], i === 1 ? "#b28c60" : carton, {
        finish: "cardboard",
        ry: i === 2 ? 0.05 : 0,
      });
      add([x, y, 0.329], [0.18, 0.12, 0.009], "#f0ebdb", { shape: "box", finish: "cardboard" });
      add([x, y + h / 2 + 0.005, 0], [0.045, 0.008, 0.65], "#d9c39c", { shape: "box" });
      add([x, y - 0.08, 0.335], [0.13, 0.014, 0.006], "#6a675f", { shape: "box" });
    }
  } else if (kind === "cart" || kind === "cage") {
    const cage = kind === "cage",
      w = cage ? 0.72 : 0.62,
      d = cage ? 0.72 : 0.85,
      base = cage ? 0.18 : 0.4,
      top = cage ? 1.45 : 0.87;
    add([0, base, 0], [w, 0.05, d], metal, { finish: "metal" });
    for (const x of [-w / 2, w / 2]) {
      for (const z of [-d / 2, d / 2]) {
        wheel(x, z);
        add([x, (base + 0.16) / 2, z], [0.035, base - 0.16, 0.035], metal, { finish: "metal" });
        add([x, (top + base) / 2, z], [0.028, top - base, 0.028], metal, { finish: "metal" });
      }
      for (let y = base + 0.14; y <= top; y += 0.16)
        add([x, y, 0], [0.022, 0.022, d], metal, { finish: "metal" });
      for (const z of [-0.2, 0, 0.2])
        add([x, (top + base) / 2, z], [0.02, top - base, 0.02], metal, { finish: "metal" });
    }
    for (const z of [-d / 2, d / 2])
      for (let y = base + 0.14; y <= top; y += 0.16)
        add([0, y, z], [w, 0.02, 0.02], metal, { finish: "metal" });
    add([0, top, -d / 2], [w + 0.04, 0.055, 0.055], "#b44249", { finish: "plastic" });
    add([0, base + 0.16, 0], [0.4, 0.27, 0.38], carton, { finish: "cardboard" });
  } else if (kind === "trolley" || kind === "pallet-jack") {
    const jack = kind === "pallet-jack";
    for (const x of [-0.22, 0.22]) {
      wheel(x, jack ? -0.5 : -0.15);
      add([x, 0.15, jack ? 0.08 : 0.08], [jack ? 0.18 : 0.05, 0.08, jack ? 1.25 : 0.45], "#bd5550");
      if (!jack) add([x, 0.64, -0.2], [0.035, 1.04, 0.035], metal, { finish: "metal" });
    }
    if (jack) {
      add([0, 0.3, -0.48], [0.58, 0.3, 0.36], "#bd5550");
      add([0, 0.71, -0.56], [0.055, 0.9, 0.055], metal, { rx: -0.15, finish: "metal" });
    } else add([0, 0.15, 0.06], [0.55, 0.07, 0.45], metal, { finish: "metal" });
    add([0, 1.13, jack ? -0.63 : -0.2], [0.47, 0.1, 0.08], "#3c4e55", { finish: "rubber" });
  } else if (kind === "crate") {
    for (let i = 0; i < 3; i++) {
      const y = i * 0.34,
        c = i % 2 ? "#587f75" : "#627f95";
      add([0, y + 0.06, 0], [0.78, 0.07, 0.68], c, { finish: "plastic" });
      for (const side of [-1, 1]) {
        add([side * 0.36, y + 0.18, 0], [0.055, 0.23, 0.68], c, { finish: "plastic" });
        for (const dy of [0.11, 0.2, 0.29])
          add([0, y + dy, side * 0.31], [0.72, 0.045, 0.055], c, { finish: "plastic" });
      }
    }
  } else if (kind === "cone") {
    add([0, 0.045, 0], [0.4, 0.09, 0.4], "#424c4e", { finish: "rubber" });
    add([0, 0.35, 0], [0.28, 0.55, 0.28], "#cf8049", { shape: "cone", finish: "plastic" });
    add([0, 0.39, 0], [0.168, 0.1, 0.168], "#eee6ce", { shape: "cone" });
  } else if (kind === "tape") {
    add([0, 0.05, 0], [0.18, 0.18, 0.3], "#d1b581", {
      shape: "ring",
      rx: Math.PI / 2,
      finish: "cardboard",
    });
  } else if (kind === "bag") {
    add([0, 0.16, 0], [0.28, 0.32, 0.2], "#d2bf9d", { finish: "cardboard" });
    add([0, 0.34, 0], [0.15, 0.15, 0.06], "#a28b69", { shape: "ring", finish: "fabric" });
    add([0, 0.18, 0.104], [0.13, 0.07, 0.007], "#bd5550", { shape: "box" });
  } else if (kind === "wheel-stop") {
    add([0, 0.06, 0], [1.5, 0.12, 0.18], "#788681", { finish: "concrete" });
    for (const x of [-0.5, 0.5]) add([x, 0.12, 0], [0.22, 0.01, 0.16], "#dbbd72", { shape: "box" });
  } else {
    const size = PROP_SIZES[kind],
      bin = kind === "bin";
    add([0, size[1] / 2, 0], size, bin ? "#54736e" : "#95a2a1", {
      finish: bin ? "plastic" : "metal",
    });
    add(
      [0, size[1] - 0.06, 0],
      [size[0] * 1.03, 0.09, size[2] * 1.03],
      bin ? "#3b5657" : "#7c898b",
    );
    if (bin) add([0, 0.65, 0.255], [0.32, 0.1, 0.015], "#243b41");
    else
      for (let i = 0; i < 4; i++)
        add([0, 0.8 + i * 0.09, 0.231], [0.4, 0.025, 0.012], "#687e82", { shape: "box" });
  }
  return out;
}
