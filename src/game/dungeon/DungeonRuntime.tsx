import { useEffect } from "react";
import { useChannels } from "@/net/channel-store";
import { dungeonCommand, useDungeon } from "./store";

export function DungeonRuntime() {
  const room = useChannels((s) => s.lease?.channel);
  useEffect(() => {
    if (!room) return;
    // Hub browse: soft read (no sticky error). Resume only when rejoining a DNG room.
    const inDungeon = room.startsWith("DNG-");
    void dungeonCommand(inDungeon && !useDungeon.getState().data ? "resume" : "read");
    let ticks = 0;
    const timer = setInterval(() => {
      const state = useDungeon.getState();
      if (state.busy) return;
      const active = state.data?.instance?.status === "ACTIVE";
      const roomMismatch =
        !!state.data?.instance &&
        (state.data.instance.currentRoom ?? state.data.instance.room) !==
          useChannels.getState().lease?.channel;
      if (roomMismatch) {
        void dungeonCommand("resume");
        return;
      }
      // In-instance: keep pose hot. Hub-only: poll ~10s to avoid Laravel lock storms.
      if (active) void dungeonCommand("pose");
      else if (++ticks % 4 === 0) void dungeonCommand("read");
    }, 2500);
    return () => clearInterval(timer);
  }, [room]);
  return null;
}
