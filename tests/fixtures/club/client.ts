let state: any = {
  roomId: "CHANNEL-01",
  provider: "mock",
  mediaId: null,
  playbackStatus: "stopped",
  startedAt: null,
  positionSeconds: 0,
  queueVersion: 0,
  activeDjId: null,
  revision: 0,
  lighting: "neon",
  queue: [],
  requests: [],
  waiting: [],
  members: {
    bob: {
      name: "Budi",
      dance: { id: "disco", startedAt: Date.now(), groupId: "bob" },
      expiresAt: Date.now() + 999999,
    },
    ani: {
      name: "Ani",
      dance: { id: "shuffle", startedAt: Date.now(), groupId: "ani" },
      expiresAt: Date.now() + 999999,
    },
  },
};
export function onAccountExpired() {}
export async function worldRequest(op: string, d: any) {
  if (op !== "club") return {};
  const id = d.connectionId;
  if (d.action === "enter")
    state.members[id] = { name: "Koko", dance: null, expiresAt: Date.now() + 999999 };
  if (d.action === "apply") state.activeDjId = id;
  if (d.action === "dance")
    state.members[id].dance = { id: d.danceId, startedAt: Date.now(), groupId: id };
  if (d.action === "stop-dance") state.members[id].dance = null;
  if (d.action === "sync") state.members[id].dance = state.members[d.target].dance;
  if (d.action === "lighting") state.lighting = d.lighting;
  if (d.action === "request")
    state.requests.push({ id: crypto.randomUUID(), mediaId: d.mediaId, from: id });
  if (d.action === "accept") {
    state.queue.push(state.requests.find((r: any) => r.id === d.id));
    state.requests = state.requests.filter((r: any) => r.id !== d.id);
  }
  if (d.action === "reorder")
    state.queue = d.order.map((id: string) => state.queue.find((r: any) => r.id === id));
  if (d.action === "play") {
    state.mediaId = state.queue.shift()?.mediaId ?? null;
    state.playbackStatus = "playing";
    state.startedAt = Date.now();
  }
  if (d.action === "exit") delete state.members[id];
  state.revision++;
  state.serverNow = Date.now();
  return structuredClone(state);
}
export class WorldApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
