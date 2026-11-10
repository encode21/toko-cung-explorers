import assert from "node:assert/strict";
import {
  MOUNTAIN_CHECKPOINTS,
  MOUNTAIN_SUMMIT,
  MOUNTAIN_ROUTE_VERSION,
} from "../src/game/mountain/model.ts";
import { mkdtemp, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const firstPosition = MOUNTAIN_CHECKPOINTS[0].position.map((v, i) => v + (i === 1 ? 0.83 : 0));
const fixture = await mkdtemp(`${tmpdir()}/summit-client-`);
await symlink(root + "/node_modules", fixture + "/node_modules", "dir");
await writeFile(`${fixture}/index.html`, `<script type="module" src="/entry.ts"></script>`);
await writeFile(
  `${fixture}/entry.ts`,
  `
import * as tracking from "@/game/mountain/leaderboard";
import { useMountain } from "@/game/mountain/store";
import { useGame } from "@/state/game-store";
import { useProfile } from "@/identity/profile-store";
import { useChannels, connectionId } from "@/net/channel-store";
Object.assign(window, { tracking, mountain: useMountain, game: useGame,
  summitPlan: ${JSON.stringify([...MOUNTAIN_CHECKPOINTS.map((cp) => cp.position), MOUNTAIN_SUMMIT.position].map((p) => [p[0], p[1] + 0.83, p[2]]))} });
useProfile.setState({ profile: { id: "summit-client-qa" } as never });
useChannels.setState({ playing: true, lease: {channel: "CHANNEL-01", connectionId} as never });
useGame.setState({ overlay: "none", pendingTeleport: null, playerPos: [365, 8.83, 65] });
tracking.tickSummitTracking(0, false);
`,
);
const server = await createServer({
  configFile: false,
  root: fixture,
  publicDir: root + "/public",
  plugins: [react()],
  cacheDir: "/tmp/tokocung-summit-client-vite-cache",
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
  },
  resolve: {
    alias: [
      { find: "@/services/world/client", replacement: root + "/tests/fixtures/mountain/client.ts" },
      {
        find: "@/services/aiApi/npc.functions",
        replacement: root + "/tests/fixtures/hud/npc-api.ts",
      },
      { find: "@/game/core/api.functions", replacement: root + "/tests/fixtures/hud/core-api.ts" },
      { find: "@tanstack/react-start", replacement: root + "/tests/fixtures/hud/server-fn.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: {
    host: "127.0.0.1",
    port: 4265,
    strictPort: true,
    hmr: false,
    watch: null,
    fs: { allow: [root, fixture] },
  },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4265");
  await page.waitForFunction(() => window.tracking?.useSummitLeaderboard.getState().loaded);
  await page.evaluate(() => {
    window.mountainStepDelayMs = 2500;
    window.tracking.tickSummitTracking(0, false); // Hold an ordinary request in flight.
    // Published HUD position deliberately stays at basecamp, just like a delayed pose tick.
    for (const [i, p] of window.summitPlan.entries()) window.mountain.getState().reach(i + 1, p);
    window.mountainStepDelayMs = 50;
    window.mountain.getState().returnToBasecamp();
    window.game.setState({ pendingTeleport: null, playerPos: [365, 8.83, 65] });
    window.tracking.tickSummitTracking(0, false);
    // Start a second ascent before the previous receipt has returned.
    window.mountain.getState().reach(1, window.summitPlan[0]);
    window.queueTimer = setInterval(
      () => window.tracking.tickSummitTracking(window.mountain.getState().checkpoint, false),
      100,
    );
  });
  await page.waitForFunction(
    () => window.tracking.useSummitLeaderboard.getState().ownSummits === 1,
    null,
    { timeout: 12000 },
  );
  await page.waitForFunction(
    () => window.mountainRequests.filter((r) => r.data?.action === "start").length === 2,
  );
  const result = await page.evaluate(() =>
    window.mountainRequests.filter((r) => r.operation === "mountain"),
  );
  const starts = result.filter((r) => r.data.action === "start");
  assert.ok(
    result
      .filter((r) => r.data.action !== "read")
      .every((r) => r.data.routeVersion === MOUNTAIN_ROUTE_VERSION),
    "All run requests carry current route version",
  );
  const firstCp = result.find(
    (r) =>
      r.data.action === "step" &&
      r.data.position[0] === 334 &&
      r.data.runId === starts[0].data.runId,
  );
  assert.deepEqual(
    firstCp.data.position,
    firstPosition,
    "CP sends rigidbody position, not delayed HUD pose",
  );
  await page.waitForFunction(
    (id) =>
      window.mountainRequests.some(
        (r) => r.data?.action === "step" && r.data.runId === id && r.data.position[0] === 334,
      ),
    starts[1].data.runId,
  );
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    window.mountainSkipNextCpAck = true;
    window.mountain.getState().reach(2, window.summitPlan[1]);
  });
  await page.waitForFunction(
    (id) =>
      window.mountainRequests.filter(
        (r) => r.data?.action === "step" && r.data.runId === id && r.data.position[0] === 330,
      ).length >= 2,
    starts[1].data.runId,
    { timeout: 12000 },
  );
  await page.waitForFunction(() => window.tracking.useSummitLeaderboard.getState().error === null);
  await page.evaluate(() => clearInterval(window.queueTimer));
  assert.equal(
    await page.evaluate(() => window.tracking.useSummitLeaderboard.getState().ownSummits),
    1,
    "retry cannot count a second summit",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: exact body CP, slow request queue, immediate return, next ascent backlog, non-ack retry, one receipt.",
  );
} finally {
  await browser?.close();
  await server.close();
  await rm(fixture, { recursive: true, force: true });
}
