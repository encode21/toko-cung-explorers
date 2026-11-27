import type { HouseFit } from "@/game/gang/architecture";

export const WARUNG_DOOR = {
  width: 2.2,
  height: 3.15,
  base: 0.08,
  front: 6.3,
  approach: 4.5,
} as const;

export const lotFit = (width: number, depth: number): HouseFit => ({
  width: width - 0.6,
  depth: depth - 0.6,
  teras: 0.45,
});

/** The same door plane drives geometry, proximity and the player's entrance walk. */
export function warungDoorFront(fit?: HouseFit) {
  return fit ? fit.depth / 2 - 0.3 + (WARUNG_DOOR.front - 2.5) * fit.teras : WARUNG_DOOR.front;
}

export function warungBuildingHeight(level: number) {
  return level === 3 ? 6.2 : level === 5 ? 5.5 : level > 0 ? 4.5 : 3.4;
}

export const WARUNG_SIGN = { titleY: 4.84, detailY: 4.39, centerY: 4.65, front: 7.42 } as const;

/** A single central doorway, with solid display walls on both sides. */
export function warungFacadePanels(width: number) {
  const half = Math.min(width / 2 - 0.25, 4.3);
  return [-1, 1].map((side) => ({ x: (side * (1.25 + half)) / 2, width: half - 1.25 }));
}

/** Shared enclosure dimensions keep the rendered walls/roof and physics joined to the house. */
export function warungEnvelope(width: number, level: number, fit?: HouseFit) {
  const front = warungDoorFront(fit);
  const bodyFront = fit ? fit.depth / 2 - 0.3 : level === 5 ? 3.5 : 2.5;
  const back = bodyFront - 0.12;
  const roofBack = bodyFront - 0.28;
  const roofEdge = front + 1.5 * (fit?.teras ?? 1);
  const backY = Math.min(warungBuildingHeight(level) - 0.08, 4.45);
  const edgeY = 3.72;
  const slope = Math.atan2(backY - edgeY, roofEdge - roofBack);
  return {
    front,
    back,
    half: Math.min(width / 2 - 0.25, 4.3),
    roofBack,
    roofEdge,
    backY,
    edgeY,
    slope,
    roofLength: Math.hypot(roofEdge - roofBack, backY - edgeY),
    roofY: (backY + edgeY) / 2,
    roofZ: (roofBack + roofEdge) / 2,
  };
}
