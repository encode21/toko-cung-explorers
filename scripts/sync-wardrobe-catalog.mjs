// One checked-in mesh manifest, published to Laravel; runtime prices are server-authoritative.
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const source = path.join(root, "src/identity/wardrobe-catalog.json");
const target = path.join(
  process.env.WARDROBE_BACKEND_ROOT || path.resolve(root, "../toko-cung"),
  "config/world-cosmetics.json",
);
if (process.argv.includes("--write")) {
  await writeFile(target, await readFile(source));
  console.log("Published wardrobe catalog to", target);
} else {
  assert.deepEqual(
    JSON.parse(await readFile(source, "utf8")),
    JSON.parse(await readFile(target, "utf8")),
  );
  console.log("Frontend/backend wardrobe catalogs match.");
}
