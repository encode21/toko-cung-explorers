import { useEffect } from "react";
import { useProfile } from "@/identity/profile-store";
import { useGame } from "@/state/game-store";
import { incidentTrafficZones } from "@/game/traffic/traffic-runtime";
import { INCIDENT_TITLES } from "./model";
import {
  fetchIncidents,
  incidentNow,
  syncIncidentClock,
  tickIncidents,
  useIncidents,
} from "./store";

export function IncidentRuntime() {
  const account = useProfile((s) => s.profile?.id);
  useEffect(() => {
    if (!account) return;
    let disposed = false,
      reading = false;
    const announced = new Set<string>();
    const tick = () => {
      tickIncidents();
      const event = useIncidents.getState().visible;
      incidentTrafficZones.clear();
      if (
        event &&
        (event.type === "red-light-crash" || event.type === "motorcycle-fall") &&
        incidentNow() < event.startsAt + 26000
      )
        incidentTrafficZones.set(event.id, {
          x: event.at[0],
          z: event.at[2],
          dx: 1,
          dz: 0,
          speed: 0,
          halfLength: 18,
          halfWidth: 7,
        });
      if (event && !announced.has(event.id) && !document.hidden) {
        announced.add(event.id);
        useGame
          .getState()
          .setToast(
            INCIDENT_TITLES[event.type] + " · " + event.location + ". Lihat penanda merah di peta!",
          );
      }
    };
    const refresh = async () => {
      if (reading || document.hidden) return;
      reading = true;
      try {
        const result = await fetchIncidents();
        if (disposed) return;
        syncIncidentClock(result.serverNow, result.roundTrip);
        useIncidents.setState({ events: result.incidents });
        tick();
      } catch {
        /* Keep the last server schedule; reconnect retries without inventing events. */
      } finally {
        reading = false;
      }
    };
    const resume = () => {
      void refresh();
      tick();
    };
    void refresh();
    const poll = window.setInterval(() => void refresh(), 60000);
    const timer = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    return () => {
      disposed = true;
      clearInterval(poll);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      incidentTrafficZones.clear();
      useIncidents.setState({ events: [], active: null, visible: null });
    };
  }, [account]);
  return null;
}
