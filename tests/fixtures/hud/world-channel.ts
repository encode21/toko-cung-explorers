import type { RealtimeChannel } from "@supabase/supabase-js";
import { useNet } from "@/net/net-store";

export * from "../../../src/net/useWorldChannel";

type ChatFixture = Window & {
  chatSendCalls?: unknown[];
  chatSendStatus?: "ok" | "error" | "timed out" | "throw";
  chatSendDelay?: number;
};

/** Keep the real sendChat validation while replacing only its room transport. */
const channel = {
  state: "joined",
  async send(message: unknown) {
    const fixture = window as ChatFixture;
    (fixture.chatSendCalls ??= []).push(structuredClone(message));
    const status = fixture.chatSendStatus ?? "ok";
    if (fixture.chatSendDelay)
      await new Promise((resolve) => window.setTimeout(resolve, fixture.chatSendDelay));
    if (status === "throw") throw new Error("Fixture transport disconnected");
    return status;
  },
} as unknown as RealtimeChannel;

export const getActiveChannel = () => (useNet.getState().connected ? channel : null);
