// Shareable result card (Threads portrait 1080×1350), drawn on a plain canvas — no extra deps.
import { rupiah, rupiahShort } from "@/game/warung/model";

export interface ShareStats {
  playerName: string;
  playerLevel: number;
  warungName: string;
  warungLevel: number;
  levelName: string;
  totalSales: number;
  /** null = no kos yet (row hidden). */
  kos: { tenants: number; rooms: number } | null;
  /** Server only exposes trips this hour; null/0 hides the row. */
  ojekTrips: number | null;
}

export const SHARE_URL = "world.tokocung.com";
const W = 1080;
const H = 1350;
const FONT = "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif";
const C = {
  bg: "#fbf4e9",
  paper: "#fffdf8",
  ink: "#6b4a33",
  muted: "#8b705b",
  line: "#e8d8c0",
  orange: "#ff9a3d",
  orangeDeep: "#d9741c",
  cyan: "#38bad6",
  cyanInk: "#134e63",
  soft: "#fff0ce",
};

export function shareCaption(s: ShareStats) {
  return `Omzet warungku ${rupiahShort(s.totalSales)} di Toko Cung World 😎 ${SHARE_URL}`;
}

function font(size: number) {
  return `700 ${size}px ${FONT}`;
}

/** Largest size ≤ max that fits the width (min 60% of max), then ellipsis. */
function fitText(ctx: CanvasRenderingContext2D, text: string, max: number, width: number) {
  let size = max;
  ctx.font = font(size);
  while (ctx.measureText(text).width > width && size > max * 0.6) ctx.font = font((size -= 2));
  let t = text;
  while (ctx.measureText(t).width > width && t.length > 1) t = t.slice(0, -1);
  return t === text ? t : `${t.slice(0, -1)}…`;
}

function card(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
) {
  ctx.save();
  ctx.fillStyle = "rgba(121, 88, 77, 0.14)";
  ctx.beginPath();
  ctx.roundRect(x, y + 8, w, h, 40);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 40);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function pill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  bg: string,
  fg: string,
) {
  ctx.font = font(size);
  const w = ctx.measureText(text).width + size * 1.4;
  const h = size * 1.9;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + size * 0.7, y + h / 2 + 1);
  ctx.textBaseline = "alphabetic";
  return w;
}

/** Warung canopy: orange/cream stripes with a scalloped edge. */
function awning(ctx: CanvasRenderingContext2D) {
  const stripe = 90;
  const depth = 150;
  for (let i = 0; i * stripe < W; i++) {
    ctx.fillStyle = i % 2 ? C.paper : C.orange;
    ctx.beginPath();
    ctx.moveTo(i * stripe, 0);
    ctx.lineTo((i + 1) * stripe, 0);
    ctx.lineTo((i + 1) * stripe, depth);
    ctx.arc(i * stripe + stripe / 2, depth, stripe / 2, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = C.orangeDeep;
  ctx.fillRect(0, 0, W, 18);
}

export function drawResultCard(canvas: HTMLCanvasElement, s: ShareStats) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const pad = 72;
  const inner = W - pad * 2;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  awning(ctx);

  // Warung identity
  // Vertical budget: content must end above the footer (~y 1130) with both side rows shown.
  pill(ctx, "TOKO CUNG WORLD", pad, 228, 26, C.cyan, "#fff");
  ctx.fillStyle = C.ink;
  ctx.fillText(fitText(ctx, s.warungName, 88, inner), pad, 362);
  pill(ctx, `Lv.${s.warungLevel} · ${s.levelName}`, pad, 390, 32, C.orange, "#fff");

  // Hero number
  let y = 490;
  card(ctx, pad, y, inner, 250, C.paper);
  ctx.fillStyle = C.muted;
  ctx.font = font(38);
  ctx.fillText("Total jualan warungku", pad + 56, y + 76);
  ctx.fillStyle = C.orangeDeep;
  ctx.fillText(fitText(ctx, rupiah(s.totalSales), 118, inner - 112), pad + 56, y + 194);
  y += 250 + 32;

  // Side hustles (only rows the player actually has)
  const rows: [string, string][] = [];
  if (s.kos) rows.push(["🛏️  Kamar kos terisi", `${s.kos.tenants}/${s.kos.rooms}`]);
  if (s.ojekTrips) rows.push(["🛵  Trip ojol jam ini", String(s.ojekTrips)]);
  const gap = 24;
  const rowW = rows.length > 1 ? (inner - gap) / 2 : inner;
  rows.forEach(([label, value], i) => {
    const x = pad + i * (rowW + gap);
    card(ctx, x, y, rowW, 170, C.soft);
    ctx.fillStyle = C.muted;
    ctx.fillText(fitText(ctx, label, 32, rowW - 80), x + 40, y + 62);
    ctx.fillStyle = C.ink;
    ctx.font = font(72);
    ctx.fillText(value, x + 40, y + 144);
  });
  if (rows.length) y += 170 + 32;

  // Player
  card(ctx, pad, y, inner, 150, C.paper);
  const cx = pad + 95;
  const cy = y + 75;
  ctx.fillStyle = C.cyan;
  ctx.beginPath();
  ctx.arc(cx, cy, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); // simple person glyph
  ctx.arc(cx, cy - 14, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy + 28, 30, 18, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = C.orange;
  ctx.beginPath();
  ctx.arc(cx + 40, cy + 38, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = font(26);
  ctx.fillText(String(s.playerLevel), cx + 40, cy + 47);
  ctx.textAlign = "left";
  ctx.fillStyle = C.muted;
  ctx.font = font(28);
  ctx.fillText("Juragan", cx + 90, cy - 14);
  ctx.fillStyle = C.ink;
  ctx.fillText(fitText(ctx, s.playerName, 52, inner - 240), cx + 90, cy + 42);

  // Footer: brand line + URL, anchored to the bottom regardless of row count
  ctx.textAlign = "center";
  ctx.fillStyle = C.ink;
  ctx.font = font(34);
  ctx.fillText("Toko Cung World · Mampang · tokonya beneran ada", W / 2, H - 172);
  const url = SHARE_URL;
  ctx.font = font(46);
  const uw = ctx.measureText(url).width + 72;
  ctx.fillStyle = C.cyan;
  ctx.beginPath();
  ctx.roundRect((W - uw) / 2, H - 144, uw, 84, 42);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(url, W / 2, H - 87);
  ctx.fillStyle = C.muted;
  ctx.font = font(24);
  ctx.fillText("Simulasi hustle ekonomi rakyat — Kas usaha bukan uang asli", W / 2, H - 34);
  ctx.textAlign = "left";
}

export async function renderResultCard(s: ShareStats): Promise<Blob> {
  // Canvas silently falls back to a system font if the webfont isn't loaded yet.
  await document.fonts?.load(font(40)).catch(() => undefined);
  const canvas = document.createElement("canvas");
  drawResultCard(canvas, s);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

/** Web Share with the PNG when supported; otherwise download + copy caption. */
export async function shareResultCard(file: File, caption: string) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: caption });
      return "shared" as const;
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled" as const;
      // NotAllowedError etc. → fall back below.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  const copied = await navigator.clipboard?.writeText(caption).then(
    () => true,
    () => false,
  );
  return copied ? ("downloaded" as const) : ("downloaded-nocopy" as const);
}
