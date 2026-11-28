import { CanvasTexture, SRGBColorSpace } from "three";

/** Painted panels and glazing; all artwork is local, so the bus never waits on fonts or downloads. */
export function busLivery(face: "left" | "right" | "front" | "rear") {
  const side = face === "left" || face === "right";
  const canvas = document.createElement("canvas");
  canvas.width = side ? 1536 : 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(canvas.width / (side ? 1100 : 250), 512 / 328);
  const width = side ? 1100 : 250;
  ctx.fillStyle = "#f1f3f1";
  ctx.fillRect(0, 0, width, 328);
  const glass = ctx.createLinearGradient(0, 18, 0, 206);
  glass.addColorStop(0, "#07131d");
  glass.addColorStop(0.48, "#223c49");
  glass.addColorStop(0.52, "#304c57");
  glass.addColorStop(1, "#0a1b25");
  ctx.fillStyle = glass;
  ctx.fillRect(0, 13, width, side ? 166 : 225);
  ctx.fillStyle = "#0876cf";
  ctx.fillRect(0, 0, width, 12);
  ctx.fillRect(0, 314, width, 14);

  if (side) {
    const front = face === "left" ? 1100 : 0;
    ctx.fillStyle = "#0768c4";
    ctx.beginPath();
    ctx.moveTo(front, 175);
    ctx.lineTo(front + (front ? -110 : 110), 175);
    ctx.lineTo(front + (front ? -155 : 155), 328);
    ctx.lineTo(front, 328);
    ctx.fill();
    for (let x = 18; x < 1100; x += 112) {
      ctx.fillStyle = "#070f16";
      ctx.fillRect(x, 14, 7, 166);
      ctx.fillRect(x, 62, 108, 4);
      // Muted interior seats behind the tinted glazing.
      ctx.fillStyle = "#315264";
      ctx.fillRect(x + 22, 145, 28, 28);
      ctx.fillRect(x + 60, 145, 28, 28);
      ctx.fillStyle = "#78969b22";
      ctx.beginPath();
      ctx.moveTo(x + 10, 22);
      ctx.lineTo(x + 52, 22);
      ctx.lineTo(x + 100, 137);
      ctx.lineTo(x + 80, 137);
      ctx.fill();
    }
    // The large blue ribbons are the recognisable electric-bus livery in the reference.
    const rear = front ? 100 : 1000;
    const direction = front ? 1 : -1;
    for (const [offset, color] of [
      [0, "#0370bd"],
      [40, "#23b7e2"],
    ] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(rear + direction * offset, 25);
      ctx.lineTo(rear + direction * (offset + 85), 300);
      ctx.lineTo(rear + direction * (offset + 165), 20);
      ctx.stroke();
    }
    ctx.fillStyle = "#e9f4f5";
    ctx.font = `600 ${front ? 25 : 22}px sans-serif`;
    ctx.fillText("ELECTRIC BUS", front ? 380 : 560, 115);
    ctx.fillStyle = "#0876bd";
    ctx.font = "italic 600 27px sans-serif";
    ctx.fillText("transcung", front ? 700 : 205, 201);
    ctx.fillStyle = "#66767e";
    ctx.font = "12px sans-serif";
    ctx.fillText("Bersih • Nyaman", front ? 705 : 290, 248);
    ctx.strokeStyle = "#aebac2";
    ctx.lineWidth = 1;
    ctx.strokeRect(430, 202, 190, 103);
    ctx.fillStyle = "#6f7f86";
    ctx.fillRect(598, 220, 13, 4);
    for (let i = 0; i < 7; i++) ctx.fillRect(front ? 28 : 985, 227 + i * 9, 74, 3);
    if (face === "right") {
      for (const [x, w] of [
        [412, 123],
        [28, 110],
      ] as const) {
        ctx.fillStyle = "#070f16";
        ctx.fillRect(x, 17, w, 300);
      }
    }
    for (const x of [55, 420, 790, 1060]) {
      ctx.fillStyle = "#ebaa32";
      ctx.fillRect(x, 286, 10, 5);
    }
    ctx.fillStyle = "#536b79";
    ctx.font = "12px sans-serif";
    ctx.fillText("TCG • 240378", front ? 735 : 310, 291);
  } else {
    const front = face === "front";
    ctx.fillStyle = "#040b10";
    ctx.fillRect(14, 20, 222, 39);
    ctx.fillStyle = "#ffb542";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.fillText(front ? "1  TOKO CUNG" : "1  KOTA", 125, 47);
    ctx.fillStyle = "#eef6f6";
    ctx.font = "600 19px sans-serif";
    ctx.fillText("Bus Listrik", 125, 82);
    ctx.fillStyle = "#89afb51c";
    ctx.beginPath();
    ctx.moveTo(28, 93);
    ctx.lineTo(80, 93);
    ctx.lineTo(172, 220);
    ctx.lineTo(125, 220);
    ctx.fill();
    ctx.fillStyle = "#096dcc";
    ctx.fillRect(0, 240, 250, 88);
    ctx.fillStyle = "#092032";
    ctx.fillRect(55, 252, 140, 28);
    ctx.fillStyle = "#899ca6";
    for (let y = 258; y < 278; y += 5) ctx.fillRect(64, y, 122, 1);
    ctx.fillStyle = "#f1b931";
    ctx.fillRect(89, 297, 72, 16);
    ctx.fillStyle = "#17212a";
    ctx.font = "bold 10px monospace";
    ctx.fillText("B 2403 TCG", 125, 309);
    ctx.fillStyle = "#c8e8fb";
    ctx.font = "10px sans-serif";
    ctx.fillText("TCG-240378", 125, 235);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
