/** The scene owns Rapier; the ride clock stays alive while scene assets are loading. */
export const busCollision: {
  blocked: ((pose: { x: number; z: number; yaw: number }) => boolean) | null;
} = { blocked: null };
export const BUS_TRAFFIC_ID = "transjakarta-ride";
