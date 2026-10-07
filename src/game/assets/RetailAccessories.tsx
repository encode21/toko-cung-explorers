/** @jsxImportSource @/game/jsx */
import { StyledBatch } from "./StyledBatch";
import type { AssetPart } from "./parts";
const baskets: AssetPart[] = [];
for (let level = 0; level < 3; level++) {
  const y = 0.05 + level * 0.09,
    color = level % 2 ? "#b54d50" : "#bf5955";
  baskets.push({ p: [0, y, 0], s: [0.48, 0.025, 0.32], color, finish: "plastic" });
  for (const side of [-1, 1]) {
    for (const h of [0.05, 0.12, 0.19]) {
      baskets.push({
        p: [0, y + h, side * 0.16],
        s: [0.48, 0.025, 0.025],
        color,
        finish: "plastic",
      });
      baskets.push({
        p: [side * 0.24, y + h, 0],
        s: [0.025, 0.025, 0.32],
        color,
        finish: "plastic",
      });
    }
    for (const x of [-0.21, 0, 0.21])
      baskets.push({
        p: [x, y + 0.1, side * 0.16],
        s: [0.023, 0.18, 0.023],
        color,
        finish: "plastic",
      });
  }
}
baskets.push({
  p: [0, 0.44, 0],
  s: [0.34, 0.19, 0.07],
  color: "#455d62",
  shape: "ring",
  finish: "plastic",
});
export function ShoppingBaskets() {
  return <StyledBatch items={baskets} />;
}
