import { useEffect } from "react";
import { useChannels } from "@/net/channel-store";
import { dungeonCommand, useDungeon } from "./store";
export function DungeonRuntime() {
  const room = useChannels((s) => s.lease?.channel);
  useEffect(() => {
    if (!room) return;
    // Server remembers active membership across page reloads and reconnects.
    void dungeonCommand(useDungeon.getState().data ? "read" : "resume");
    const timer = setInterval(() => {
      const state = useDungeon.getState();
      if (state.busy) return;
      if (
        state.data?.instance &&
        (state.data.instance.currentRoom ?? state.data.instance.room) !==
          useChannels.getState().lease?.channel
      )
        void dungeonCommand("resume");
      else void dungeonCommand(state.data?.instance?.status === "ACTIVE" ? "pose" : "read");
    }, 2500);
    return () => clearInterval(timer);
  }, [room]);
  return null;
}
