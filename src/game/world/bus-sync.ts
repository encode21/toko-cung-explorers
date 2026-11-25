import { createId } from "@/lib/id";
import { useNet } from "@/net/net-store";
import { getActiveChannel, playerId, refreshWorldPresence } from "@/net/useWorldChannel";
import { busPose, useBusRide, cancelBusRide } from "./bus-ride";
import { angleDelta } from "./bus-motion";
import {
  busBoarding,
  busSceneKey,
  busServiceCheckpoint,
  followBusService,
  restoreBusService,
  releaseBusBoarding,
  useBusService,
  type BusServiceScene,
} from "./bus-service";
import { validBusSnapshot, type BusSnapshot } from "./bus-protocol";

let scene = "",
  epoch = createId(),
  sequence = 0,
  lastSent = -Infinity,
  following = false;
let claim: { id: string; peer: string; scene: string; at: number } | null = null;
let request: {
  id: string;
  host: string;
  resolve: (ok: boolean) => void;
  timer: ReturnType<typeof setTimeout>;
} | null = null;
const snapshots = new Map<string, { snap: BusSnapshot; previous: BusSnapshot; at: number }>();
const retired = new Set<string>();
const ended = new Set<string>();
let applied: BusSnapshot | null = null;
export const busPresence = () => ({
  busScene: typeof document !== "undefined" && document.hidden ? "" : scene,
  busClaim: claim?.peer === playerId ? claim.id : undefined,
  busTripScene: claim?.peer === playerId ? claim.scene : undefined,
});
const send = (payload: unknown) =>
  void getActiveChannel()?.send({ type: "broadcast", event: "bus", payload });
function currentClaim() {
  if (!claim) {
    const rider = useNet
      .getState()
      .roster.find((p) => p.busClaim && !ended.has(p.busClaim) && p.busTripScene);
    if (rider)
      claim = {
        id: rider.busClaim!,
        peer: rider.id,
        scene: rider.busTripScene!,
        at: performance.now(),
      };
  }
  if (
    claim &&
    (performance.now() - claim.at > 5000 ||
      !useNet.getState().roster.some((p) => p.id === claim!.peer))
  ) {
    ended.add(claim.id);
    claim = null;
    useBusService.setState({ occupied: false });
  }
  return claim;
}
export function busDriver() {
  return currentClaim()?.peer ?? null;
}
function authority(area: string) {
  if (currentClaim()) return claim!.peer;
  return (
    useNet
      .getState()
      .roster.filter((p) => (p.id === playerId ? busPresence().busScene : p.busScene) === area)
      .sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0) || a.id.localeCompare(b.id))[0]?.id ??
    null
  );
}
function granted(id: string, peer: string, area: string) {
  claim = { id, peer, scene: area, at: performance.now() };
  useBusService.setState({ occupied: true });
  if (peer === playerId && request?.id === id) {
    clearTimeout(request.timer);
    request.resolve(true);
    request = null;
  }
  refreshWorldPresence();
}
export function handleBusMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return;
  const m = payload as Record<string, unknown>;
  if (typeof m["peer"] !== "string" || !useNet.getState().roster.some((p) => p.id === m["peer"]))
    return;
  if (m["type"] === "snapshot") {
    if (
      !validBusSnapshot(m) ||
      m["peer"] !== authority(m["scene"]) ||
      m["peer"] === playerId ||
      retired.has(m["epoch"])
    )
      return;
    const previous = snapshots.get(m["scene"]);
    if (previous?.snap.epoch === m["epoch"] && m["seq"] <= previous.snap.seq) return;
    if (previous && previous.snap.epoch !== m["epoch"]) retired.add(previous.snap.epoch);
    snapshots.set(m["scene"], { snap: m, previous: previous?.snap ?? m, at: performance.now() });
    if (claim?.peer === m["peer"]) claim.at = performance.now();
    return;
  }
  if (
    typeof m["id"] !== "string" ||
    m["id"].length > 120 ||
    typeof m["scene"] !== "string" ||
    m["scene"].length > 120
  )
    return;
  if (m["type"] === "request" && m["scene"] === scene && authority(scene) === playerId) {
    const stop = useBusService.getState().stop;
    if (claim || !stop || !busBoarding(stop).canBoard) {
      send({ type: "deny", peer: playerId, to: m["peer"], id: m["id"], scene });
    } else {
      send({ type: "grant", peer: playerId, to: m["peer"], id: m["id"], scene });
      granted(m["id"], m["peer"], scene);
    }
  } else if (
    m["type"] === "grant" &&
    m["peer"] === authority(m["scene"]) &&
    typeof m["to"] === "string" &&
    useNet.getState().roster.some((p) => p.id === m["to"]) &&
    !claim
  ) {
    const expiredRequest = m["to"] === playerId && request?.id !== m["id"];
    granted(m["id"], m["to"], m["scene"]);
    if (expiredRequest) releaseBusControl();
  } else if (
    m["type"] === "deny" &&
    m["to"] === playerId &&
    request?.id === m["id"] &&
    (request.host === m["peer"] || claim?.peer === m["peer"])
  ) {
    clearTimeout(request.timer);
    request.resolve(false);
    request = null;
  } else if (m["type"] === "release" && claim?.peer === m["peer"] && claim.id === m["id"]) {
    ended.add(claim.id);
    claim = null;
    useBusService.setState({ occupied: false });
  }
}
/** Reserve before payment, so two simultaneous taps cannot start two physical buses. */
export function claimBusControl(): Promise<boolean> {
  if (!useNet.getState().connected) return Promise.resolve(true);
  const host = authority(scene);
  if (!host || claim || request) return Promise.resolve(false);
  const id = createId();
  if (host === playerId) {
    send({ type: "grant", peer: playerId, to: playerId, id, scene });
    granted(id, playerId, scene);
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (request?.id === id) {
        request = null;
        resolve(false);
      }
    }, 3000);
    request = { id, host, resolve, timer };
    send({ type: "request", peer: playerId, id, scene });
  });
}
export function releaseBusControl() {
  if (claim?.peer !== playerId) return;
  send({ type: "release", peer: playerId, id: claim.id, scene: claim.scene });
  ended.add(claim.id);
  claim = null;
  useBusService.setState({ occupied: false });
  following = true;
  refreshWorldPresence();
}
export function resetBusSync() {
  if (request) {
    clearTimeout(request.timer);
    request.resolve(false);
    request = null;
  }
  claim = null;
  snapshots.clear();
  applied = null;
  retired.clear();
  ended.clear();
  following = false;
  epoch = createId();
  sequence = 0;
  lastSent = -Infinity;
  useBusService.setState({ occupied: false });
}
/** Only the elected peer advances motion. Observers interpolate the same pose without re-simulating collisions. */
export function followNetworkBus(service: BusServiceScene) {
  const key = busSceneKey(service) || (useBusRide.getState().riding ? scene : "");
  if (scene !== key) {
    scene = key;
    refreshWorldPresence();
  }
  if (!scene || !useNet.getState().connected) return false;
  const host = authority(scene),
    local = host === playerId;
  if (local) {
    if (following) {
      epoch = createId();
      sequence = 0;
      lastSent = -Infinity;
    }
    if (following && !useBusRide.getState().riding && service) {
      const latest = snapshots.get(scene)?.snap;
      if (latest) Object.assign(busPose, latest.pose);
      restoreBusService(service, latest && !latest.state.riding ? latest.service : null);
    }
    following = false;
    return false;
  }
  following = true;
  if (useBusRide.getState().riding) cancelBusRide();
  releaseBusBoarding();
  const frame = snapshots.get(scene);
  if (!frame || frame.snap.peer !== host || performance.now() - frame.at > 5000) {
    useBusRide.setState({ active: false, ready: false });
    useBusService.setState({ stop: null, boardingToken: "" });
    return true;
  }
  const { snap, previous } = frame;
  const t = Math.min(1, (performance.now() - frame.at) / 100);
  const interpolate =
    previous.pose.serial === snap.pose.serial &&
    Math.hypot(previous.pose.x - snap.pose.x, previous.pose.z - snap.pose.z) < 20;
  Object.assign(busPose, snap.pose);
  if (interpolate) {
    busPose.x = previous.pose.x + (snap.pose.x - previous.pose.x) * t;
    busPose.z = previous.pose.z + (snap.pose.z - previous.pose.z) * t;
    busPose.yaw = previous.pose.yaw + angleDelta(previous.pose.yaw, snap.pose.yaw) * t;
    busPose.wheelAngle =
      previous.pose.wheelAngle + (snap.pose.wheelAngle - previous.pose.wheelAngle) * t;
  }
  if (applied !== snap) {
    applied = snap;
    useBusRide.setState({ ...snap.state, riding: false, fade: 0 });
    followBusService(
      snap.state.riding
        ? { ...snap.service, stop: null, window: null, arrivalId: "" }
        : snap.service,
    );
  }
  return true;
}
export function publishBus(force = false) {
  if (!scene || !useNet.getState().connected || authority(scene) !== playerId) return;
  const now = performance.now();
  if (!force && now - lastSent < 100) return;
  lastSent = now;
  if (claim?.peer === playerId) claim.at = now;
  const { fade: _, ...state } = useBusRide.getState();
  const snap: BusSnapshot = {
    type: "snapshot",
    peer: playerId,
    scene,
    epoch,
    seq: ++sequence,
    pose: { ...busPose },
    state,
    service: busServiceCheckpoint(),
  };
  snapshots.set(scene, { snap, previous: snap, at: now });
  send(snap);
}
