import type { Vec3 } from "@/game/world/layout";

export const KIOSK = {
  id: "iware-kiosk",
  label: "Papan Kerja Sambilan",
  // Inside the front retail area, clear of the doorway and cashier queue.
  position: [2.2, 0.06, 0.5] as Vec3,
  yaw: Math.PI,
  radius: 2,
  url: "https://kiosk.tokocung.com/",
};
