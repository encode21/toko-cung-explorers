import { create } from "zustand";
import type { Mission } from "./model";
import type { TruckState } from "./truck-model";
import { TRUCK_START } from "./truck-model";
export const useTruckRoom = create(() => ({ mission: null as Mission | null, owner: "" }));
/** The scene supplies collision queries; no simulation proceeds while physics is unavailable. */
export const truckPhysics = {
  blocked: (_t: TruckState): boolean => true,
  exit: (_t: TruckState): [number, number, number] | null => null,
};
export const renderedTruck = { ...TRUCK_START, ready: false };
