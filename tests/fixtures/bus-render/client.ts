import { worldRequest as fixtureRequest } from "../obby/client";
import { busNow } from "@/game/world/bus-service";
import { BUS_TIMETABLE } from "@/game/world/bus-timetable";
export { onAccountExpired, WorldApiError } from "../obby/client";
export async function worldRequest(operation: string, data: any) {
  if (operation === "bus" && data.action === "read")
    return { serverNow: (window as any).busServerTime ?? 1000, timetable: BUS_TIMETABLE };
  if (operation === "bus" && data.action === "arrive")
    return { arrivalAt: busNow(), departureAt: busNow() + 20000, boardingToken: "fixture" };
  return fixtureRequest(operation, data);
}
