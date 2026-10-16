// Only transport is mocked. PHP tests exercise authoritative persistence/odds separately.
const rods = [
  { id: "bamboo", name: "Pancing Bambu", detail: "Santai · waktu tarik 3 detik", window: 3000 },
  { id: "river", name: "Pancing Sungai", detail: "Cepat · waktu tarik 2 detik", window: 2000 },
];
const fish = [
  { id: "wader", name: "Wader Madu", tier: "Basic", minCm: 8, maxCm: 18 },
  { id: "nila", name: "Nila Pita", tier: "Basic", minCm: 14, maxCm: 30 },
  { id: "perch", name: "Perch Mint", tier: "Uncommon", minCm: 18, maxCm: 38 },
  { id: "koi", name: "Koi Senja", tier: "Rare", minCm: 26, maxCm: 60 },
  { id: "arwana", name: "Arwana Aurora", tier: "Epic", minCm: 48, maxCm: 85 },
  { id: "naga", name: "Naga Danau", tier: "Legendary", minCm: 80, maxCm: 130 },
];
export async function fishingRequest(data: any) {
  const w = window as any;
  w.fishingBackend ??= { casts: {}, collection: [] };
  const db = w.fishingBackend;
  await new Promise((r) => setTimeout(r, w.fishingDelay ?? 60));
  let cast = db.casts[data.castId] ?? null;
  if (data.action === "cast" && !cast)
    cast = db.casts[data.castId] = {
      id: data.castId,
      rodId: data.rodId,
      status: "waiting",
      biteAt: Date.now() + 3000,
      expiresAt: Date.now() + 6000,
    };
  if (cast?.status === "waiting" && data.action === "cancel") cast.status = "cancelled";
  if (cast?.status === "waiting" && data.action === "reel") {
    cast.status = Date.now() >= cast.biteAt && Date.now() <= cast.expiresAt ? "caught" : "missed";
    if (cast.status === "caught") {
      cast.catch = { fishId: "wader", tier: "Basic", sizeCm: 12.5 };
      if (!db.collection.length)
        db.collection.push({ fishId: "wader", tier: "Basic", count: 0, bestCm: 12.5 });
      db.collection[0].count++;
    }
    if (w.loseFishingResponse) {
      w.loseFishingResponse = false;
      throw Error("Respons terputus. Coba lagi.");
    }
  }
  return structuredClone({
    storage: "account",
    serverNow: Date.now(),
    rods,
    ownedRods: ["bamboo", "river"],
    fish,
    tiers: { Basic: 6000, Uncommon: 2500, Rare: 1000, Epic: 400, Legendary: 100 },
    collection: db.collection,
    cast,
    catch: cast?.catch ?? null,
  });
}
