// Shareable landscape result, drawn on one flat canvas surface — no extra deps.
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
  /** F8: story title ("Juragan Mampang") once the finale is claimed. */
  title?: string | null;
}

export const SHARE_URL = "world.tokocung.com";
const W = 1200;
const H = 660;
const FONT = "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif";
const C = {
  bg: "#fbf4e9",
  paper: "#ffffff",
  ink: "#6b4a33",
  muted: "#79614e",
  line: "#e6dacb",
  orange: "#ffa415",
  cyan: "#39bedc",
  cyanInk: "#134e63",
  beige: "#e9d8b7",
};

export function shareCaption(s: ShareStats) {
  if (s.title) return `Aku resmi jadi ${s.title} di Toko Cung World 🏆 ${SHARE_URL}`;
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

/** A slim storefront canopy keeps the warung identity without enclosing more cards. */
function awning(ctx: CanvasRenderingContext2D) {
  const stripe = 75;
  const depth = 18;
  for (let i = 0; i * stripe < W; i++) {
    ctx.fillStyle = i % 2 ? C.paper : C.cyan;
    ctx.beginPath();
    ctx.moveTo(i * stripe, 0);
    ctx.lineTo((i + 1) * stripe, 0);
    ctx.lineTo((i + 1) * stripe, depth);
    ctx.arc(i * stripe + stripe / 2, depth, stripe / 2, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawResultCard(canvas: HTMLCanvasElement, s: ShareStats) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  const pad = 56;
  const inner = W - pad * 2;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  awning(ctx);

  // One open composition: identity, result, player, then the export footer.
  ctx.fillStyle = C.ink;
  ctx.fillText(fitText(ctx, s.warungName, 64, inner), pad, 142);
  ctx.fillStyle = C.muted;
  ctx.fillText(fitText(ctx, `Lv.${s.warungLevel} · ${s.levelName}`, 28, inner), pad, 188);

  ctx.font = font(32);
  ctx.fillText("Total jualan warungku", pad, 270);
  ctx.fillStyle = C.cyanInk;
  ctx.fillText(fitText(ctx, rupiah(s.totalSales), 104, inner), pad, 370);

  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, 405);
  ctx.lineTo(W - pad, 405);
  ctx.stroke();

  const rows: [string, string][] = [];
  if (s.kos) rows.push(["Kamar kos terisi", `${s.kos.tenants}/${s.kos.rooms}`]);
  if (s.ojekTrips) rows.push(["Trip ojol jam ini", String(s.ojekTrips)]);
  const statsWidth = rows.length * 224;
  const playerWidth = inner - statsWidth - (rows.length ? 32 : 0);

  // Player identity sits directly on the page, without another inner panel.
  const cx = pad + 40;
  const cy = 469;
  ctx.fillStyle = C.cyan;
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.arc(cx, cy - 10, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy + 21, 24, 15, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = C.orange;
  ctx.beginPath();
  ctx.arc(cx + 31, cy + 30, 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.textAlign = "center";
  ctx.fillText(fitText(ctx, String(s.playerLevel), 22, 34), cx + 31, cy + 38);
  ctx.textAlign = "left";
  ctx.fillStyle = C.muted;
  ctx.font = font(22);
  ctx.fillText(s.title ?? "Juragan", pad + 106, 451);
  ctx.fillStyle = C.ink;
  ctx.fillText(fitText(ctx, s.playerName, 36, playerWidth - 106), pad + 106, 495);

  // Optional server-backed results share the same line; absent businesses add no blanks.
  rows.forEach(([label, value], i) => {
    const x = W - pad - statsWidth + i * 224;
    ctx.fillStyle = C.muted;
    ctx.fillText(fitText(ctx, label, 22, 208), x, 451);
    ctx.fillStyle = C.ink;
    ctx.fillText(fitText(ctx, value, 38, 208), x, 495);
  });

  ctx.fillStyle = C.beige;
  ctx.fillRect(0, 552, W, H - 552);
  ctx.fillStyle = C.ink;
  ctx.font = font(28);
  ctx.fillText("Toko Cung World · Mampang", pad, 599);
  ctx.textAlign = "right";
  ctx.fillStyle = C.cyanInk;
  ctx.fillText(SHARE_URL, W - pad, 599);
  ctx.textAlign = "left";
  ctx.fillStyle = C.muted;
  ctx.font = font(19);
  ctx.fillText("Tokonya beneran ada · Simulasi usaha — Kas usaha bukan uang asli", pad, 636);
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
