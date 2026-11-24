// Records the story intro from the live game (world.tokocung.com) with a scripted camera.
// Usage: INTRO_STATE=<playwright storageState of a guest/test account> node scripts/record-intro.mjs
// Capture browser only: scripts/intro/cine-init.js hides all HUD, chat and name labels, freezes time per frame
// and overrides the camera. Nothing is written to the game server except the read-only gang "read" on entry.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = root + "/public/assets/intro";
const temp = process.env.INTRO_RENDER_TEMP || "/tmp/toko-intro-record";
const site = process.env.INTRO_URL || "https://world.tokocung.com";
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const preview = process.env.INTRO_PREVIEW === "1";
if (!process.env.INTRO_STATE)
  throw new Error("INTRO_STATE (storageState JSON of a guest/test account) is required");
await mkdir(temp, { recursive: true });
function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], {
      stdio: "inherit",
    });
    p.on("error", reject);
    p.on("exit", (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg exit ${c}`))));
  });
}

// Original synthesized score (no samples): one 40 s piece, one section per clip.
const rate = 44100,
  duration = 40,
  count = rate * duration,
  wav = Buffer.alloc(44 + count * 2);
wav.write("RIFF");
wav.writeUInt32LE(36 + count * 2, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(count * 2, 40);
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const F = [53, 57, 60],
  C = [48, 52, 55],
  Dm = [50, 53, 57],
  Bb = [46, 50, 53],
  Gm = [43, 46, 50],
  A = [45, 49, 52],
  G = [43, 47, 50],
  Am = [45, 48, 52],
  F2 = [41, 45, 48];
// 1965 warm → closing, minor → busy city → homecoming theme.
const chords = [F, C, Dm, Bb, Dm, Bb, Gm, A, C, G, Am, F2, F, C, Bb, F];
const melody = [[72, 69, 67, 65, 67, 69, 72, 74], null, null, [72, 74, 76, 77, 76, 74, 72, 77]];
for (let i = 0; i < count; i++) {
  const t = i / rate,
    clip = Math.floor(t / 10),
    local = t % 10,
    chord = chords[Math.min(15, Math.floor(t / 2.5))].map(hz),
    step = clip === 2 ? 0.25 : 0.5,
    beat = t % step,
    arp = chord[Math.floor(t / step) % 3] * 2;
  const pluck = Math.min(1, beat / 0.008) * Math.exp(-beat * (clip === 1 ? 4 : 7));
  let v = chord.reduce((n, f) => n + Math.sin(2 * Math.PI * f * t) * 0.016, 0);
  v += (Math.sin(2 * Math.PI * arp * t) + 0.25 * Math.sin(4 * Math.PI * arp * t)) * 0.06 * pluck;
  const bassT = t % 2.5;
  v += Math.sin(Math.PI * chord[0] * t) * 0.07 * Math.exp(-bassT * 1.2);
  if (clip === 2) {
    const k = t % 0.5;
    v += Math.sin(2 * Math.PI * (50 + 70 * Math.exp(-k * 30)) * k) * 0.16 * Math.exp(-k * 14);
  }
  const line = melody[clip];
  if (line) {
    const n = Math.min(7, Math.floor(local / 1.25)),
      mt = local - n * 1.25,
      f = hz(line[n]);
    v +=
      (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) *
      0.07 *
      Math.min(1, mt / 0.02) *
      Math.exp(-mt * (n === 7 && clip === 3 ? 0.6 : 2.2));
  }
  const edge = Math.min(1, local / 0.25, (10 - local) / 0.25),
    fade = Math.min(1, t / 1, clip === 3 ? (40 - t) / 2 : 1);
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * edge * fade * 32767), 44 + i * 2);
}
await writeFile(temp + "/music.wav", wav);

// Reviewed static city signs. Every other 3D text (player names, player warung names, NPC labels) is hidden.
const ALLOW = [
  "PARKIR",
  "DROP-OFF · KURIR",
  "MOTOR",
  "BATAS KOTA",
  "PUTAR BALIK",
  "RUMAH MAKAN MINANG",
  "CUNG ELEKTRONIK",
  "APOTEK WARGA",
  "MIE AYAM & BAKSO",
  "KONVEKSI NUSANTARA",
  "BENGKEL JAYA",
  "LAUNDRY BERSIH",
  "KOPI TETANGGA",
  "TOKO KAIN",
  "WARUNG NUSANTARA",
  "JASA FOTOKOPI",
  "TOKO SEPATU",
  "ROTI & KUE",
  "TOKO SEMBAKO",
  "PICKUP · KURIR",
  "BONGKAR",
  "INTERAKSI · MASUK",
  "AKAN HADIR",
  "🍛 WARTEG",
  "🏠 KOS-KOSAN",
  "HELIPAD · PEGUNUNGAN",
  "CUNG / BUILD",
  "PROYEK LANGIT",
  "START",
  "CHECKPOINT 1",
  "CHECKPOINT 2",
  "CHECKPOINT 3",
  "CHECKPOINT 4",
  "CHECKPOINT 5",
  "CHECKPOINT 6",
  "CHECKPOINT 7",
  "CHECKPOINT 8",
  "CHECKPOINT 9",
  "CHECKPOINT 10",
  "CHECKPOINT 11",
  "CHECKPOINT 12",
  "CHECKPOINT 13",
  "CHECKPOINT 14",
  "FINISH",
  "CP 1",
  "CP 2",
  "CP 3",
  "CP 4",
  "CP 5",
  "CP 6",
  "CP 7",
  "CP 8",
  "CP 9",
  "CP 10",
  "CP 11",
  "CP 12",
  "CP 13",
  "CP 14",
  "START · 59 PIJAKAN KE LANGIT",
  "JATUH? KEMBALI KE CHECKPOINT",
  "← KEMBALI KE PLAZA",
  "DERMAGA CUNG · PILIH PANCING & LEMPAR",
  "MANCING DI SINI",
  "ANALOG / WASD · BERENANG OTOMATIS",
  "TOMBOL LOMPAT / SPASI: MENGAYUH · KE TEPI UNTUK KELUAR",
  "← PANTAI",
  "MASUK LEWAT TEPI LANDAI",
  "PRINCIPAL DUNGEON",
  "DISTRIBUTION CENTER",
  "CUNG",
  "UNDERGROUND",
  "CLUB · LOUNGE",
  "SELAMAT DATANG",
  "TOKO CUNG",
  "GROSIR & RETAIL · TOKO CUNG",
  "TOKO CUNG · SELAMAT DATANG",
  "LIFT · 02 / 03",
  "SEGERA HADIR",
  "01 · GROSIR & RETAIL\n02 · LAYANAN & KOMUNITAS\n03 · STOK & PACKING",
  "02 / 03 · SEGERA HADIR",
  "BONGKAR MUAT",
  "VAN · DELIVERY",
  "GUDANG · AKSES LOADING",
  "RAK MAKANAN INSTAN",
  "RAK RUMAH TANGGA & ROKOK",
  "SEGAR SETIAP HARI",
  "RAK SEMBAKO",
  "GUDANG · KHUSUS STAF",
  "QUEST · XP · LEVEL UP",
  "BUKA QUEST BOARD",
  "QUEST",
  "ROKOK",
  "KASIR",
  "MAKANAN INSTAN · MINUMAN",
  "RUMAH TANGGA · SEMBAKO",
  "GUDANG · PACKING →",
  "POS SUPPLIER",
  "SEMENTARA",
  "PENERIMAAN GUDANG",
  "TOKO CUNG · BELAKANG",
  "PALET · 8 DUS",
  "GUNUNG\nCUNG",
  "Gerbang Kampung",
  "Papan Kampung",
];

const ease = (u) => u * u * (3 - 2 * u);
const mix = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
const path =
  (p0, p1, l0, l1, fov = 45) =>
  (u) => ({ p: mix(p0, p1, ease(u)), l: mix(l0, l1, ease(u)), fov });
const follow =
  (dp, dl, fov = 45) =>
  (u, me) => ({ p: me.map((v, i) => v + dp[i]), l: me.map((v, i) => v + dl[i]), fov });
// Gang shots of the empty teras first send the avatar up the lane, out of frame.
const away = (h) => [h[0] - 2, h[2] + 16];
// follow(): offsets from the avatar's name badge, which floats ~2.2 m up (head height + 0.4).
// Gang coordinates are relative to the guest's own house front (`home`), set after entering the gang.
const H = (x, y, z) => (h) => [h[0] + x, y, h[2] + z];
// 4 clips × 300 frames @30 fps. Recorded per location (city first, then gang), assembled per clip.
// Spawn → Gerbang Kampung, around the Toko Cung block.
const TO_GATE = [
  [0, 17],
  [-26, 17],
  [-28, -20],
];
const SHOTS = [
  // First, so the avatar is far from the Toko Cung shots afterwards.
  {
    clip: 3,
    at: 0,
    n: 105,
    min: 960,
    walk: [-30, -56.5],
    start: [...TO_GATE, [-30, -45]],
    cam: follow([0, 0.6, 5.5], [0, -1, -8]),
  },
  {
    clip: 0,
    at: 0,
    n: 105,
    min: 420,
    cam: path([0, 34, 50], [0, 10, 30], [0, 6, 3], [0, 5, 3], 50),
  },
  {
    clip: 0,
    at: 105,
    n: 105,
    min: 430,
    cam: path([-9, 2.6, 18], [-4, 2.3, 13], [0, 2.6, 3], [0, 2.4, 3]),
  },
  {
    clip: 2,
    at: 0,
    n: 120,
    min: 720,
    cam: path([46, 16, 14], [30, 13, 20], [0, 1, 6], [-4, 1, 6]),
  },
  {
    clip: 2,
    at: 120,
    n: 90,
    min: 725,
    cam: path([-22, 2.4, 25.5], [-10, 2.4, 25.5], [10, 1.5, 17], [18, 1.5, 17], 50),
  },
  {
    clip: 2,
    at: 210,
    n: 90,
    min: 730,
    cam: path([2, 2.4, 26], [0.5, 2.6, 19], [0, 4.5, 3], [0, 4.6, 3], 50),
  },
  "gang",
  {
    clip: 0,
    at: 210,
    n: 90,
    min: 440,
    start: away,
    cam: (u, me, h) =>
      path(H(-5, 2.1, -7)(h), H(-3.8, 1.9, -6)(h), H(4.5, 1.2, -1.5)(h), H(4.5, 1.2, -1.5)(h))(u),
  },
  {
    clip: 1,
    at: 0,
    n: 120,
    min: 600,
    rate: 60,
    start: away,
    cam: (u, me, h) =>
      path(H(-6, 3.2, -10)(h), H(-6.5, 3, -8)(h), H(5, 1.4, 0)(h), H(5, 1.4, 0)(h))(u),
  },
  {
    clip: 1,
    at: 120,
    n: 90,
    min: 1110,
    rate: 30,
    cam: (u, me, h) =>
      path(H(-3, 2, 8)(h), H(-3.4, 2, 6.5)(h), H(6, 1.6, 0)(h), H(6, 1.6, 0)(h))(u),
  },
  {
    clip: 1,
    at: 210,
    n: 90,
    min: 1230,
    cam: (u, me, h) =>
      path(H(-2.5, 1.7, -5)(h), H(-1.8, 1.6, -4.4)(h), H(4, 1.2, -1.5)(h), H(4, 1.2, -1.5)(h))(u),
  },
  {
    clip: 3,
    at: 105,
    n: 105,
    min: 600,
    walk: "lane",
    cam: follow([-1.2, 0.4, -4.5], [0, -0.9, 5]),
  },
  {
    clip: 3,
    at: 210,
    n: 90,
    min: 605,
    walk: "door",
    cam: (u, me, h) =>
      path(H(-1.5, 2.2, -4)(h), H(0.8, 1.7, -0.6)(h), H(6, 1.3, 2)(h), H(6, 1.3, 2)(h))(u),
  },
];

// INTRO_GANG_PROBE='[minutes,...]' records one gang frame per world time (sky check), clip folder "clip9".
if (process.env.INTRO_GANG_PROBE)
  SHOTS.splice(
    0,
    SHOTS.length,
    "gang",
    ...JSON.parse(process.env.INTRO_GANG_PROBE).map((min, at) => ({
      clip: 9,
      at,
      n: 1,
      min,
      cam: (u, me, h) =>
        path(H(-6, 3, -10)(h), H(-6, 3, -10)(h), H(5, 1.4, 0)(h), H(5, 1.4, 0)(h))(u),
    })),
  );
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  storageState: process.env.INTRO_STATE,
});
await ctx.addInitScript({ path: root + "/scripts/intro/cine-init.js" });
const page = await ctx.newPage();
// The prolog would pull the avatar into its own Rumah scene; the capture browser keeps it in the city.
await page.route("**/_serverFn/**", (r) =>
  /"s":"prolog"/.test(r.request().postData() || "") ? r.abort() : r.continue(),
);
page.on("pageerror", (e) => console.error("page:", e.message));
if (process.env.INTRO_DEBUG)
  page.on("response", async (r) => {
    const b = r.request().postData() || "";
    const op = /"operation"[^}]*?"s":"([a-z-]+)"/.exec(b)?.[1];
    if (op)
      console.log(
        "op",
        op,
        r.status(),
        (await r.text().catch(() => "")).match(/SQLSTATE[^"]{0,400}/)?.[0] ?? "",
      );
  });
const ui = (on) => page.evaluate((v) => document.documentElement.classList.toggle("cine", !v), on);
async function closeDialogs() {
  for (let i = 0; i < 4; i++) {
    const close = page.locator('button[aria-label^="Tutup"]:visible').first();
    if (await close.count()) await close.click().catch(() => {});
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
}
await page.goto(site + "/world", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const skip = page.getByRole("button", { name: "Lewati" });
if (await skip.isVisible().catch(() => false)) await skip.click();
await page.getByRole("button", { name: /Masuk Dunia/ }).click();
await page.waitForTimeout(10000);
await closeDialogs();
const name = (await page.getByRole("button", { name: "Buka profil dan progression" }).innerText())
  .split("\n")
  .find((l) => /\D/.test(l));
// Finds the game camera and the avatar's own name badge (position tracker); repeated when a scene remounts.
async function bind() {
  await page.evaluate(() => __cine.calls.clear());
  await page.waitForTimeout(1500);
  await page.evaluate(
    ([a, n]) => {
      __cine.allow = new Set(a);
      __cine.gameDir = null;
      __cine.pickMain();
      window.__meName = n;
    },
    [ALLOW, name],
  );
}
await bind();
await ui(false);
// The badge can remount (new object); re-find it whenever it is no longer attached to a scene.
const me = (tries = 0) =>
  page
    .evaluate(() => {
      const attached = (o) => {
        while (o?.parent) o = o.parent;
        return !!o?.isScene;
      };
      if (!attached(window.__me))
        for (const s of __cine.scenes)
          s.traverse((o) => {
            if (o.text === window.__meName && o.parent.children.length <= 2) window.__me = o;
          });
      return (
        attached(window.__me) &&
        window.__me.getWorldPosition(window.__me.position.clone()).toArray()
      );
    })
    .then(async (p) => {
      if (p) return p;
      if (tries > 20) {
        const seen = await page.evaluate(() => {
          const r = [];
          for (const s of __cine.scenes)
            s.traverse((o) => {
              if (typeof o.text === "string" && /Tamu/.test(o.text))
                r.push(o.text + ":" + o.parent?.children.length);
            });
          return r.join(",");
        });
        await page.screenshot({ path: temp + "/no-label.jpg", type: "jpeg", quality: 60 });
        throw new Error(`avatar label not found for ${name}; seen ${seen}`);
      }
      await page.waitForTimeout(500);
      return me(tries + 1);
    });
const held = new Set();
async function keys(want) {
  for (const k of [...held]) if (!want.has(k)) (held.delete(k), await page.keyboard.up(k));
  for (const k of want) if (!held.has(k)) (held.add(k), await page.keyboard.down(k));
}
// WASD relative to the game's own camera heading, so the avatar walks toward [x, z].
async function steer([x, z], run = false) {
  const [px, , pz] = await me();
  const d = Math.hypot(x - px, z - pz);
  if (d < 0.6) return (keys(new Set()), true);
  const [fx, , fz] = await (await page.waitForFunction(() => __cine.gameDir)).jsonValue();
  const n = Math.hypot(fx, fz),
    a = ((x - px) * fx + (z - pz) * fz) / d / n,
    b = ((x - px) * -fz + (z - pz) * fx) / d / n;
  const want = new Set(run ? ["Shift"] : []);
  if (a > 0.38) want.add("w");
  if (a < -0.38) want.add("s");
  if (b > 0.38) want.add("d");
  if (b < -0.38) want.add("a");
  await keys(want);
  return false;
}
async function walkTo(target, ms = 45000) {
  await page.evaluate(() => (__cine.cam = null));
  let last = await me(),
    lastT = Date.now(),
    side = "d";
  for (const t0 = Date.now(); Date.now() - t0 < ms; await page.waitForTimeout(100)) {
    if (await steer(target, true)) return;
    if (Date.now() - lastT < 1500) continue;
    const now = await me();
    // Stuck on street furniture: sidestep, alternating sides.
    if (Math.hypot(now[0] - last[0], now[2] - last[2]) < 1) {
      await keys(new Set([side, "Shift"]));
      await page.waitForTimeout(700);
      side = side === "d" ? "a" : "d";
    }
    last = now;
    lastT = Date.now();
  }
  await ui(true);
  await page.screenshot({ path: temp + "/walk-timeout.jpg", type: "jpeg", quality: 60 });
  throw new Error(`walk timeout ${target} at ${await me()}`);
}
let home = null;
// INTRO_PROBE='[[x,y,z, lx,ly,lz, minutes], ...]' screenshots city cameras for framing, then exits.
if (process.env.INTRO_PROBE) {
  for (const [i, [x, y, z, lx, ly, lz, m]] of JSON.parse(process.env.INTRO_PROBE).entries()) {
    await page.evaluate(
      ([c, m]) => {
        __cine.setWorldMinutes(m);
        __cine.cam = c;
      },
      [{ p: [x, y, z], l: [lx, ly, lz], fov: 50 }, m ?? 720],
    );
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${temp}/probe-${i}.jpg`, type: "jpeg", quality: 70 });
  }
  await browser.close();
  process.exit(0);
}
async function record(shot) {
  const walk =
    shot.walk === "lane"
      ? [home[0] - 2, home[2] - 2]
      : shot.walk === "door"
        ? [home[0] + 2.5, home[2] + 1.5]
        : shot.walk;
  const start = typeof shot.start === "function" ? [shot.start(home)] : shot.start || [];
  for (const p of start) await walkTo(p);
  if (shot.walk === "lane") await walkTo([home[0] - 2, home[2] - 14]);
  await page.evaluate(
    ([m, rate]) => {
      __cine.manualOff();
      __cine.setWorldMinutes(m);
      __cine.dateRate = rate;
    },
    [shot.min, shot.rate || 1],
  );
  await page.waitForTimeout(5000); // sky and light ease toward the new time
  await page.evaluate(() => __cine.manualOn());
  const dir = `${temp}/clip${shot.clip}`;
  await mkdir(dir, { recursive: true });
  for (let i = 0; i < shot.n; i++) {
    if (walk) await steer(walk);
    const pos = await me();
    if (process.env.INTRO_DEBUG && walk && i % 30 === 0)
      console.log(
        "walk",
        shot.clip,
        i,
        pos.map((v) => v.toFixed(1)).join(","),
        await page.evaluate(() =>
          __cine.main.position
            .toArray()
            .map((v) => v.toFixed(1))
            .join(","),
        ),
      );
    await page.evaluate(
      (c) => {
        __cine.cam = c;
        __cine.step();
      },
      shot.cam(i / (shot.n - 1), pos, home),
    );
    if (preview && i !== Math.floor(shot.n / 2)) continue;
    await page.screenshot({ path: `${dir}/${String(shot.at + i).padStart(4, "0")}.png` });
  }
  await keys(new Set());
  await page.evaluate(() => {
    __cine.manualOff();
    __cine.dateRate = 1;
  });
  console.log(`clip ${shot.clip} @${shot.at}: ${shot.n} frames`);
}
try {
  for (const shot of SHOTS) {
    if (shot !== "gang") {
      await record(shot);
      continue;
    }
    const [x, , z] = await me();
    if (Math.hypot(x + 30, z + 57) > 20) for (const p of TO_GATE) await walkTo(p);
    await walkTo([-30, -57.3]);
    await ui(true);
    await page
      .getByRole("button", { name: /Masuk gang/ })
      .click({ timeout: 10000 })
      .catch(async (e) => {
        await page.screenshot({ path: temp + "/gate.jpg", type: "jpeg", quality: 60 });
        throw new Error(
          `no gang entry at ${await me()}: ${await page.locator("button:visible").allInnerTexts()}`,
          { cause: e },
        );
      });
    await page.waitForTimeout(8000);
    await closeDialogs();
    await bind();
    await ui(false);
    home = await me(); // the gang spawns the guest at its own house front
  }
} finally {
  await browser.close();
}
if (preview) process.exit(0);

const ids = ["mampang", "trust", "evolution", "journey"];
// Sepia strength per clip: 1965 → warung Mbah → today → homecoming (fades to white into the prolog).
const sepia = (k) => {
  const m = [
    [0.393, 0.769, 0.189],
    [0.349, 0.686, 0.168],
    [0.272, 0.534, 0.131],
  ];
  return (
    "colorchannelmixer=" +
    m
      .flatMap((r, i) => [...r.map((v, j) => (v * k + (i === j ? 1 - k : 0)).toFixed(3)), "0"])
      .join(":")
  );
};
// Clip 2 turns to evening once the warung has closed (t ≥ 4 s).
const grade = [
  `${sepia(0.75)},vignette=PI/4.5`,
  `${sepia(0.3)},eq=brightness=-0.1:saturation=0.75:enable='gte(t,4)',colorbalance=bs=0.12:bm=0.06:enable='gte(t,4)',vignette=PI/5`,
  "vignette=PI/6",
  "vignette=PI/6,fade=t=out:st=8.6:d=1.2:color=white",
];
for (let clip = 0; clip < 4; clip++) {
  await run([
    "-framerate",
    "30",
    "-i",
    `${temp}/clip${clip}/%04d.png`,
    "-ss",
    String(clip * 10),
    "-t",
    "10",
    "-i",
    temp + "/music.wav",
    "-vf",
    `${grade[clip]},fade=t=in:st=0:d=0.3,format=yuv420p`,
    "-t",
    "10",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    process.env.INTRO_CRF || "28",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-movflags",
    "+faststart",
    `${output}/${ids[clip]}.mp4`,
  ]);
  await run([
    "-ss",
    "4.5",
    "-i",
    `${output}/${ids[clip]}.mp4`,
    "-frames:v",
    "1",
    "-q:v",
    "4",
    `${output}/${ids[clip]}.jpg`,
  ]);
}
const sizes = await Promise.all(ids.map((id) => stat(`${output}/${id}.mp4`)));
const bytes = sizes.reduce((n, s) => n + s.size, 0);
console.log(`Four clips: ${(bytes / 1024 / 1024).toFixed(2)} MiB`);
if (bytes > 6 * 1024 * 1024) throw new Error(`Media budget exceeded: ${bytes}`);
