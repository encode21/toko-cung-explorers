// The sole active game authority is Laravel. The previous Supabase RPC is retired.
import { worldRequest } from "@/services/world/client";
import type { GameSnapshot } from "./types";
export function gameCommand({
  data,
}: {
  data: {
    action: "read" | "pose" | "accept" | "objective" | "complete" | "cancel";
    requestId: string;
    questId?: string;
    runId?: string;
    objective?: number;
    revision?: number;
    position?: [number, number, number];
  };
}) {
  return worldRequest<GameSnapshot>("command", data);
}
