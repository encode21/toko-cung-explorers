export interface CarryPair {
  id: string;
  carrier: string;
  passenger: string;
  status: "pending" | "active";
}
export interface MobilitySnapshot {
  canFly: boolean;
  flying: boolean;
  carries: CarryPair[];
}
/** Canonical rigidbody centre, behind the carrier's back; avatars share the same root scale. */
export function passengerPose(p: { x: number; y: number; z: number; ry: number }) {
  return {
    x: p.x - Math.sin(p.ry) * 0.38,
    y: p.y + 0.68,
    z: p.z - Math.cos(p.ry) * 0.38,
    ry: p.ry,
  };
}
export function activePair(pairs: CarryPair[], id: string) {
  return pairs.find((p) => p.status === "active" && (p.carrier === id || p.passenger === id));
}
