import { create } from "zustand";
import { useGameUi } from "../../state/game-ui-store.ts";

export type LoaderArt =
  "bus" | "rumah" | "gang" | "warung" | "grosir" | "usaha" | "kota" | "gunung" | "klub" | "misi";
export type TravelPhase = "cover" | "releasing" | "mounting" | "ready";
type Loader = {
  id: number;
  title: string;
  subtitle: string;
  art: LoaderArt;
  since: number;
  minMs: number;
  phase: TravelPhase;
  mode: "notice" | "request" | "scene";
};
export interface TravelPlace {
  key: string;
  art: LoaderArt;
  title: string;
  revision: number;
}
export const useLoader = create<{ loader: Loader | null; commit: number }>(() => ({
  loader: null,
  commit: 0,
}));
export const useTravelScene = create<{
  mounted: TravelPlace | null;
  target: TravelPlace | null;
  ready: boolean;
  revision: number;
}>(() => ({ mounted: null, target: null, ready: false, revision: 0 }));

useLoader.subscribe((state, before) => {
  if (Boolean(state.loader) !== Boolean(before.loader))
    useGameUi.setState({ traveling: Boolean(state.loader) });
});

export const LOADER_TIMEOUT_MS = 15_000;
let sequence = 0;
let request: Loader | null = null;
let committedRequest: Loader | null = null;
let requestDeadline: ReturnType<typeof setTimeout> | undefined;
let fault: (() => void) | null = null;
function forgetRequest() {
  request = null;
  clearTimeout(requestDeadline);
  requestDeadline = undefined;
}
let frame = 0;
let stopSceneDeadline: (() => void) | undefined;
let completion: ReturnType<typeof setTimeout> | undefined;

/** Background tabs suspend animation frames, so only count time the scene can actually render. */
function watchSceneDeadline(expire: () => void) {
  let remaining = LOADER_TIMEOUT_MS;
  let started = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const page = typeof document === "undefined" ? undefined : document;
  function update() {
    if (page?.hidden) {
      if (timer !== undefined) {
        clearTimeout(timer);
        remaining = Math.max(0, remaining - (Date.now() - started));
        timer = undefined;
      }
    } else if (timer === undefined) {
      started = Date.now();
      timer = setTimeout(expire, remaining);
    }
  }
  page?.addEventListener("visibilitychange", update);
  update();
  return () => {
    clearTimeout(timer);
    page?.removeEventListener("visibilitychange", update);
  };
}

function cancelScheduled() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  stopSceneDeadline?.();
  stopSceneDeadline = undefined;
  clearTimeout(completion);
  completion = undefined;
}
function current(id: number) {
  const loader = useLoader.getState().loader;
  return loader?.id === id ? loader : null;
}
function dismiss(id: number) {
  if (!current(id)) return;
  cancelScheduled();
  fault = null;
  useLoader.setState({ loader: request?.mode === "request" ? request : null });
}
function begin(
  title: string,
  subtitle: string,
  art: LoaderArt,
  minMs: number,
  mode: Loader["mode"],
  since = Date.now(),
) {
  cancelScheduled();
  const loader: Loader = {
    id: ++sequence,
    title,
    subtitle,
    art,
    minMs,
    since,
    phase: "cover",
    mode,
  };
  useLoader.setState({ loader });
  return loader;
}
function finishAfterMinimum(loader: Loader) {
  clearTimeout(completion);
  completion = setTimeout(
    () => dismiss(loader.id),
    Math.max(0, loader.minMs - (Date.now() - loader.since)),
  );
}
/** Timed narrative card (sleep/wake). An actual location change adopts it during the same action. */
export function showLoader(title: string, subtitle: string, art: LoaderArt, minMs = 1400) {
  const active = useLoader.getState().loader;
  if (active && active.mode !== "notice") return active.id;
  const loader = begin(title, subtitle, art, minMs, "notice");
  finishAfterMinimum(loader);
  return loader.id;
}
export function beginTravelRequest(title: string, subtitle: string, art: LoaderArt, minMs = 650) {
  forgetRequest();
  committedRequest = null;
  // A new API request can supersede another without interrupting a scene already being mounted.
  const active = useLoader.getState().loader;
  const loader: Loader =
    active?.mode === "scene"
      ? {
          id: ++sequence,
          title,
          subtitle,
          art,
          minMs,
          since: Date.now(),
          phase: "cover",
          mode: "request",
        }
      : begin(title, subtitle, art, minMs, "request");
  request = loader;
  requestDeadline = setTimeout(() => cancelTravelRequest(loader.id), LOADER_TIMEOUT_MS);
  return loader.id;
}
export function travelRequestCurrent(id: number) {
  return request?.id === id;
}
export function cancelTravelRequest(id: number) {
  if (!travelRequestCurrent(id)) return;
  forgetRequest();
  if (current(id)?.mode === "request") dismiss(id);
}
export function travelRequestPending() {
  return request !== null;
}
export function finishTravelRequest(id: number) {
  if (!travelRequestCurrent(id)) return;
  committedRequest = request;
  forgetRequest();
  useLoader.setState({ commit: id });
  // The coordinator adopts a real destination on the next microtask. A successful
  // request to the current spot only needs its original card's minimum duration.
  queueMicrotask(() => {
    if (committedRequest?.id === id) committedRequest = null;
    const loader = current(id);
    if (loader?.mode === "request") finishAfterMinimum(loader);
  });
}

export function startTravelRuntime(place: TravelPlace) {
  useTravelScene.setState({
    mounted: place,
    target: place,
    ready: false,
    revision: place.revision,
  });
}
export function stopTravelRuntime() {
  committedRequest = null;
  cancelScheduled();
  forgetRequest();
  fault = null;
  useLoader.setState({ loader: null });
  useTravelScene.setState({ mounted: null, target: null, ready: false, revision: 0 });
}

export function prepareScene(place: TravelPlace, recover: () => void) {
  const { mounted } = useTravelScene.getState();
  const previous = committedRequest ?? useLoader.getState().loader;
  committedRequest = null;
  const adopt = previous && previous.mode !== "scene" && previous.art === place.art;
  const loader = begin(
    adopt ? previous.title : place.title,
    adopt ? previous.subtitle : "",
    place.art,
    adopt ? previous.minMs : 650,
    "scene",
    adopt ? previous.since : Date.now(),
  );
  useTravelScene.setState({ target: place });
  fault = () => {
    if (!current(loader.id)) return;
    dismiss(loader.id);
    recover();
  };
  stopSceneDeadline = watchSceneDeadline(fault);
  // Give the DOM a complete paint before React/Rapier starts disposing or building a location.
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!current(loader.id)) return;
      const release = !mounted || mounted.key !== place.key;
      useLoader.setState({ loader: { ...loader, phase: release ? "releasing" : "mounting" } });
      if (release) useTravelScene.setState({ mounted: null, ready: false });
    });
  });
}

/** Called by the empty R3F subtree after React has removed the old scene and colliders. */
export function sceneReleased(id: number) {
  if (current(id)?.phase !== "releasing" || frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const loader = current(id);
    const target = useTravelScene.getState().target;
    if (loader?.phase !== "releasing" || !target) return;
    useLoader.setState({ loader: { ...loader, phase: "mounting" } });
    useTravelScene.setState({ mounted: target, revision: target.revision });
  });
}
/** The marker is inside the destination Suspense boundary and runs after Rapier's bodies mount. */
export function markLocationReady(key: string) {
  const scene = useTravelScene.getState();
  if (scene.mounted?.key !== key || scene.target?.key !== key) return false;
  if (!scene.ready) useTravelScene.setState({ ready: true });
  return true;
}
export function sceneRendered(id: number, key: string, teleportPending: boolean) {
  const loader = current(id);
  const scene = useTravelScene.getState();
  if (loader?.mode !== "scene" || scene.mounted?.key !== key || scene.target?.key !== key) return;
  if (loader.phase === "mounting") {
    useLoader.setState({ loader: { ...loader, phase: "ready" } });
    return;
  }
  if (loader.phase === "ready" && !teleportPending && completion === undefined) {
    finishAfterMinimum(loader);
  }
}
export function sceneFailed(key: string) {
  if (useTravelScene.getState().target?.key === key) fault?.();
}
export function travelBlocksTeleport() {
  const loader = useLoader.getState().loader;
  const scene = useTravelScene.getState();
  return Boolean(
    request ||
    (scene.target && !scene.ready) ||
    (loader?.mode === "scene" && loader.phase !== "ready"),
  );
}

export const LOADER_TIPS = [
  "Tips: Banjir bikin jalan lambat, cari jalan yang lebih tinggi.",
  "Tips: Bus ke Gang Kampung berangkat dari halte samping gerbang.",
  "Tips: Kulakan di Toko Cung bisa bayar QRIS, transfer, atau VA lewat CNG Bank.",
  "Tips: Sapa tetangga di gang, siapa tahu ada titipan.",
  "Tips: Tidur di rumah setelah warung tutup biar besok segar.",
  "Tips: Pas hujan, warga suka ngumpul di warung. Siapin stok kopi!",
];
