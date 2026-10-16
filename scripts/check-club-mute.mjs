/** Exercise local YouTube mute and runtime wiring without a browser or network. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { create } from "zustand";

async function load(path, dependencies = {}) {
  const source = await readFile(new URL(`../src/${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (id) => {
      assert(Object.hasOwn(dependencies, id), `Unexpected dependency: ${id}`);
      return dependencies[id];
    },
    module,
    module.exports,
  );
  return module.exports;
}

const players = [];
const element = () => ({
  style: {},
  clientWidth: 320,
  clientHeight: 200,
  replaceChildren() {},
  appendChild() {},
});
class FakePlayer {
  calls = [];
  constructor(_element, options) {
    this.options = options;
    players.push(this);
  }
  ready() {
    this.options.events.onReady({ target: this });
  }
  mute() {
    this.calls.push("mute");
  }
  unMute() {
    this.calls.push("unMute");
  }
  playVideo() {
    this.calls.push("play");
  }
  pauseVideo() {
    this.calls.push("pause");
  }
  seekTo() {
    this.calls.push("seek");
  }
  loadVideoById() {
    this.calls.push("load");
  }
  cueVideoById() {
    this.calls.push("cue");
  }
  destroy() {
    this.calls.push("destroy");
  }
  getCurrentTime() {
    return 12;
  }
  getPlayerState() {
    return 1;
  }
}
globalThis.document = { createElement: element };
globalThis.window = {
  YT: { Player: FakePlayer, PlayerState: { PLAYING: 1, BUFFERING: 3 } },
  location: { origin: "https://example.test", href: "https://example.test/world" },
};
const flush = () => new Promise(setImmediate);
const model = await load("game/club/model.ts");
const providers = await load("game/club/music-provider.ts", { "./model.ts": model });
const provider = new providers.YouTubeMusicProvider();
provider.setMuted(true);
const mounting = provider.mountVisiblePlayer(element());
await flush();
let player = players.at(-1);
assert.deepEqual(player.calls, [], "mute waits for the IFrame ready event");
player.ready();
await mounting;
assert.deepEqual(player.calls, ["mute"], "pre-mount preference applies before playback");
provider.setMuted(false);
assert.deepEqual(player.calls, ["mute", "unMute"], "unmute does not play, pause, seek or reload");
provider.setMuted(true);
const beforeReplacement = player;
const replacement = provider.mountVisiblePlayer(element());
await flush();
player = players.at(-1);
assert.notEqual(player, beforeReplacement);
assert.equal(beforeReplacement.calls.at(-1), "destroy");
provider.setMuted(false);
provider.setMuted(true);
assert.deepEqual(player.calls, [], "latest preference is retained during replacement loading");
player.ready();
await replacement;
assert.deepEqual(player.calls, ["mute"], "replacement inherits local mute");
const state = {
  roomId: "CHANNEL-1",
  provider: "youtube",
  mediaId: "cung-underground-set",
  playbackStatus: "paused",
  startedAt: null,
  positionSeconds: 12,
  queueVersion: 0,
  activeDjId: "another-player",
};
await provider.apply(state, 0);
const callsBeforeMute = [...player.calls];
provider.setMuted(false);
assert.deepEqual(player.calls, [...callsBeforeMute, "unMute"]);
assert.equal(state.playbackStatus, "paused", "local audio never changes shared transport");
assert.equal(provider.position(), 12);
provider.dispose();
const callsAfterDispose = [...player.calls];
provider.setMuted(true);
assert.deepEqual(player.calls, callsAfterDispose, "disposed players receive no mute commands");
const mock = new providers.MockMusicProvider();
mock.setMuted(true);
await mock.apply(state, 0);
assert.equal(mock.position(), 12, "silent fallback keeps its playback timeline");

const host = await load("game/club/youtube-host.ts", { zustand: { create } });
host.useClubYoutubeUi.getState().setMuted(true);
host.setClubYoutubeHost(element());
const effects = [];
let commands = 0;
const club = { inside: true, outdoor: false, data: null };
const readClub = (select) => select(club);
readClub.getState = () => club;
const { ClubRuntime } = await load("game/club/ClubRuntime.tsx", {
  react: { useEffect: (effect) => effects.push(effect), useRef: (current) => ({ current }) },
  "@/net/channel-store": { useChannels: (select) => select({ lease: { channel: "CHANNEL-1" } }) },
  "@/net/net-store": { useNet: (select) => select({ connected: false }) },
  "./store": {
    useClub: readClub,
    resetClub() {},
    clubCommand() {
      commands++;
    },
    clubNow: () => 0,
  },
  "./music-provider": providers,
  "./model": model,
  "./youtube-host": host,
});
ClubRuntime();
const cleanup = effects[1]();
await flush();
const runtimePlayer = players.at(-1);
runtimePlayer.ready();
await flush();
assert.deepEqual(runtimePlayer.calls, ["mute"], "runtime seeds saved local preference");
host.useClubYoutubeUi.getState().setStatus("ready");
assert.deepEqual(runtimePlayer.calls, ["mute"], "unrelated UI updates do not resend mute");
host.useClubYoutubeUi.getState().setMuted(false);
assert.deepEqual(runtimePlayer.calls, ["mute", "unMute"], "store updates reach the active player");
cleanup();
assert.equal(runtimePlayer.calls.at(-1), "destroy");
const cleanedCalls = [...runtimePlayer.calls];
host.useClubYoutubeUi.getState().setMuted(true);
assert.deepEqual(runtimePlayer.calls, cleanedCalls, "cleanup removes the mute subscription");
assert.equal(host.useClubYoutubeUi.getState().muted, true, "preference survives UI cleanup");
assert.equal(commands, 0, "local mute sends no shared club commands");
assert.equal(host.useClubYoutubeUi.getState().resume, null);
club.outdoor = true;
effects.length = 0;
ClubRuntime();
const cleanupOutdoor = effects[1]();
await flush();
const outdoorPlayer = players.at(-1);
outdoorPlayer.ready();
await flush();
assert.deepEqual(outdoorPlayer.calls, ["unMute"], "Underground mute never silences the concert");
assert.equal(host.useClubYoutubeUi.getState().muted, true, "concert preserves the preference");
cleanupOutdoor();
host.setClubYoutubeHost(null);

// A separate transient gain silences procedural BGM without changing saved audio preferences.
const saved = new Map([["tokocung-explorers-bgm-volume", "0.4"]]);
let savedWrites = 0;
globalThis.localStorage = {
  getItem: (key) => saved.get(key) ?? null,
  setItem(key, value) {
    savedWrites++;
    saved.set(key, value);
  },
};
const gains = [];
const audioContext = {
  currentTime: 0,
  createGain() {
    const node = {
      ramps: [],
      gain: {
        value: 0,
        setValueAtTime() {},
        cancelScheduledValues() {},
        linearRampToValueAtTime(value) {
          node.ramps.push(value);
        },
      },
      connect() {},
    };
    gains.push(node);
    return node;
  },
};
const categories = [];
window.setInterval = () => null;
const ambient = await load("game/audio/ambient-music.ts", {
  "./audio-manager": {
    audioAudible: () => false,
    audioBus(category) {
      categories.push(category);
      return {};
    },
  },
  "./audio-context": { ensureAudioContext: () => audioContext, resumeAudioContext: async () => {} },
});
ambient.setAmbientDucked(true);
assert.equal(gains.length, 0, "ducking before gesture does not initialize AudioContext");
await ambient.startAmbientMusic();
const ambientGain = gains[0];
assert.equal(ambientGain.ramps.at(-1), 0, "muted venue starts procedural BGM silent");
assert.equal(ambient.getAmbientVolume(), 0.4);
ambient.setAmbientDucked(false);
assert.equal(ambientGain.ramps.at(-1), 0.4 * 0.55, "unmute restores saved BGM level");
assert.equal(savedWrites, 0, "temporary mute/unmute never persists volume changes");
assert.deepEqual(categories, ["music"], "temporary gain only belongs to music, not SFX/master");

const audioEffects = [];
const clubAudio = create(() => ({ inside: true, outdoor: false }));
const { AmbientMusic } = await load("game/audio/AmbientMusic.tsx", {
  react: { useEffect: (effect) => audioEffects.push(effect) },
  "./music-store": { useMusic: {} },
  "./audio-context": { getAudioContext: () => audioContext },
  "./world-feedback": { startWorldFeedback() {} },
  "./ambient-music": ambient,
  "@/game/club/store": { useClub: clubAudio },
  "@/game/club/youtube-host": host,
});
AmbientMusic();
const cleanupAmbient = audioEffects[0]();
assert.equal(ambientGain.ramps.at(-1), 0, "Underground preference ducks BGM on mount");
host.useClubYoutubeUi.getState().setMuted(false);
assert.equal(ambientGain.ramps.at(-1), 0.4 * 0.55, "unmute restores procedural BGM immediately");
host.useClubYoutubeUi.getState().setMuted(true);
assert.equal(ambientGain.ramps.at(-1), 0);
clubAudio.setState({ inside: false });
assert.equal(ambientGain.ramps.at(-1), 0.4 * 0.55, "exiting Underground restores world BGM");
clubAudio.setState({ inside: true, outdoor: true });
assert.equal(ambientGain.ramps.at(-1), 0.4 * 0.55, "concert BGM ignores Underground preference");
clubAudio.setState({ outdoor: false });
assert.equal(ambientGain.ramps.at(-1), 0, "returning Underground reapplies local mute");
ambient.setAmbientVolume(0.25);
assert.equal(ambientGain.ramps.at(-1), 0, "saved-volume adjustment cannot bypass venue silence");
const writesBeforeCleanup = savedWrites;
cleanupAmbient();
assert.equal(ambientGain.ramps.at(-1), 0.25 * 0.55, "cleanup restores latest saved BGM level");
const gainAfterCleanup = [...ambientGain.ramps];
host.useClubYoutubeUi.getState().setMuted(false);
host.useClubYoutubeUi.getState().setMuted(true);
clubAudio.setState({ inside: false });
clubAudio.setState({ inside: true });
assert.deepEqual(ambientGain.ramps, gainAfterCleanup, "cleanup releases both mute subscriptions");
assert.equal(
  savedWrites,
  writesBeforeCleanup,
  "restoring temporary silence never writes preferences",
);
ambient.stopAmbientMusic();
console.log(
  "PASS Underground mute: YouTube ready/replacement, local transport isolation, procedural BGM gain + preference preservation, unmute/exit/concert restore, subscription cleanup; no browser/network.",
);
