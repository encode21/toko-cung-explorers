import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { NPC_SCRIPTS, scriptOpener } from "../src/game/npc/scripts.ts";

test("every city NPC, pasar vendor and kampung resident has a scripted chat", async () => {
  const pop = await readFile(new URL("../src/game/npc/population.ts", import.meta.url), "utf8");
  const city = [...pop.matchAll(/id: "(npc-[a-z0-9-]+)"/g)].map((m) => m[1]).filter((id) => id !== "npc-wali-kota");
  const pasar = await readFile(new URL("../src/game/pasar/model.ts", import.meta.url), "utf8");
  const vendors = [...pasar.matchAll(/vendorId: "([a-z0-9-]+)"/g)].map((m) => m[1]);
  const gangCfg = await readFile(new URL("../../toko-cung/config/world-gang.php", import.meta.url), "utf8").catch(() => "");
  const residents = [...gangCfg.matchAll(/\['id' => '([a-z0-9-]+)', 'avatar'/g)].map((m) => `gang-${m[1]}`);
  for (const id of [...city, ...vendors, ...residents]) assert.ok(NPC_SCRIPTS[id], `missing script for ${id}`);
  for (const [id, sc] of Object.entries(NPC_SCRIPTS)) {
    assert.equal(sc.options.length, 3, id);
    assert.ok(sc.openers.length > 0, id);
  }
});

test("openers rotate per game day", () => {
  const sc = NPC_SCRIPTS["npc-cashier"];
  assert.notEqual(scriptOpener(sc, 0), scriptOpener(sc, 1));
  assert.equal(scriptOpener(sc, 0), scriptOpener(sc, 2));
});

test("every named NPC looks like their name (Mbak/Bu/Teh = woman, Mas/Pak/Bang = man)", async () => {
  const { NPC_AVATARS, isFemaleLook } = await import("../src/identity/characters.ts");
  const pop = await readFile(new URL("../src/game/npc/population.ts", import.meta.url), "utf8");
  const presetOf = {};
  for (const b of pop.split(/\n  \{\n/)) {
    const id = b.match(/id: "([^"]+)"/)?.[1];
    if (id) presetOf[id] = b.match(/avatarId: "([^"]+)"/)?.[1] ?? id;
  }
  const female = /^(Bu|Ibu|Mbak|Teh|Mpok|Nek|Dek Salsa|Dek Nayla|Dek Rara)\b/;
  const male = /^(Mas|Pak|Bang|Kang|Mang|Om|Dek Bima|Satpam)\b/;
  for (const [id, sc] of Object.entries(NPC_SCRIPTS)) {
    const look = NPC_AVATARS[sc.avatar ?? presetOf[id] ?? id];
    if (!look || look.mascot || !(female.test(sc.name) || male.test(sc.name))) continue;
    assert.equal(isFemaleLook(look), female.test(sc.name), `${sc.name} (${id}) has the wrong look`);
  }
});
