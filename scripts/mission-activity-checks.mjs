import assert from "node:assert/strict";
export async function checkActivities(page, width, output) {
  await page.evaluate(() => {
    window.hud.getState().setSheet(null);
    window.obby.setState({ status: "idle" });
    window.channels.setState({ playing: true, lease: { channel: "CHANNEL-01" } });
    window.activityRequests = [];
    window.activityTransport = async (op, req) => {
      window.activityRequests.push({ op, ...req });
      if (op === "fishing")
        return structuredClone(window.fishingFixtureData ?? window.fishing.getState().data);
      const data = structuredClone(window.dungeon.getState().data);
      if (req.action === "travel") data.instance.realm = "WORLD";
      if (req.action === "interact") data.instance.progress[0] = 1;
      if (req.action === "exit") data.instance = null;
      return data;
    };
    window.game.setState({ playerPos: [0, 0.83, 0], nearby: null });
    window.dungeon.setState({
      data: {
        config: {
          version: 2,
          dungeonId: "qa",
          questId: "qa",
          questTitle: "Perjalanan uji",
          requiredLevel: 1,
          entrance: [8, 0, 0],
          spawn: [0, 0, 0],
          worldExit: [0, 0, 0],
          easterEggs: [],
          objectives: [
            {
              type: "COLLECT",
              target: "qa-parcel",
              label: "Paket",
              realm: "WORLD",
              position: [0, 0, 0],
              radius: 3,
              required: 1,
            },
          ],
        },
        instance: {
          id: "qa-run",
          status: "ACTIVE",
          realm: "DUNGEON",
          room: "CHANNEL-01",
          progress: [0],
          found: [],
          carrying: false,
          easterEgg: false,
        },
      },
    });
  });
  const action = page.locator("[data-context-action] button");
  await action.getByText("Lanjut", { exact: true }).waitFor();
  await page.keyboard.press("f");
  await action.getByText("Ambil", { exact: true }).waitFor();
  await action.click();
  await page.waitForFunction(() => window.dungeon.getState().data.instance.progress[0] === 1);
  await page.locator('[data-side-action="quests"]').click();
  await page.getByRole("button", { name: "Keluar Dungeon", exact: true }).click();
  await page.getByRole("button", { name: "Lanjutkan misi", exact: true }).click();
  assert(await page.evaluate(() => !!window.dungeon.getState().data.instance));
  await page.getByRole("button", { name: "Keluar Dungeon", exact: true }).click();
  await page.getByRole("button", { name: "Ya, keluar", exact: true }).click();
  await page.waitForFunction(() => !window.dungeon.getState().data.instance);
  assert.deepEqual(
    await page.evaluate(() =>
      window.activityRequests.filter((r) => r.op === "dungeon").map((r) => r.action),
    ),
    ["travel", "interact", "exit"],
  );
  // Optional mission target switches with carrying state; cancellation remains in details.
  await page.evaluate(() => {
    window.dungeon.setState({ data: null });
    window.missions.setState({
      ready: true,
      session: {
        ...window.missions.getState().session,
        active: {
          id: "optional",
          type: "WAREHOUSE_RUSH_HELP_PACKING",
          status: "ACTIVE",
          progress: 0,
          carrying: false,
          expiresAt: Date.now() + 60000,
          sourceEndedAt: null,
        },
      },
    });
    window.game.setState({ playerPos: [-7.3, 0.83, -14.8], nearby: null });
  });
  assert((await page.evaluate(() => window.contextAction()?.id)).endsWith(":take"));
  await page.evaluate(() => {
    const s = window.missions.getState().session;
    window.missions.setState({ session: { ...s, active: { ...s.active, carrying: true } } });
    window.game.setState({ playerPos: [-3.6, 0.83, -15.3] });
  });
  assert((await page.evaluate(() => window.contextAction()?.id)).endsWith(":place"));
  await page.locator('[data-side-action="quests"]').click();
  await page.getByRole("tab", { name: "Misi", exact: true }).click();
  await page.getByRole("button", { name: "Buka misi opsional", exact: true }).click();
  await page.getByRole("button", { name: "Batalkan Misi", exact: true }).click();
  await page.getByRole("button", { name: "Lanjutkan misi", exact: true }).click();
  await page.evaluate(() => {
    window.hud.getState().setSheet(null);
    window.missions.setState({ session: { ...window.missions.getState().session, active: null } });
    window.game.setState({ playerPos: [35, 1.03, -40], nearby: null });
    window.fishing.setState({
      open: true,
      clockOffset: 0,
      data: {
        storage: "account",
        serverNow: performance.now(),
        rods: [
          { id: "bamboo", name: "Bambu" },
          { id: "carbon", name: "Carbon" },
        ],
        ownedRods: ["bamboo", "carbon"],
        fish: [{ id: "carp", name: "Ikan Mas", tier: "Basic" }],
        tiers: { Basic: 1 },
        collection: [],
        cast: null,
        catch: null,
      },
    });
  });
  const phase = (p) => page.locator(`[data-fishing-phase="${p}"]`);
  await phase("ready").waitFor();
  await page.evaluate(() => {
    const s = window.fishing.getState();
    window.fishing.setState({
      data: {
        ...s.data,
        cast: {
          id: "cast1",
          rodId: "bamboo",
          status: "waiting",
          biteAt: performance.now() + 60000,
          expiresAt: performance.now() + 70000,
        },
      },
    });
  });
  await phase("waiting").waitFor();
  await page.getByRole("button", { name: "Pengaturan memancing", exact: true }).click();
  assert(await page.getByRole("combobox", { name: "Pilih pancing" }).isDisabled());
  await page.evaluate(() => {
    window.hud.getState().setSheet(null);
    const s = window.fishing.getState();
    window.fishing.setState({
      data: {
        ...s.data,
        cast: {
          ...s.data.cast,
          biteAt: performance.now() - 1000,
          expiresAt: performance.now() + 60000,
        },
      },
    });
  });
  await phase("bite").waitFor();
  await page.getByRole("progressbar", { name: "Waktu menarik ikan" }).waitFor();
  await page.screenshot({ path: `${output}/fishing-${width}.png` });
  const status = await page.locator("[data-fishing-hud]").boundingBox();
  const primary =
    width < 1000 ? await page.locator("[data-mobile-primary-action]").boundingBox() : null;
  if (primary)
    assert(
      status.y >= primary.y + primary.height ||
        status.y + status.height <= primary.y ||
        status.x + status.width <= primary.x,
      "fishing status must not cover primary control",
    );
  await page.evaluate(() => {
    const s = window.fishing.getState();
    window.fishing.setState({
      data: { ...s.data, cast: { ...s.data.cast, expiresAt: performance.now() - 1 } },
    });
  });
  await phase("missed").waitFor();
  await page.getByRole("button", { name: "Pengaturan memancing", exact: true }).click();
  await page.getByRole("combobox", { name: "Pilih pancing" }).selectOption("carbon");
  await page.evaluate(() => {
    window.hud.getState().setSheet(null);
    const s = window.fishing.getState();
    window.fishing.setState({
      data: {
        ...s.data,
        cast: { ...s.data.cast, status: "caught" },
        catch: { fishId: "carp", sizeCm: 12, tier: "Basic" },
        collection: [{ fishId: "carp", tier: "Basic", count: 1, bestCm: 12 }],
      },
    });
  });
  await phase("caught").waitFor();
  await page.evaluate(() => {
    window.fishingFixtureData = structuredClone(window.fishing.getState().data);
  });
  await page.locator('[data-side-action="phone"] [data-notification-dot]').waitFor();
  await page.getByRole("button", { name: "Pengaturan memancing", exact: true }).click();
  await page.getByRole("button", { name: "Koleksi ikan", exact: true }).click();
  await page.getByText("1 ekor", { exact: true }).waitFor();
  await page.evaluate(() => window.hud.getState().setSheet(null));
  assert.equal(await page.locator('[data-side-action="phone"] [data-notification-dot]').count(), 0);
  assert.equal(await page.locator("[data-fishing-hud]").count(), 0);
  // Shared routing must preserve standing up and Underground exits.
  await page.evaluate(() =>
    window.game.setState({
      sitting: true,
      sittingBenchId: "qa-seat",
      nearby: { kind: "bench", id: "qa-seat", label: "Bangku" },
    }),
  );
  assert.equal(await page.evaluate(() => window.contextAction()?.label), "Berdiri");
  const generic = await page.evaluate(() => {
    window.club.setState({ inside: true, outdoor: false });
    window.editor.setState({
      targets: [
        {
          id: "qa-exit",
          type: "CLUB_ENTRANCE",
          active: true,
          tags: ["club-exit"],
          position: { x: 0, y: -8, z: 0 },
        },
      ],
    });
    window.game.setState({
      sitting: false,
      sittingBenchId: null,
      playerPos: [0, -7.17, 0],
      nearby: { kind: "door", id: "qa-exit", label: "Keluar ke kota" },
    });
    const atDoor = window.contextAction()?.id;
    window.game.setState({ playerPos: [30, -7.17, 0] });
    const away = window.contextAction();
    window.club.setState({ inside: false });
    return { atDoor, away };
  });
  assert.equal(generic.atDoor, "world:door:qa-exit");
  assert.equal(generic.away, null, "generic stale proximity rejected too");
}
