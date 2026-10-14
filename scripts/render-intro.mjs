import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
const root = fileURLToPath(new URL("..", import.meta.url));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const ffmpeg = process.env.FFMPEG_PATH || (await import("ffmpeg-static")).default;
const output = root + "/public/assets/intro",
  temp = process.env.INTRO_RENDER_TEMP || "/tmp/toko-intro-render";
await mkdir(output, { recursive: true });
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
// Original arpeggio: A minor → F major → C major → G major; no sampled music.
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
const chords = [
  [220, 261.626, 329.628],
  [174.614, 220, 261.626],
  [196, 261.626, 329.628],
  [196, 246.942, 293.665],
];
for (let i = 0; i < count; i++) {
  const t = i / rate,
    chord = chords[Math.floor(t / 10) % 4],
    beat = t % 0.5,
    note = chord[Math.floor(t / 0.5) % 3] * 2;
  const env = Math.min(1, beat / 0.012) * Math.exp(-beat * 7);
  const pad = chord.reduce((n, f) => n + Math.sin(2 * Math.PI * f * t) * 0.018, 0);
  const bell =
    (Math.sin(2 * Math.PI * note * t) + 0.22 * Math.sin(2 * Math.PI * note * 2 * t)) * 0.075 * env;
  const fade = Math.min(1, t / 2, (40 - t) / 2);
  wav.writeInt16LE(Math.round((pad + bell) * fade * 32767), 44 + i * 2);
}
await writeFile(temp + "/music.wav", wav);
const server = await createServer({
  configFile: false,
  root: root + "/scripts/cinematic",
  publicDir: root + "/public",
  server: { host: "127.0.0.1", port: 4239, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true });
const ids = ["mampang", "trust", "evolution", "journey"];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (e) => console.error(e));
  await page.goto("http://127.0.0.1:4239");
  await page.waitForFunction(() => window.cinematic?.ready, { timeout: 120000 });
  for (let clip = 0; clip < 4; clip++) {
    await page.evaluate((c) => window.cinematic.render(c, 4), clip);
    await page.screenshot({ path: output + "/" + ids[clip] + ".jpg", type: "jpeg", quality: 90 });
  }
  if (process.env.INTRO_POSTERS_ONLY === "1") {
    console.log("Posters ready");
  } else {
    for (let clip = 0; clip < 4; clip++) {
      const encoder = spawn(
        ffmpeg,
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-f",
          "image2pipe",
          "-vcodec",
          "png",
          "-framerate",
          "30",
          "-i",
          "pipe:0",
          "-ss",
          String(clip * 10),
          "-i",
          temp + "/music.wav",
          "-t",
          "10",
          "-c:v",
          "libx264",
          "-preset",
          "medium",
          "-crf",
          "24",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
          output + "/" + ids[clip] + ".mp4",
        ],
        { stdio: ["pipe", "inherit", "inherit"] },
      );
      const done = once(encoder, "exit");
      for (let frame = 0; frame < 300; frame++) {
        await page.evaluate(([c, t]) => window.cinematic.render(c, t), [clip, frame / 30]);
        const png = await page.screenshot({ type: "png" });
        if (!encoder.stdin.write(png)) await once(encoder.stdin, "drain");
      }
      encoder.stdin.end();
      const [code] = await done;
      if (code !== 0) throw new Error("Encoding failed");
      console.log(`${ids[clip]}: 300 frames rendered`);
    }
    await writeFile(temp + "/concat.txt", ids.map((id) => `file '${output}/${id}.mp4'`).join("\n"));
    await run([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      temp + "/concat.txt",
      "-c",
      "copy",
      temp + "/combined.mp4",
    ]);
    const captions = [
      "Di Mampang, sejak 1965, sebuah perjalanan\ndimulai dari toko sederhana.",
      "Generasi berganti. Kepercayaan tumbuh lewat\npelayanan, kejujuran, dan kebersamaan.",
      "Dunia terus berubah. Nilai yang\nmenyatukan kita tetap sama.",
      "Kini, giliranmu. Jelajahi dunia, bantu sesama,\ndan bangun ceritamu di Toko Cung World.",
    ];
    const font = process.env.INTRO_FONT_PATH || "/System/Library/Fonts/Supplemental/Arial.ttf";
    const filters = [];
    for (let i = 0; i < 4; i++) {
      await writeFile(temp + `/caption-${i}.txt`, captions[i]);
      filters.push(
        `drawtext=fontfile='${font}':textfile='${temp}/caption-${i}.txt':fontsize=26:fontcolor=white:box=1:boxcolor=0x101820@0.8:boxborderw=18:x=(w-tw)/2:y=h-th-45:enable='gte(t,${i * 10})*lt(t,${(i + 1) * 10})'`,
      );
    }
    await run([
      "-i",
      temp + "/combined.mp4",
      "-vf",
      filters.join(","),
      "-t",
      "40",
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-crf",
      "24",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "copy",
      "-movflags",
      "+faststart",
      output + "/toko-cung-story.mp4",
    ]);
    const sizes = await Promise.all(ids.map((id) => stat(output + "/" + id + ".mp4")));
    const bytes = sizes.reduce((n, s) => n + s.size, 0);
    if (bytes > 12 * 1024 * 1024) throw new Error(`Media budget exceeded: ${bytes}`);
    console.log(`Four clips: ${(bytes / 1024 / 1024).toFixed(2)} MiB`);
  }
} finally {
  await browser.close();
  await server.close();
}
