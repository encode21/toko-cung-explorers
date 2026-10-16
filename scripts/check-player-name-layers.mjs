/** Check name/video layering and world-label visibility without a browser or network. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as THREE from "three";
import ts from "typescript";

const source = (path) => readFile(new URL(`../src/${path}`, import.meta.url), "utf8");
async function load(path, dependencies = {}) {
  const { outputText } = ts.transpileModule(await source(path), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const imports = {
    "react/jsx-runtime": jsxRuntime,
    "@/game/jsx/jsx-runtime": jsxRuntime,
    three: THREE,
    ...dependencies,
  };
  const module = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (name) => {
      assert(Object.hasOwn(imports, name), `${path}: unexpected dependency ${name}`);
      return imports[name];
    },
    module,
    module.exports,
  );
  return module.exports;
}

function nodes(element) {
  if (Array.isArray(element)) return element.flatMap(nodes);
  if (!React.isValidElement(element)) return [];
  return [element, ...nodes(element.props.children)];
}
function materialize(element) {
  if (Array.isArray(element)) return element.map(materialize);
  if (!React.isValidElement(element)) return element;
  if (typeof element.type === "function") return materialize(element.type(element.props));
  return React.cloneElement(element, {}, materialize(element.props.children));
}
function text(element) {
  if (Array.isArray(element)) return element.map(text).join("");
  if (React.isValidElement(element)) return text(element.props.children);
  return typeof element === "string" || typeof element === "number" ? String(element) : "";
}

const layers = await load("game/engine/world-html-layers.ts");
const { WORLD_HTML_LAYERS, isWorldLabelVisible } = layers;
assert.equal(typeof isWorldLabelVisible, "function");
assert(WORLD_HTML_LAYERS.screen[0] < WORLD_HTML_LAYERS.playerName[1]);
assert(WORLD_HTML_LAYERS.playerName[0] < 20, "world labels must remain below the HUD");

for (const camera of [
  new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 100),
  new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100),
]) {
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const world = new THREE.Group();
  const avatar = new THREE.Group();
  const anchor = new THREE.Object3D();
  world.add(avatar);
  avatar.add(anchor);
  const visible = () => {
    world.updateMatrixWorld(true);
    return isWorldLabelVisible(anchor, camera);
  };
  assert(visible(), `${camera.type}: a visible avatar keeps its name`);
  anchor.visible = false;
  assert(!visible(), `${camera.type}: a hidden name anchor stays hidden`);
  anchor.visible = true;
  avatar.visible = false;
  assert(!visible(), `${camera.type}: an uninitialized/other-venue remote avatar stays hidden`);
  avatar.visible = true;
  world.visible = false;
  assert(!visible(), `${camera.type}: hidden ancestors are honored`);
  world.visible = true;
  assert(visible(), `${camera.type}: returning to the venue restores the name`);
  anchor.position.z = 20;
  assert(!visible(), `${camera.type}: names behind the camera stay hidden`);
  anchor.position.z = 9.95;
  assert(!visible(), `${camera.type}: names before the near plane stay hidden`);
  anchor.position.z = -100;
  assert(!visible(), `${camera.type}: names beyond the far plane stay hidden`);
  anchor.position.z = -50;
  assert(visible(), `${camera.type}: a distant name inside the clip range remains visible`);
}

let frames = [];
const badgeCamera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 100);
badgeCamera.position.set(0, 0, 10);
badgeCamera.lookAt(0, 0, 0);
badgeCamera.updateMatrixWorld(true);
const react = {
  ...React,
  useRef: (value) => ({ current: value }),
  useMemo: (create) => create(),
  useCallback: (callback) => callback,
  useEffect: () => {},
  useState: (value) => [typeof value === "function" ? value() : value, () => {}],
};
let profileName = "Nama Profil";
let networkName = "Nama Jaringan";
const club = { inside: true, outdoor: false };
const Html = "mock-drei-html";
const badges = await load("game/net/PlayerNameBadge.tsx", {
  react,
  "@react-three/drei": { Html, Billboard: "mock-drei-billboard", Text: "mock-drei-text" },
  "@react-three/fiber": {
    useFrame: (callback) => frames.push(callback),
    useThree: (select) => select({ camera: badgeCamera }),
  },
  "@/game/engine/world-html-layers": layers,
  "@/game/club/store": { useClub: (select) => select(club) },
  "@/identity/profile-store": {
    useProfile: (select) => select({ profile: { displayName: profileName } }),
  },
  "@/net/net-store": { useNet: (select) => select({ name: networkName }) },
  "./player-name-badge.css": {},
});
const render = (props) => {
  frames = [];
  const tree = materialize(badges.PlayerNameBadge({ name: "Pemain", seed: "player-1", ...props }));
  const html = nodes(tree).find((node) => node.type === Html);
  assert(html, "player names must use DOM Html so their layer can outrank the iframe");
  assert.equal(html.props.transform, true, "world-space scaling is preserved");
  assert.equal(html.props.sprite, true, "names continue facing the camera");
  const local = !!props?.local;
  assert.equal(html.props.distanceFactor, local ? 4 : 4 * 0.68, "other players use a smaller name");
  assert.equal(html.props.occlude, false, "venue labels must not disappear behind scene raycasts");
  assert.equal(
    html.props.onOcclude,
    undefined,
    "no stale occlusion callback can hide a valid label",
  );
  assert.deepEqual(
    html.props.zIndexRange,
    local ? WORLD_HTML_LAYERS.playerName : WORLD_HTML_LAYERS.remotePlayerName,
    "other players stay beneath the local name",
  );
  assert.equal(html.props.pointerEvents, "none", "name portals cannot intercept gameplay input");
  assert.equal(html.props.style.pointerEvents, "none");
  return { tree, html, tick: () => frames.forEach((frame) => frame()) };
};

const visibility = render({ name: "Nama Terlihat" });
const anchorElement = nodes(visibility.tree).find((node) => node.type === "group");
const badgeElement = nodes(visibility.tree).find(
  (node) => node.props.className === "player-name-badge",
);
assert.equal(
  badgeElement.props.style.visibility,
  "hidden",
  "a newly mounted name never flashes at an uninitialized position",
);
const badgeDom = { style: { ...badgeElement.props.style } };
badgeElement.props.ref.current = badgeDom;
const avatar = new THREE.Group();
const anchor = new THREE.Group();
anchor.position.fromArray(anchorElement.props.position);
avatar.add(anchor);
anchorElement.props.ref.current = anchor;
visibility.tick();
assert.equal(badgeDom.style.visibility, "visible", "the frame callback reveals a valid name");
avatar.visible = false;
visibility.tick();
assert.equal(
  badgeDom.style.visibility,
  "hidden",
  "other-venue/uninitialized avatars never leave a DOM name behind",
);
avatar.visible = true;
visibility.tick();
assert.equal(badgeDom.style.visibility, "visible");
// Reproduce the problematic raycast: non-rendered geometry can still intersect a ray.
const helper = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial());
helper.visible = false;
helper.position.set(0, 1.1, 5);
helper.updateMatrixWorld(true);
const ray = new THREE.Raycaster();
ray.set(
  badgeCamera.position,
  anchor.getWorldPosition(new THREE.Vector3()).sub(badgeCamera.position).normalize(),
);
assert(
  ray.intersectObject(helper).length > 0,
  "invisible scene helpers can falsely occlude a label",
);
visibility.tick();
assert.equal(
  badgeDom.style.visibility,
  "visible",
  "scene helper occlusion cannot hide a venue name",
);
helper.geometry.dispose();
helper.material.dispose();
avatar.visible = false;
visibility.tick();
assert.equal(badgeDom.style.visibility, "hidden", "avatar visibility still hides the label");
avatar.visible = true;
anchor.position.z = 20;
visibility.tick();
assert.equal(
  badgeDom.style.visibility,
  "hidden",
  "the frame callback hides names behind the camera",
);
anchor.position.z = 0;
visibility.tick();
assert.equal(badgeDom.style.visibility, "visible");

for (const local of [false, true]) {
  const { tree } = render({
    local,
    name: "  Toko   Rizki  Aja  ",
    subtitle: "DJ · Cung Underground",
  });
  assert(text(tree).includes("Toko Rizki Aja"), "names retain whitespace normalization");
  assert(text(tree).includes("DJ · Cung Underground"), "remote role/DJ subtitles remain available");
  assert(
    !nodes(tree).some((node) => node.type === "mesh"),
    "no second WebGL name duplicates the DOM name",
  );
}
club.outdoor = true;
render({ name: "Pemain Konser" });
club.inside = false;
frames = [];
const cityName = materialize(badges.PlayerNameBadge({ name: "Pemain Kota", seed: "city-player" }));
assert(
  nodes(cityName).some((node) => node.type === "mesh"),
  "city gameplay retains the existing WebGL name renderer",
);
assert(
  !nodes(cityName).some((node) => node.type === Html),
  "outside venues there is no extra name DOM/raycast cost",
);
assert.equal(frames.length, 1, "city badges only run the near-camera hide check");
assert(text(cityName).includes("Pemain Kota"));
club.inside = true;
club.outdoor = false;
assert(text(render({ name: " \n\t " }).tree).includes("Pengunjung"));
const longName = "🎧".repeat(25);
assert(text(render({ name: longName }).tree).includes(`${"🎧".repeat(23)}…`));
assert(
  !text(render({ name: longName }).tree).includes("�"),
  "Unicode names must not split surrogate pairs",
);
assert(text(render({ name: "A".repeat(24) }).tree).includes("A".repeat(24)));

for (const [profile, network, expected] of [
  ["Nama Profil", "Nama Jaringan", "Nama Profil"],
  ["", "Nama Jaringan", "Nama Jaringan"],
  ["", "", "Pengunjung"],
]) {
  profileName = profile;
  networkName = network;
  const local = badges.LocalPlayerNameBadge({ height: 2.6 });
  assert.equal(local.type, badges.PlayerNameBadge, "local players share the same badge component");
  assert.equal(local.props.name, expected);
  assert.equal(local.props.local, true);
  assert.equal(local.props.height, 2.6);
}

const remote = ts.createSourceFile(
  "RemotePlayers.tsx",
  await source("game/net/RemotePlayers.tsx"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
let remoteUsesSharedBadge = false;
const visit = (node) => {
  if (
    (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
    node.tagName.getText(remote) === "PlayerNameBadge"
  ) {
    remoteUsesSharedBadge = true;
  }
  ts.forEachChild(node, visit);
};
visit(remote);
assert(remoteUsesSharedBadge, "remote players must keep using the shared name renderer");

const screen = await load("game/club/ClubMusicScreen.tsx", {
  react,
  "@react-three/drei": { Html, Text: "mock-drei-text" },
  "@/game/engine/quality": { LOW_QUALITY: false },
  "@/game/engine/world-html-layers": layers,
  "./model": { trackTitle: () => "Lagu Klub" },
  "./music-provider": { YOUTUBE_ENABLED: true },
  "./youtube-host": {
    setClubYoutubeHost: () => {},
    useClubYoutubeUi: (select) => select({ status: "ready", errorCode: null }),
  },
});
const video = nodes(screen.ClubMusicScreen({ color: "#ffffff", mediaId: "song" })).find(
  (node) => node.type === Html,
);
assert(video, "the visible YouTube screen remains mounted");
assert.deepEqual(video.props.zIndexRange, WORLD_HTML_LAYERS.screen);
assert.equal(video.props.style.pointerEvents, "none");

console.log(
  "PASS player-name layers: DOM badge above video and below HUD, camera clipping, hidden ancestor/remote visibility, world scaling, invisible-helper occlusion regression, local/remote identity, Unicode truncation and subtitles; no browser/network.",
);
