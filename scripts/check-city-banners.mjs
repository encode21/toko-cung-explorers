import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const path = new URL("../src/game/world/city-banner.ts", import.meta.url);
let { outputText } = ts.transpileModule(await readFile(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
outputText = outputText.replace('from "zod"', `from "${import.meta.resolve("zod")}"`);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
const { parseActivePopupBanners } = await import(moduleUrl);

const banners = parseActivePopupBanners({
  status: true,
  data: [
    { id: 5, name: "B", image: "https://cdn.test/b.png", type: " POPUP ", sort_order: 2 },
    { id: 3, name: "A", image: "https://cdn.test/a.png", type: "popup", sort_order: 1 },
    { id: 1, name: "Swipe", image: "https://cdn.test/swipe.png", type: "swipe", sort_order: 0 },
    { id: 2, name: "Unsafe", image: "http://cdn.test/a.png", type: "popup", sort_order: 0 },
  ],
});
assert.deepEqual(
  banners.map(({ id, imageUrl }) => [id, imageUrl]),
  [
    [3, "https://cdn.test/a.png"],
    [5, "https://cdn.test/b.png"],
  ],
);
assert.deepEqual(parseActivePopupBanners({ status: false, data: [] }), []);
assert.deepEqual(parseActivePopupBanners(null), []);
console.log(
  "PASS city banners: active response, popup filter, HTTPS images, stable ordering and fallback",
);
