import { getActiveChannel, playerId, remoteStates } from "@/net/useWorldChannel";
import { createId } from "@/lib/id";
import { useNet } from "@/net/net-store";
import { useProfile } from "@/identity/profile-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { isTrafficHost, trafficAuthority } from "@/game/traffic/traffic-sync";
import { useReactiveWorld } from "@/game/reactive-world/store";
import { playCue } from "@/game/audio/sound-palette";
import {
  ANCHORS,
  DEFINITIONS,
  applyMissionAction,
  emptySession,
  offers,
  reconcileMission,
  finish,
  type MissionAction,
  type MissionRoom,
} from "./model";
import { commandSchema, roomSchema } from "./schema";
import { useMissions, sessionChanges, emitMissionSignal } from "./store";
let room = "",
  data: MissionRoom = { revision: 0, sessions: {} },
  pendingId = "",
  pendingAt = 0,
  lastPublish = 0;
const keys = new Map<string, string>(),
  offered = new Set<string>();
let lastSave = "",
  lastSelfKey = "";
export function missionSessionId() {
  const account = useProfile.getState().profile?.id ?? "guest";
  if (keys.has(account)) return keys.get(account)!;
  const storageKey = `tc-mission-session:${account}`;
  let id = "";
  try {
    id = sessionStorage.getItem(storageKey) ?? "";
  } catch {
    /* memory-only session */
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) id = createId();
  keys.set(account, id);
  try {
    sessionStorage.setItem(storageKey, id);
  } catch {
    /* unavailable storage */
  }
  return id;
}
function checkpoint() {
  const value = JSON.stringify(data);
  if (value === lastSave) return;
  lastSave = value;
  try {
    sessionStorage.setItem(`tc-missions-v1:${room}`, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    /* quota/private mode cannot break world */
  }
}
function showOwn() {
  const key = missionSessionId();
  const restoring = key !== lastSelfKey;
  lastSelfKey = key;
  const next = data.sessions[key] ?? emptySession();
  const old = useMissions.getState().session;
  if (JSON.stringify(next) !== JSON.stringify(old)) {
    if (!restoring) sessionChanges(old, next);
    const changed =
      next.active?.lastActionAt && next.active.lastActionAt !== old.active?.lastActionAt;
    const completed = next.last?.status === "COMPLETED" && old.last?.id !== next.last.id;
    if (changed && !restoring)
      playCue(
        next.active?.type === "STORE_RUSH_HELP_CASHIER"
          ? "scan"
          : next.active?.carrying
            ? "carton"
            : "tape",
      );
    if (completed && !restoring) {
      playCue(next.last!.type === "STORE_RUSH_HELP_CASHIER" ? "scan" : "tape");
      playCue("receipt");
      useHud
        .getState()
        .pushEvent(`✓ ${DEFINITIONS[next.last!.type].title} selesai · Kontribusi +1`, "system");
      useGame.getState().setToast("✓ Misi selesai · Kontribusi +1");
    } else if (!restoring && next.last && old.last?.id !== next.last.id)
      useHud
        .getState()
        .pushEvent(
          next.last.status === "EXPIRED"
            ? "Misi berakhir. Terima kasih sudah membantu."
            : "Misi dibatalkan.",
          "system",
        );
    useMissions.setState({
      session: next,
      pulseAt: changed || completed ? Date.now() : useMissions.getState().pulseAt,
    });
  }
  const available = offers(useReactiveWorld.getState().events, next);
  for (const offer of available)
    if (!offered.has(offer.sourceEventId)) {
      offered.add(offer.sourceEventId);
      emitMissionSignal({
        name: "mission_offered",
        missionId: `${offer.type}:${offer.sourceEventId}`,
        at: Date.now(),
        progress: 0,
      });
    }
  if (JSON.stringify(available) !== JSON.stringify(useMissions.getState().available))
    useMissions.setState({ available });
}
export function publishMissions(force = false) {
  if (!isTrafficHost() || (!force && Date.now() - lastPublish < 1000)) return;
  lastPublish = Date.now();
  void getActiveChannel()?.send({
    type: "broadcast",
    event: "mission_snapshot",
    payload: { host: playerId, at: Date.now(), room, data },
  });
}
export function handleMissionSnapshot(value: unknown) {
  const v = value as { host?: string; at?: number; room?: string; data?: unknown } | null;
  if (
    !v ||
    v.host === playerId ||
    v.host !== trafficAuthority() ||
    v.room !== room ||
    typeof v.at !== "number" ||
    Math.abs(Date.now() - v.at) > 30_000
  )
    return;
  const parsed = roomSchema.safeParse(v.data);
  if (!parsed.success) return;
  // A fresh elected room may have restarted while this tab was offline.
  // On reconnect its snapshot supersedes our browser checkpoint.
  const syncing = !useMissions.getState().ready;
  if (!syncing && parsed.data.revision < data.revision) return;
  if (
    !syncing &&
    parsed.data.revision === data.revision &&
    data.revision > 0 &&
    JSON.stringify(parsed.data) !== JSON.stringify(data)
  )
    return;
  data = parsed.data;
  checkpoint();
  showOwn();
  useMissions.setState({ ready: true });
}
export function handleMissionCommand(value: unknown) {
  if (!isTrafficHost()) return;
  const parsed = commandSchema.safeParse(value);
  if (!parsed.success) return;
  const command = parsed.data;
  const peer = useNet.getState().roster.find((p) => p.id === command.from);
  const id = command.from === playerId ? missionSessionId() : peer?.missionSession;
  if (!peer || !id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return;
  const old = data.sessions[id] ?? emptySession();
  let error = "";
  if (!data.sessions[id] && Object.keys(data.sessions).length >= 64)
    error = "Sesi bantuan sedang penuh. Coba lagi nanti.";
  else if (command.revision !== old.revision) error = "Status diperbarui. Silakan coba lagi.";
  else {
    const pose = remoteStates.get(command.from);
    const position =
      command.from === playerId
        ? useGame.getState().playerPos
        : pose
          ? [pose.x, pose.y, pose.z]
          : null;
    const result = applyMissionAction(
      old,
      command.action,
      command.sourceEventId,
      useReactiveWorld.getState().events,
      position,
      Date.now(),
    );
    error = result.error ?? "";
    if (result.session !== old) {
      data = { revision: data.revision + 1, sessions: { ...data.sessions, [id]: result.session } };
      checkpoint();
      showOwn();
    }
  }
  publishMissions(true);
  const reply = { host: playerId, to: command.from, requestId: command.requestId, error };
  if (command.from === playerId) handleMissionResult(reply);
  else
    void getActiveChannel()?.send({ type: "broadcast", event: "mission_result", payload: reply });
}
export function handleMissionResult(value: unknown) {
  const v = value as { host?: string; to?: string; requestId?: string; error?: unknown } | null;
  if (!v || v.host !== trafficAuthority() || v.to !== playerId || v.requestId !== pendingId) return;
  pendingId = "";
  useMissions.setState({
    pending: false,
    error: typeof v.error === "string" ? v.error.slice(0, 150) : "",
  });
}
export function requestMission(action: MissionAction, sourceEventId?: string) {
  if (pendingId || !useNet.getState().connected || !useMissions.getState().ready) {
    useMissions.setState({ error: "Tunggu koneksi dunia siap." });
    return;
  }
  pendingId = createId();
  pendingAt = Date.now();
  useMissions.setState({ pending: true, error: "" });
  const payload = {
    from: playerId,
    requestId: pendingId,
    revision: useMissions.getState().session.revision,
    action,
    ...(sourceEventId ? { sourceEventId } : {}),
  };
  if (isTrafficHost()) handleMissionCommand(payload);
  else void getActiveChannel()?.send({ type: "broadcast", event: "mission_command", payload });
}
export function missionInteraction() {
  const active = useMissions.getState().session.active;
  if (!active || active.expiresAt <= Date.now() || !useMissions.getState().ready) return null;
  const action: "scan" | "take" | "place" =
    active.type === "STORE_RUSH_HELP_CASHIER" ? "scan" : active.carrying ? "place" : "take";
  return { ...ANCHORS[action], kind: "mission" as const, action };
}
export function interactMission(id: string) {
  const anchor = missionInteraction();
  if (anchor?.id === id && useGame.getState().overlay === "none") requestMission(anchor.action);
}
export function expireOwnMissionForDebug() {
  if (!import.meta.env.DEV || !isTrafficHost()) return;
  const id = missionSessionId(),
    old = data.sessions[id];
  if (!old?.active) return;
  data = {
    revision: data.revision + 1,
    sessions: { ...data.sessions, [id]: finish(old, "EXPIRED", Date.now()) },
  };
  checkpoint();
  showOwn();
  publishMissions(true);
}
export function startMissions(nextRoom: string) {
  if (nextRoom !== room) {
    room = nextRoom;
    data = { revision: 0, sessions: {} };
    offered.clear();
    lastSave = "";
    try {
      const saved = JSON.parse(sessionStorage.getItem(`tc-missions-v1:${room}`) ?? "null");
      const parsed = roomSchema.safeParse(saved?.data);
      if (parsed.success && Date.now() - saved.savedAt < 7_200_000 && saved.savedAt <= Date.now())
        data = parsed.data;
    } catch {
      /* Invalid checkpoints start a clean mission session, not a broken world. */
    }
  }
  pendingId = "";
  useMissions.setState({ pending: false, ready: false, error: "" });
  showOwn();
  const tick = () => {
    if (document.hidden) return;
    try {
      const connected = useNet.getState().connected;
      if (!connected) useMissions.setState({ ready: false });
      if (connected && isTrafficHost()) {
        let changed = false;
        const sessions = { ...data.sessions };
        for (const [id, old] of Object.entries(sessions)) {
          const next = reconcileMission(old, useReactiveWorld.getState().events, Date.now());
          if (!next.active && Date.now() - next.updatedAt > 7_200_000) {
            delete sessions[id];
            changed = true;
          } else if (old !== next) {
            sessions[id] = next;
            changed = true;
          }
        }
        if (changed) {
          data = { revision: data.revision + 1, sessions };
          checkpoint();
        }
        useMissions.setState({ ready: true });
        publishMissions();
      }
      showOwn();
      if (pendingId && Date.now() - pendingAt > 4000) {
        pendingId = "";
        useMissions.setState({
          pending: false,
          error: "Belum ada konfirmasi. Periksa koneksi lalu coba lagi.",
        });
      }
    } catch {
      useMissions.setState({ error: "Misi sementara tidak tersedia. Dunia tetap berjalan." });
    }
  };
  tick();
  const timer = window.setInterval(tick, 500);
  document.addEventListener("visibilitychange", tick);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", tick);
    checkpoint();
    useMissions.setState({ ready: false });
  };
}
