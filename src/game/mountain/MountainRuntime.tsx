import { tickSummitTracking } from "./leaderboard";
import { useEffect } from "react";
import { useChannels } from "@/net/channel-store";
import {
  HELICOPTER_FLIGHT_MS,
  finishHelicopterFlight,
  resetMountainSession,
  useMountain,
} from "./store";

/** Timer lifetime is scoped to the active room, including logout and channel switches. */
export function MountainRuntime() {
  const playing = useChannels((s) => s.playing);
  const room = useChannels((s) => s.lease?.channel);
  const flight = useMountain((s) => s.flight);
  useEffect(() => {
    if (!playing) resetMountainSession();
    return resetMountainSession;
  }, [playing, room]);
  useEffect(() => {
    if (!flight || !playing) return;
    const timer = window.setTimeout(
      () => finishHelicopterFlight(flight),
      Math.max(0, HELICOPTER_FLIGHT_MS - (Date.now() - flight.startedAt)),
    );
    return () => window.clearTimeout(timer);
  }, [flight, playing]);
  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      const state = useMountain.getState();
      tickSummitTracking(state.checkpoint, !!state.flight);
    };
    tick();
    const timer = window.setInterval(tick, 1500);
    return () => window.clearInterval(timer);
  }, [playing, room]);
  return null;
}
