import { worldRequest as fixtureRequest } from "../obby/client";
import { BUS_TIMETABLE } from "@/game/world/bus-timetable";
export { onAccountExpired, WorldApiError } from "../obby/client";
export async function worldRequest(operation: string, data: any) {
  if (operation === "bus" && data.action === "read")
    return { serverNow: (window as any).busServerTime ?? 1000, timetable: BUS_TIMETABLE };
  return fixtureRequest(operation, data);
}
