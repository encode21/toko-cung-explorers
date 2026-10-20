/** Real camera math, store lifecycle, capture callback and panel actions without a browser. */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";
const require = createRequire(import.meta.url);
const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const effects = [];
let afterRender,
  sheet = "camera";
const source = {
  width: 1600,
  height: 900,
  getBoundingClientRect: () => ({ left: 20, top: 30, width: 800, height: 450 }),
};
const mocks = {
  "react/jsx-runtime": jsx,
  react: {
    useEffect: (effect) => effects.push(effect),
    useRef: (current) => ({ current }),
    useState: (value) => [value, () => {}],
  },
  zustand: require("zustand"),
  "@react-three/fiber": {
    useThree: (select) => select({ gl: { domElement: source } }),
    addAfterEffect: (callback) => {
      afterRender = callback;
      return () => {
        afterRender = null;
      };
    },
  },
  "@/state/hud-store": {
    useHud: {
      getState: () => ({
        sheet,
        setSheet: (next) => {
          sheet = next;
        },
      }),
    },
  },
  "@/ui/game-ui/GamePanel": {
    GameModal: "modal",
    GameButton: "button",
    GameIconButton: "icon-button",
  },
};
const cache = new Map();
function load(path) {
  path = resolve(root, path);
  if (cache.has(path)) return cache.get(path).exports;
  const mod = { exports: {} };
  cache.set(path, mod);
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (name) => {
      if (name.endsWith(".css")) return {};
      if (name in mocks) return mocks[name];
      if (name.startsWith("@/") || name.startsWith(".")) {
        const candidate = name.startsWith("@/")
          ? resolve(root, "src", name.slice(2))
          : resolve(dirname(path), name);
        return load([candidate, `${candidate}.ts`, `${candidate}.tsx`].find(existsSync));
      }
      return require(name);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}
const { photoCameraPose, photoCrop } = load("src/game/photo/photo-camera.ts");
const player = { x: 10, y: 0.83, z: 20 };
const position = {},
  target = {};
for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
  photoCameraPose(player, heading, "selfie", 0, 0, position, target);
  assert(
    Math.abs(
      (position.x - player.x) * Math.sin(heading) +
        (position.z - player.z) * Math.cos(heading) -
        2.35,
    ) < 1e-9,
    "selfie faces avatar front",
  );
  assert.equal(target.y, 1.25);
  photoCameraPose(player, heading, "rear", 0, 0, position, target);
  assert.deepEqual(position, { x: 10, y: 1.55, z: 20 });
  assert(
    Math.abs(
      (target.x - position.x) * Math.sin(heading) + (target.z - position.z) * Math.cos(heading) - 1,
    ) < 1e-9,
    "rear looks forward",
  );
}
assert.deepEqual(player, { x: 10, y: 0.83, z: 20 }, "camera never moves player");
const frame = { left: 100, top: 80, width: 600, height: 300 };
const crop = photoCrop(source.getBoundingClientRect(), frame, 1600, 900);
assert.deepEqual(crop, {
  x: 160,
  y: 100,
  width: 1200,
  height: 600,
  outputWidth: 1200,
  outputHeight: 600,
});
assert.equal(photoCrop({ left: 0, top: 0, width: 0, height: 0 }, frame, 0, 0), null);
assert.equal(photoCrop(source.getBoundingClientRect(), { ...frame, left: 9999 }, 1600, 900), null);
const large = photoCrop(
  { left: 0, top: 0, width: 4000, height: 2000 },
  { left: 0, top: 0, width: 4000, height: 2000 },
  4000,
  2000,
);
assert.equal(large.outputWidth, 1920);
assert.equal(large.outputHeight, 960);

const { usePhoto } = load("src/game/photo/photo-store.ts");
const state = () => usePhoto.getState();
const urls = [],
  revoked = [];
URL.createObjectURL = () => {
  const url = `blob:photo-${urls.length}`;
  urls.push(url);
  return url;
};
URL.revokeObjectURL = (url) => revoked.push(url);
state().shoot();
assert.equal(state().busy, false, "wait until camera pose applied");
usePhoto.setState({ ready: true });
state().shoot();
const oldRequest = state().request;
state().shoot();
assert.equal(state().request, oldRequest, "ignore double shutter");
state().reset();
state().finish(oldRequest, new Blob(["old"]));
assert.equal(state().image, null, "ignore async encoding after closing");
assert.equal(urls.length, 0);
state().aim(99, -99);
assert.equal(state().yaw, 1.15);
assert.equal(state().pitch, -0.5);
state().setMode("rear");
assert.equal(state().yaw, 0);
assert.equal(state().ready, false);

let draw,
  encode,
  linkClicked = false;
globalThis.document = {
  querySelector: () => ({ getBoundingClientRect: () => frame }),
  body: { appendChild: () => {} },
  createElement: (tag) =>
    tag === "a"
      ? {
          click: () => {
            linkClicked = true;
          },
          remove: () => {},
        }
      : {
          getContext: () => ({
            drawImage: (...args) => {
              draw = args;
            },
          }),
          toBlob: (callback) => {
            encode = callback;
          },
        },
};
const { PhotoCapture } = load("src/game/photo/PhotoCapture.tsx");
PhotoCapture();
const disposeCapture = effects.pop()();
usePhoto.setState({ ready: true });
state().shoot();
const request = state().request;
afterRender();
assert.deepEqual(draw.slice(1), [160, 100, 1200, 600, 0, 0, 1200, 600]);
assert.equal(state().busy, true);
draw = null;
afterRender();
assert.equal(draw, null, "one copy per shutter");
encode(new Blob(["png"], { type: "image/png" }));
assert.equal(state().image, "blob:photo-0");
state().finish(request, new Blob(["duplicate"]));
assert.equal(urls.length, 1);
state().retake();
assert.deepEqual(revoked, ["blob:photo-0"]);
usePhoto.setState({ ready: true });
state().shoot();
afterRender();
encode(null);
assert.equal(state().busy, false);
assert.match(state().error, /Coba lagi/);
usePhoto.setState({ ready: true });
state().shoot();
afterRender();
const staleEncode = encode;
state().reset();
usePhoto.setState({ ready: true });
state().shoot();
afterRender();
staleEncode(new Blob(["stale"]));
assert.equal(state().image, null, "old session cannot overwrite new capture");
encode(new Blob(["new"]));
assert.equal(state().image, "blob:photo-1");

// Resolve the real Zustand selector as a hook without mounting React.
mocks["@/game/photo/photo-store"] = { usePhoto: Object.assign(() => state(), { getState: state }) };
const { PhotoCameraPanel } = load("src/ui/hud/PhotoCameraPanel.tsx");
const children = (node) =>
  node && typeof node === "object"
    ? [node, ...[node.props?.children].flat(Infinity).flatMap(children)]
    : [];
let panel = PhotoCameraPanel();
let nodes = children(panel);
nodes.find((n) => n.props?.className === "photo-save").props.onClick();
assert(linkClicked, "save triggers PNG download");
nodes
  .find((n) => n.type === "button" && n.props.children?.includes?.("Ambil ulang"))
  .props.onClick();
assert.equal(state().image, null);
panel = PhotoCameraPanel();
nodes = children(panel);
const modes = nodes.filter((n) => n.type === "button" && "aria-pressed" in n.props);
assert.equal(modes.length, 2);
modes[0].props.onClick();
assert.equal(state().mode, "selfie");
modes[1].props.onClick();
assert.equal(state().mode, "rear");
const focusFrame = nodes.find((n) => "data-photo-frame" in n.props);
focusFrame.props.onKeyDown({ key: "ArrowLeft", preventDefault() {}, stopPropagation() {} });
assert.equal(state().yaw, 0.08);
panel.props.onClose();
assert.equal(sheet, "phone");
const disposePanel = effects[0]();
disposePanel();
assert.equal(state().ready, false);
assert.equal(state().image, null);
disposeCapture();
assert.equal(afterRender, null);
console.log(
  "Photo camera: pose, crop/DPR, request races, retry, cleanup, two modes and save callbacks passed.",
);
