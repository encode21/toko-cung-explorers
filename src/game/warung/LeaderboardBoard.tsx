/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { useChannels } from "@/net/channel-store";
import { rupiahShort, type WarungLeaderboard } from "./model";
import { loadLeaderboard, useWarung } from "./store";

// North edge of Alun-alun Cung, between the two minigame arenas, facing the square (+z).
const LEADERBOARD_POSITION: [number, number, number] = [104, 0, 29.5];
const POLL_MS = 60_000;
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
): AssetPart => ({
  p,
  s,
  color,
  shape: "bevel",
  finish: "wood",
});
const FRAME: AssetPart[] = [
  part([-3.1, 2, 0], [0.25, 4, 0.25], "#7a4b2a"),
  part([3.1, 2, 0], [0.25, 4, 0.25], "#7a4b2a"),
  part([0, 2.55, 0], [6, 3.2, 0.14], "#fffaf0"),
  part([0, 4.35, 0], [6.6, 0.55, 0.3], "#ff9a3d"),
  part([0, 0.95, 0], [6, 0.12, 0.2], "#7a4b2a"),
];
const MEDAL = ["#f2b705", "#9aa6b2", "#cd7f32"];

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

function drawBoardTexture(board: WarungLeaderboard | null): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 546;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Cream paper board background
  ctx.fillStyle = "#fffaf0";
  ctx.fillRect(0, 0, 1024, 546);

  // Subtle warm inner border
  ctx.strokeStyle = "#ead9c0";
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, 996, 518);

  // Top header ribbon
  ctx.fillStyle = "#ff9a3d";
  ctx.fillRect(0, 0, 1024, 92);
  ctx.fillStyle = "#e07a1d";
  ctx.fillRect(0, 86, 1024, 6);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '800 40px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = "rgba(110, 45, 0, 0.35)";
  ctx.fillText("PAPAN JUARA WARUNG", 512, 49);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("PAPAN JUARA WARUNG", 512, 46);

  // Subtitle
  ctx.font = '700 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = "#8c6c52";
  ctx.fillText("Omzet minggu ini · pembeli NPC + pemain", 512, 122);

  const top = board?.top.slice(0, 5) ?? [];
  if (top.length === 0) {
    ctx.font = '700 30px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = "#7a5b42";
    ctx.fillText("Belum ada penjualan minggu ini.", 512, 300);
    ctx.font = '600 24px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = "#9a7b62";
    ctx.fillText("Buka warungmu lewat HP → Warungku!", 512, 344);
  } else {
    top.forEach((r, i) => {
      const y = 152 + i * 74;
      // Row card
      roundRect(ctx, 36, y, 952, 64, 16);
      ctx.fillStyle = i === 0 ? "#fff2db" : "#ffffff";
      ctx.fill();
      ctx.strokeStyle = i === 0 ? "#f2b705" : "#efe2ce";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Rank badge
      ctx.beginPath();
      ctx.arc(78, y + 32, 22, 0, Math.PI * 2);
      ctx.fillStyle = MEDAL[i] ?? "#e8dac5";
      ctx.fill();
      ctx.textAlign = "center";
      ctx.font = '800 26px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = i < 3 ? "#ffffff" : "#6b4a33";
      ctx.fillText(String(r.rank), 78, y + 33);

      // Warung name
      ctx.textAlign = "left";
      ctx.font = '800 26px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = "#5a3922";
      const label = r.name.length > 26 ? `${r.name.slice(0, 25)}…` : r.name;
      ctx.fillText(label, 118, y + 23);

      // Owner & split subline
      ctx.font = '600 18px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = "#8f7158";
      const sub = `${r.ownerName ?? "Pemain"} · NPC ${rupiahShort(r.npc)} · Pemain ${rupiahShort(r.player)}`;
      ctx.fillText(sub, 118, y + 48);

      // Total omzet (right aligned)
      ctx.textAlign = "right";
      ctx.font = '800 28px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = "#c25414";
      ctx.fillText(rupiahShort(r.total), 962, y + 34);
    });
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Papan Juara Warung: weekly omzet (NPC + player) top 5 rendered as a single crisp CanvasTexture (1 draw call). */
export function LeaderboardBoard() {
  const room = useChannels((s) => s.lease?.channel);
  const board = useWarung((s) => s.leaderboard);
  useEffect(() => {
    if (!room?.startsWith("CHANNEL-")) return;
    void loadLeaderboard();
    const t = setInterval(() => void loadLeaderboard(), POLL_MS);
    return () => clearInterval(t);
  }, [room]);

  const texture = useMemo(() => drawBoardTexture(board), [board]);
  useEffect(() => () => texture?.dispose(), [texture]);

  return (
    <group name="LeaderboardBoard" position={LEADERBOARD_POSITION}>
      <StyledBatch items={FRAME} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[3.2, 2.2, 0.2]} position={[0, 2.2, 0]} />
      </RigidBody>
      {texture && (
        <mesh position={[0, 2.66, 0.16]}>
          <planeGeometry args={[5.88, 3.14]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
