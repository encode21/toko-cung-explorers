import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { INTRO_CLIPS } from "../../src/ui/intro/story";
const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1280, 720);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
document.body.prepend(renderer.domElement);
const camera = new T.PerspectiveCamera(42, 1280 / 720, 0.1, 200);
const loader = new GLTFLoader();
const cache = new Map();
const mixers: T.AnimationMixer[] = [];
async function asset(
  path: string,
  height: number,
  parent: T.Object3D,
  x: number,
  z: number,
  anim = "idle",
) {
  if (!cache.has(path)) cache.set(path, await loader.loadAsync(path));
  const gltf = cache.get(path),
    model = clone(gltf.scene),
    group = new T.Group();
  const box = new T.Box3().setFromObject(model),
    size = box.getSize(new T.Vector3());
  const k = height / size.y;
  model.scale.setScalar(k);
  model.position.y = -box.min.y * k;
  model.traverse((o: any) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  group.add(model);
  group.position.set(x, 0.28, z);
  parent.add(group);
  if (gltf.animations.length) {
    const mixer = new T.AnimationMixer(model);
    mixer
      .clipAction(gltf.animations.find((a: any) => a.name === anim) || gltf.animations[0])
      .play();
    mixers.push(mixer);
  }
  return group;
}
function block(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
) {
  const m = new T.Mesh(
    new T.BoxGeometry(w, h, d),
    new T.MeshStandardMaterial({ color, roughness: 0.8 }),
  );
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function label(
  parent: T.Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  bg = "#b52c38",
  fg = "#fff1d8",
) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 98px Arial";
  ctx.fillText(text, 512, 133, 940);
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  const m = new T.Mesh(
    new T.PlaneGeometry(w, h),
    new T.MeshStandardMaterial({ map, roughness: 1 }),
  );
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function tree(parent: T.Object3D, x: number, z: number, k = 1) {
  block(parent, x, 1.2 * k, z, 0.25 * k, 2.4 * k, 0.25 * k, "#856749");
  for (let i = 0; i < 3; i++) {
    const m = new T.Mesh(
      new T.IcosahedronGeometry((1.2 - i * 0.16) * k, 1),
      new T.MeshStandardMaterial({ color: ["#647e53", "#7c965d", "#8aa16a"][i] }),
    );
    m.position.set(x + (i - 1) * 0.4 * k, (2.6 + i * 0.45) * k, z);
    m.castShadow = true;
    parent.add(m);
  }
}
function setup(warm: boolean) {
  const s = new T.Scene();
  s.background = new T.Color(warm ? "#eed7ad" : "#b8d3dc");
  s.fog = new T.Fog(warm ? "#eed7ad" : "#b8d3dc", 45, 100);
  s.add(new T.HemisphereLight(warm ? "#fff0d2" : "#e7f4ff", "#8b886d", 2.4));
  const sun = new T.DirectionalLight(warm ? "#ffd7a0" : "#ffedcf", 3.1);
  sun.position.set(-12, 18, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -25,
    right: 25,
    top: 25,
    bottom: -25,
    near: 1,
    far: 70,
  });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.035;
  s.add(sun);
  block(s, 0, -0.15, 0, 140, 0.25, 140, warm ? "#b9a584" : "#8da47b");
  block(s, 0, 0.02, 7, 60, 0.1, 8, warm ? "#b6a185" : "#666d70");
  block(s, 0, 0.12, 1, 30, 0.3, 5, "#c5bca7");
  for (let x = -24; x <= 24; x += 8) {
    tree(s, x, -8, 1.6);
    if (!warm) block(s, x, 0.085, 7, 3, 0.02, 0.13, "#eee7c7");
  }
  return s;
}
function shop(s: T.Object3D, modern = false) {
  const g = new T.Group();
  s.add(g);
  block(g, 0, 1.8, -3, 12, 3.6, 6, modern ? "#849294" : "#d8b888");
  // Open front: dark inset with shelving and freestanding timber posts.
  block(g, 0, 1.65, 0.035, 9.8, 3.05, 0.12, "#4c4033");
  for (const x of [-3.4, 3.4]) {
    for (const side of [-1, 1]) block(g, x + side * 1.15, 1.35, 0.35, 0.1, 2.5, 0.5, "#aa8a5e");
    for (let row = 0; row < 3; row++) {
      block(g, x, 0.45 + row * 0.68, 0.45, 2.4, 0.1, 0.65, "#c3a575");
      for (let col = 0; col < 7; col++)
        block(
          g,
          x - 1 + col * 0.32,
          0.7 + row * 0.68,
          0.46,
          0.23,
          0.42,
          0.32,
          ["#aa4c43", "#d8bb78", "#8d9d78", "#dfcca0"][(col + row) % 4],
        );
    }
  }
  for (const x of [-1.6, 1.6]) block(g, x, 1.4, 0.22, 0.1, 2.7, 0.18, "#bca481");
  block(g, 0, 0.32, 0.5, 3.1, 0.08, 1.1, "#b0a18a");
  for (const x of [-5.4, 5.4])
    block(g, x, 1.8, 0.2, 0.32, 3.6, 0.35, modern ? "#c33840" : "#816244");
  block(g, 0, 3.65, -2.2, 13, 0.25, 8, modern ? "#dbe0d7" : "#835640");
  for (let x = -6; x < 6; x += 0.6)
    block(g, x, 3.37, 1.5, 0.6, 0.2, 2, x % 1.2 < 0.1 ? "#ab3939" : "#ecd9b0");
  label(
    g,
    modern ? "TOKO CUNG WORLD" : "TOKO CUNG",
    0,
    3.25,
    2.53,
    8,
    0.65,
    modern ? "#aa2d38" : "#715138",
  );
  if (modern) {
    block(g, 0, 5.7, -3, 12, 3.6, 6, "#78888c");
    for (const x of [-4, -1.35, 1.35, 4]) {
      block(g, x, 5.65, 0.09, 2.2, 2.5, 0.15, "#d6d9cf");
      block(g, x, 5.65, 0.18, 2, 2.25, 0.08, "#38515e");
      block(g, x, 5.65, 0.24, 0.06, 2.25, 0.06, "#b8cec8");
    }
    block(g, 0, 7.65, -3, 12.5, 0.3, 6.5, "#d6d9cf");
    for (const x of [-5.6, 5.6]) block(g, x, 5.5, 0.25, 0.4, 4, 0.4, "#b52f3b");
    label(g, "SEJAK 1965", 0, 7.04, 0.3, 4, 0.55, "#263c44");
  } else {
    for (let x = -6; x <= 6; x += 0.3) {
      const roof = block(g, x, 4.1, -3, 0.28, 0.12, 7, "#926747");
      roof.rotation.x = 0.08;
    }
  }
  return g;
}
const scenes = [setup(true), setup(true), setup(false), setup(false)];
shop(scenes[0]);
shop(scenes[1]);
const modern = shop(scenes[2], true);
const heritage = shop(scenes[2]);
shop(scenes[3], true);
const clerk = await asset(
  "/models/characters/character-male-a.glb",
  1.85,
  scenes[0],
  -1,
  0.6,
  "idle",
);
const walker = await asset(
  "/models/characters/character-female-a.glb",
  1.7,
  scenes[0],
  3,
  3,
  "walk",
);
for (const [i, x] of [-3.7, 2.8].entries()) {
  await asset("/models/furniture/cardboardBoxClosed.glb", 0.65, scenes[0], x, 1.4);
  await asset("/models/food/bag.glb", 0.55, scenes[0], x + 0.7, 1.4);
}
const a = await asset(
  "/models/characters/character-male-a.glb",
  1.85,
  scenes[1],
  -1.2,
  1.4,
  "holding-both",
);
a.rotation.y = 0.8;
const b = await asset(
  "/models/characters/character-female-b.glb",
  1.7,
  scenes[1],
  1.1,
  2.1,
  "interact-right",
);
b.rotation.y = -1.5;
const parcel = await asset("/models/furniture/cardboardBoxClosed.glb", 0.42, scenes[1], -0.3, 1.8);
parcel.position.y = 1.15;
block(scenes[1], -3, 0.5, 1.5, 2, 1, 1, "#957044");
for (let i = 0; i < 7; i++)
  await asset("/models/food/carton.glb", 0.35, scenes[1], -3.8 + i * 0.25, 1.5).then(
    (o) => (o.position.y = 1.08),
  );
const child = await asset(
  "/models/characters/character-male-c.glb",
  1.15,
  scenes[1],
  2.1,
  2.7,
  "emote-yes",
);
child.rotation.y = -1.7;
for (const scene of [scenes[2], scenes[3]]) {
  for (const x of [-20, 18]) await asset("/models/city/building-b.glb", 10, scene, x, -7);
  for (const x of [-8, 8]) {
    tree(scene, x, 1, 1.1);
    block(scene, x, 0.7, 3, 2.2, 0.16, 0.8, "#89694f");
    for (const dx of [-0.8, 0.8]) block(scene, x + dx, 0.45, 3, 0.12, 0.5, 0.6, "#555d53");
  }
}
for (let x = 0; x < 3; x++)
  for (let y = 0; y < 2; y++)
    await asset(
      "/models/furniture/cardboardBoxClosed.glb",
      0.75,
      scenes[2],
      7 + x * 0.8,
      -0.4,
    ).then((o) => (o.position.y = 0.28 + y * 0.75));
const worker = await asset("/models/characters/character-male-d.glb", 1.8, scenes[2], 6, 2, "walk");
const truck = new T.Group();
scenes[2].add(truck);
block(truck, 0, 1, 0, 3, 1.7, 1.8, "#e9dcc4");
block(truck, 2, 0.9, 0, 1.2, 1.5, 1.8, "#af3540");
block(truck, 2, 1.25, 0.92, 0.8, 0.55, 0.03, "#405b68");
for (const x of [-1, 1.8])
  for (const z of [-0.95, 0.95]) {
    const wheel = new T.Mesh(
      new T.CylinderGeometry(0.4, 0.4, 0.2, 20),
      new T.MeshStandardMaterial({ color: "#283039" }),
    );
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.38, z);
    truck.add(wheel);
  }
const hero = await asset("/assets/characters/toko-cung-explorer.glb", 1.9, scenes[3], 0, 5, "walk");
hero.rotation.y = Math.PI;
const npc = await asset(
  "/models/characters/character-female-a.glb",
  1.8,
  scenes[3],
  -2,
  1.8,
  "emote-yes",
);
const friend = await asset("/models/characters/character-male-b.glb", 1.8, scenes[3], 2, 2, "idle");
const subtitle = new URLSearchParams(location.search).has("subtitles");
function render(clip: number, t: number) {
  const u = t / 10,
    smooth = u * u * (3 - 2 * u);
  modern.visible = clip !== 2 || t >= 2.5;
  heritage.visible = clip === 2 && t < 2.5;
  document.getElementById("transition")!.style.opacity = String(
    clip === 2 ? Math.max(0, 1 - Math.abs(t - 2.5) / 0.65) : 0,
  );
  mixers.forEach((m) => m.setTime(t));
  if (clip === 0) {
    camera.position.set(13 - 5 * smooth, 7 - 2 * smooth, 18 - 5 * smooth);
    camera.lookAt(0, 1.8, -0.5);
    walker.position.x = 4 - t * 0.45;
    walker.rotation.y = -Math.PI / 2;
  }
  if (clip === 1) {
    camera.position.set(6 - 3 * smooth, 3.7, 9 - 1.6 * smooth);
    camera.lookAt(-0.2, 1.5, 1.3);
    parcel.position.x = -0.3 + Math.min(1, t / 5) * 0.9;
  }
  if (clip === 2) {
    camera.position.set(-14 + 23 * smooth, 7 + 2 * Math.sin(u * Math.PI), 20);
    camera.lookAt(0, 3, -0.5);
    truck.position.set(-14 + t * 2.7, 0, 7);
    worker.position.x = 6 - t * 0.28;
    worker.rotation.y = -Math.PI / 2;
  }
  if (clip === 3) {
    camera.position.set(5 - 4 * smooth, 4 + 1.5 * smooth, 13 - 3 * smooth);
    camera.lookAt(0, 2.7, -0.5);
    hero.position.z = 5 - Math.min(3.5, t * 0.4);
  }
  const c = INTRO_CLIPS[clip];
  document.getElementById("caption")!.innerHTML = subtitle
    ? `<small>0${clip + 1} / THE JOURNEY OF TRUST</small><strong>${c.title}</strong><p>${c.text}</p>`
    : "";
  renderer.render(scenes[clip], camera);
}
Object.assign(window, { cinematic: { render, ready: true } });
render(0, 0);
