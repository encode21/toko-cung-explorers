import { create } from "zustand";
import { worldRequest } from "@/services/world/client";
import { type Incident, liveIncident, visibleIncident } from "./model";

export const useIncidents = create<{
  events: Incident[];
  active: Incident | null;
  visible: Incident | null;
}>(() => ({ events: [], active: null, visible: null }));
let serverAt = 0,
  measuredAt = 0;
export const incidentNow = () =>
  serverAt ? serverAt + performance.now() - measuredAt : Date.now();
export function syncIncidentClock(now: number, roundTrip: number) {
  serverAt = now + roundTrip / 2;
  measuredAt = performance.now();
}
export async function fetchIncidents() {
  const start = performance.now();
  const result = await worldRequest<{ serverNow: number; incidents: Incident[] }>("incidents");
  return { ...result, roundTrip: performance.now() - start };
}
export function tickIncidents() {
  const { events } = useIncidents.getState();
  useIncidents.setState({
    active: liveIncident(events, incidentNow()),
    visible: visibleIncident(events, incidentNow()),
  });
}
