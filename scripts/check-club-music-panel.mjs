/** Exercise real music-panel callbacks and permissions without a browser, network, or account. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { create } from "zustand";
import ts from "typescript";

async function load(path, dependencies = {}) {
  const source = await readFile(new URL(`../src/${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const imports = { "react/jsx-runtime": jsxRuntime, ...dependencies };
  const module = { exports: {} };
  new Function("require", "module", "exports", "setInterval", "clearInterval", outputText)(
    (name) => {
      assert(Object.hasOwn(imports, name), `${path}: unexpected dependency ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    () => 1,
    () => {},
  );
  return module.exports;
}

function store(initial) {
  let state = initial;
  const read = (selector = (value) => value) => selector(state);
  read.getState = () => state;
  read.setState = (patch) => {
    state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  };
  return read;
}

function hooks() {
  const values = [];
  const effects = [];
  let cursor = 0;
  let effectCursor = 0;
  let pending = [];
  let disposed = false;
  const react = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = typeof initial === "function" ? initial() : initial;
      return [
        values[index],
        (value) => {
          assert(!disposed, "async completion must not update an unmounted panel");
          values[index] = typeof value === "function" ? value(values[index]) : value;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: initial };
      return values[index];
    },
    useEffect(effect, dependencies) {
      const index = effectCursor++;
      const previous = effects[index];
      if (
        !previous ||
        dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))
      ) {
        pending.push(() => {
          previous?.cleanup?.();
          effects[index] = { dependencies, cleanup: effect() };
        });
      }
    },
  };
  const renderOnce = (Component, props) => {
    cursor = 0;
    effectCursor = 0;
    return Component(props);
  };
  return {
    react,
    render(Component, props) {
      renderOnce(Component, props);
      const run = pending;
      pending = [];
      run.forEach((effect) => effect());
      return renderOnce(Component, props);
    },
    unmount() {
      effects.forEach((effect) => effect.cleanup?.());
      disposed = true;
    },
  };
}

function nodes(element) {
  if (Array.isArray(element)) return element.flatMap(nodes);
  if (!React.isValidElement(element)) return [];
  if (typeof element.type === "function") return nodes(element.type(element.props));
  return [element, ...nodes(element.props.children)];
}
function text(element) {
  if (Array.isArray(element)) return element.map(text).join("");
  if (React.isValidElement(element)) {
    return typeof element.type === "function"
      ? text(element.type(element.props))
      : text(element.props.children);
  }
  return typeof element === "string" || typeof element === "number" ? String(element) : "";
}
function button(tree, label) {
  const found = nodes(tree).find(
    (node) =>
      node.type === "button" && (node.props["aria-label"] === label || text(node) === label),
  );
  assert(found, `Missing button: ${label}`);
  return found;
}
function click(tree, label) {
  const target = button(tree, label);
  assert(!target.props.disabled, `Disabled button: ${label}`);
  return target.props.onClick();
}
const flush = () => new Promise(setImmediate);
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};

const model = await load("game/club/model.ts");
const { ClubMusicIcon } = await load("ui/hud/ClubMusicIcon.tsx");
const audio = await load("game/club/youtube-host.ts", { zustand: { create } });
const firstTrack = model.CLUB_TRACKS[0];
const member = (name) => ({ name, expiresAt: 100_000, dance: null, applied: false });
const snapshot = () => ({
  roomId: "CHANNEL-1",
  revision: 1,
  serverNow: 10_000,
  provider: "youtube",
  mediaId: firstTrack.id,
  playbackStatus: "playing",
  startedAt: 0,
  positionSeconds: 5,
  queueVersion: 2,
  activeDjId: "other",
  lighting: "neon",
  members: { me: member("Saya"), other: member("DJ lain"), friend: member("Teman") },
  waiting: ["friend"],
  requests: [{ id: "request-1", mediaId: firstTrack.id, from: "friend" }],
  queue: [
    { id: "queue-1", mediaId: firstTrack.id, from: "friend" },
    { id: "queue-2", mediaId: "yt:abcdefghijk", from: "other" },
    { id: "queue-3", mediaId: "yt:ABCDEFGHIJK", from: "me" },
  ],
});

const shared = {
  GameModal: ({ title, children, onClose, ...props }) =>
    React.createElement("section", { ...props, "data-title": title, onClose }, children),
  GameButton: (props) => React.createElement("button", { type: "button", ...props }),
  GameIconButton: ({ label, ...props }) =>
    React.createElement("button", { type: "button", "aria-label": label, ...props }),
  GameTabs: ({ value, onChange, tabs }) =>
    React.createElement("nav", { "data-tabs": tabs, value, onChange }),
};

async function fixture({ dj = false, near = true } = {}) {
  const club = store({ inside: true, outdoor: false, busy: false, error: "", data: snapshot() });
  if (dj) club.setState({ data: { ...club.getState().data, activeDjId: "me" } });
  const net = store({ connected: true });
  const game = store({ playerPos: [0, 0.83, 0] });
  const booth = { position: { x: 0, y: 0, z: 0 }, radius: 2 };
  const commandCalls = [];
  const lifecycle = hooks();
  const f = {
    club,
    net,
    game,
    booth,
    near,
    closed: 0,
    commandCalls,
    outcome: null,
    patchData(patch) {
      club.setState({ data: { ...club.getState().data, ...patch } });
    },
    acknowledge() {
      f.patchData({ revision: club.getState().data.revision + 1 });
      club.setState({ error: "" });
    },
  };
  const readAudio = (selector = (value) => value) => selector(audio.useClubYoutubeUi.getState());
  audio.useClubYoutubeUi.setState({ muted: false, status: "ready", resume: null });
  const { ClubMusicPanel } = await load("ui/hud/ClubMusicPanel.tsx", {
    react: lifecycle.react,
    "@/game/club/model": model,
    "@/game/club/store": {
      useClub: club,
      clubNow: () => 10_000,
      clubTarget: () => f.booth,
      clubCommand: async (action, payload) => {
        commandCalls.push({ action, payload });
        if (f.outcome) await f.outcome();
        else f.acknowledge();
      },
    },
    "@/game/club/youtube-host": { ...audio, useClubYoutubeUi: readAudio },
    "@/net/channel-store": { connectionId: "me" },
    "@/net/net-store": { useNet: net },
    "@/state/game-store": { useGame: game },
    "@/ui/game-ui/GamePanel": shared,
    "./ClubMusicIcon": { ClubMusicIcon },
    "./club-music-panel.css": {},
  });
  f.render = () =>
    lifecycle.render(ClubMusicPanel, { nearBooth: f.near, onClose: () => f.closed++ });
  f.tab = (value) => {
    nodes(f.render())
      .find((node) => node.type === "nav")
      .props.onChange(value);
    return f.render();
  };
  f.input = () => nodes(f.render()).find((node) => node.type === "input");
  f.setUrl = (value) => f.input().props.onChange({ target: { value } });
  f.submit = () =>
    nodes(f.render())
      .find((node) => node.type === "form")
      .props.onSubmit({ preventDefault() {} });
  f.unmount = lifecycle.unmount;
  return f;
}

// Visitor request flow and local audio remain available without DJ privileges.
let f = await fixture();
let tree = f.render();
assert.equal(nodes(tree)[0].props["data-title"], "Musik Underground");
assert.deepEqual(
  nodes(tree)
    .find((node) => node.type === "nav")
    .props["data-tabs"].map((tab) => tab.id),
  ["music", "queue", "dj"],
);
nodes(tree)[0].props.onClose();
assert.equal(f.closed, 1);
const choices = nodes(tree).filter((node) => node.props.className === "club-track-choice");
assert.equal(choices.length, model.CLUB_TRACKS.filter((track) => track.youtubeId).length);
for (const choice of choices) assert(!choice.props.disabled);
for (const track of model.CLUB_TRACKS.filter((track) => !track.youtubeId))
  assert(!text(tree).includes(track.title), "silent catalog entries are not offered as requests");
click(tree, "Kirim request");
await flush();
assert.deepEqual(f.commandCalls, [{ action: "request", payload: { mediaId: firstTrack.id } }]);
assert.match(text(f.render()), /Request terkirim!/);
f.patchData({ requests: [{ id: "mine", mediaId: firstTrack.id, from: "me" }] });
assert.match(text(f.render()), /Request kamu/);
assert.equal(button(f.render(), "Bisukan musik").props["aria-pressed"], false);
click(f.render(), "Bisukan musik");
assert.equal(audio.useClubYoutubeUi.getState().muted, true);
assert.equal(button(f.render(), "Nyalakan musik").props["aria-pressed"], true);
let resumes = 0;
audio.useClubYoutubeUi.setState({ status: "autoplay-blocked", resume: () => resumes++ });
click(f.render(), "Nyalakan musik");
assert.equal(resumes, 1);
click(f.render(), "Aktifkan musik");
assert.equal(resumes, 2);
audio.useClubYoutubeUi.setState({ resume: null });
assert(button(f.render(), "Aktifkan musik").props.disabled);
audio.useClubYoutubeUi.setState({ status: "failed" });
assert.match(text(f.render()), /Lagu ini belum bisa diputar/);
assert.equal(f.commandCalls.length, 1, "local audio sends no room commands");
assert.match(text(f.tab("dj")), /Giliranmu bikin suasana seru/);
assert.equal(f.input(), undefined, "visitors cannot see DJ controls");
f.tab("queue");
assert.equal(
  nodes(f.render()).filter((node) => node.props.className === "club-icon-action").length,
  0,
);

// Loading/disconnection/store-busy guards also reject callbacks retained from an older render.
for (const blocked of ["disconnected", "loading", "busy", "outside"]) {
  f = await fixture();
  const request = button(f.render(), "Kirim request").props.onClick;
  if (blocked === "disconnected") f.net.setState({ connected: false });
  if (blocked === "loading") f.club.setState({ data: null });
  if (blocked === "busy") f.club.setState({ busy: true });
  if (blocked === "outside") f.club.setState({ inside: false });
  request();
  await flush();
  assert.equal(f.commandCalls.length, 0, `stale request rejects ${blocked}`);
  if (blocked !== "outside") assert(button(f.render(), "Kirim request").props.disabled);
}
f = await fixture();
const pendingRequest = deferred();
f.outcome = () => pendingRequest.promise;
const send = button(f.render(), "Kirim request").props.onClick;
send();
send();
assert.equal(
  f.commandCalls.length,
  1,
  "same-turn duplicate clicks are locked before store busy updates",
);
assert(button(f.render(), "Mengirim…").props.disabled);
assert(button(f.render(), "Jadi DJ").props.disabled);
f.acknowledge();
pendingRequest.resolve();
await flush();
assert(!button(f.render(), "Kirim request").props.disabled);

// Apply/leave availability is checked against the latest membership and booth position.
f = await fixture({ near: false });
assert(button(f.render(), "Jadi DJ").props.disabled);
for (const blocked of ["away", "queued", "already-dj", "missing-booth"]) {
  f = await fixture();
  const apply = button(f.render(), "Jadi DJ").props.onClick;
  if (blocked === "away") f.game.setState({ playerPos: [50, 0.83, 0] });
  if (blocked === "queued") f.patchData({ waiting: ["me"] });
  if (blocked === "already-dj") f.patchData({ activeDjId: "me" });
  if (blocked === "missing-booth") f.booth = null;
  apply();
  await flush();
  assert.equal(f.commandCalls.length, 0, `apply rejects ${blocked}`);
}
f = await fixture();
click(f.render(), "Jadi DJ");
await flush();
assert.deepEqual(f.commandCalls.at(-1), { action: "apply", payload: {} });
f.patchData({ waiting: ["friend", "me"] });
f.near = false;
f.game.setState({ playerPos: [50, 0.83, 0] });
assert.match(text(f.render()), /Giliran DJ #2/);
const leave = button(f.render(), "Batal antre DJ").props.onClick;
click(f.render(), "Batal antre DJ");
await flush();
assert.deepEqual(f.commandCalls.at(-1), { action: "leave-dj", payload: {} });
f.patchData({ waiting: [] });
leave();
await flush();
assert.equal(f.commandCalls.length, 2, "former waiter cannot submit a stale leave command");
f = await fixture({ dj: true, near: false });
assert.match(text(f.tab("dj")), /Meja DJ menunggumu/);
assert.equal(f.input(), undefined);
f.game.setState({ playerPos: [50, 0.83, 0] });
click(f.render(), "Selesai jadi DJ");
await flush();
assert.deepEqual(f.commandCalls.at(-1), { action: "leave-dj", payload: {} });

// DJ actions use existing payloads and recheck privileges at tap time.
f = await fixture({ dj: true });
f.tab("dj");
for (const [label, action, payload] of [
  ["Jeda", "pause", {}],
  ["Berikutnya", "next", {}],
  ["Laut", "lighting", { lighting: "ocean" }],
  [`Terima ${firstTrack.title}`, "accept", { id: "request-1" }],
  [`Tolak ${firstTrack.title}`, "reject", { id: "request-1" }],
  ["Serahkan ke Teman", "transfer", { target: "friend" }],
]) {
  click(f.render(), label);
  await flush();
  assert.deepEqual(f.commandCalls.at(-1), { action, payload });
}
f.patchData({ playbackStatus: "paused", lighting: "ocean" });
click(f.render(), "Lanjutkan");
await flush();
assert.deepEqual(f.commandCalls.at(-1), { action: "play", payload: {} });
assert.equal(button(f.render(), "Laut").props["aria-pressed"], true);
f.patchData({ mediaId: null });
click(f.render(), "Lanjutkan");
await flush();
assert.deepEqual(
  f.commandCalls.at(-1),
  { action: "play", payload: {} },
  "queued music can start without a current song",
);
f.patchData({ mediaId: null, queue: [] });
assert(button(f.render(), "Lanjutkan").props.disabled);
click(f.render(), "Berikutnya");
await flush();
assert.deepEqual(
  f.commandCalls.at(-1),
  { action: "next", payload: {} },
  "the server retains authority over next-track behavior when the queue is empty",
);
for (const blocked of ["away", "transferred", "disconnected", "busy"]) {
  f = await fixture({ dj: true });
  f.tab("dj");
  const actions = [
    "Jeda",
    "Berikutnya",
    "Laut",
    `Terima ${firstTrack.title}`,
    `Tolak ${firstTrack.title}`,
    "Serahkan ke Teman",
  ].map((label) => button(f.render(), label).props.onClick);
  if (blocked === "away") f.game.setState({ playerPos: [50, 0.83, 0] });
  if (blocked === "transferred") f.patchData({ activeDjId: "other" });
  if (blocked === "disconnected") f.net.setState({ connected: false });
  if (blocked === "busy") f.club.setState({ busy: true });
  for (const action of actions) action();
  await flush();
  assert.equal(f.commandCalls.length, 0, `DJ callbacks reject ${blocked}`);
}

// Queue callbacks use item identity and the current queue, including stale boundaries.
f = await fixture({ dj: true });
tree = f.tab("queue");
assert(button(tree, `Naikkan ${firstTrack.title}`).props.disabled);
assert(button(tree, "Turunkan YouTube · ABCDEFGHIJK").props.disabled);
button(tree, `Naikkan ${firstTrack.title}`).props.onClick();
button(tree, "Turunkan YouTube · ABCDEFGHIJK").props.onClick();
assert.equal(f.commandCalls.length, 0, "out-of-range queue handlers are inert");
const lowerFirst = button(tree, `Turunkan ${firstTrack.title}`).props.onClick;
const [one, two, three] = f.club.getState().data.queue;
f.patchData({ queue: [two, one, three] });
lowerFirst();
await flush();
assert.deepEqual(f.commandCalls.at(-1), {
  action: "reorder",
  payload: { order: [two.id, three.id, one.id] },
});
f.patchData({ queue: [two, three] });
lowerFirst();
await flush();
assert.equal(f.commandCalls.length, 1, "removed queue item cannot reorder another item");
f.patchData({ queue: [one, two, three], activeDjId: "other" });
lowerFirst();
await flush();
assert.equal(f.commandCalls.length, 1, "queue reorder rechecks DJ authority");
f.patchData({ queue: [] });
assert.match(text(f.render()), /Antrean masih kosong/);
click(f.render(), "Pilih lagu");
assert(button(f.render(), "Kirim request"));

// URL drafts survive failures, stale acknowledgements and room switches.
const url = "https://youtu.be/abcdefghijk";
for (const outcome of ["server-error", "no-revision", "other-room", "exited", "success"]) {
  f = await fixture({ dj: true });
  f.tab("dj");
  f.setUrl("not a video");
  assert.equal(f.input().props["aria-invalid"], true);
  assert(button(f.render(), "Putar").props.disabled);
  await f.submit();
  assert.equal(f.commandCalls.length, 0);
  f.setUrl(`  ${url}  `);
  f.outcome = () => {
    if (outcome === "server-error") f.club.setState({ error: "Request ditolak." });
    if (outcome === "other-room") f.patchData({ roomId: "CHANNEL-2", revision: 99 });
    if (outcome === "exited") {
      f.acknowledge();
      f.club.setState({ inside: false });
    }
    if (outcome === "success") f.acknowledge();
  };
  await f.submit();
  assert.deepEqual(f.commandCalls.at(-1), { action: "set-url", payload: { url } });
  assert.equal(f.input().props.value, outcome === "success" ? "" : `  ${url}  `, outcome);
  if (outcome === "server-error") assert.match(text(f.render()), /Request ditolak/);
}
f = await fixture({ dj: true });
f.tab("dj");
f.setUrl(url);
const urlPending = deferred();
f.outcome = () => urlPending.promise;
const submitting = f.submit();
assert(f.input().props.disabled);
assert(button(f.render(), "Memuat…").props.disabled);
await f.submit();
assert.equal(f.commandCalls.length, 1, "pending URL submit cannot queue duplicate commands");
f.setUrl("https://youtu.be/ABCDEFGHIJK");
f.acknowledge();
urlPending.resolve();
await submitting;
assert.equal(f.input().props.value, "https://youtu.be/ABCDEFGHIJK", "newer draft is preserved");
for (const blocked of ["transferred", "away"]) {
  f = await fixture({ dj: true });
  f.tab("dj");
  f.setUrl(url);
  const submit = nodes(f.render()).find((node) => node.type === "form").props.onSubmit;
  if (blocked === "transferred") f.patchData({ activeDjId: "other" });
  else f.game.setState({ playerPos: [50, 0.83, 0] });
  await submit({ preventDefault() {} });
  assert.equal(f.commandCalls.length, 0, `URL submission rejects ${blocked}`);
}
f = await fixture({ dj: true });
f.tab("dj");
f.setUrl(url);
const closingRequest = deferred();
f.outcome = () => closingRequest.promise;
const closingSubmission = f.submit();
f.unmount();
f.acknowledge();
closingRequest.resolve();
await closingSubmission;

console.log(
  "PASS club music panel: visitor requests, loading/disconnected/pending guards, local mute/autoplay, apply/leave permissions, DJ transfer/proximity checks, playback/lighting/moderation, current queue reordering, URL draft preservation and acknowledged success; no browser/network.",
);
