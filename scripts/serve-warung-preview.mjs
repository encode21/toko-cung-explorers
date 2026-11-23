// Test-only native-browser preview. No browser automation or live world transport.
import { build, createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const fixture = root + "/tests/fixtures/warung";
const config = {
  configFile: false,
  root: fixture,
  cacheDir: root + "/.cache/warung-preview",
  publicDir: root + "/public",
  envDir: fixture,
  plugins: [react(), tailwind()],
  resolve: {
    alias: [
      { find: "@/services/world/client", replacement: fixture + "/client.ts" },
      { find: "@/net/useWorldChannel", replacement: fixture + "/world-channel.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 4224, strictPort: true, fs: { allow: [root] } },
};
if (process.argv.includes("--build-check")) {
  await build({
    ...config,
    build: { outDir: root + "/.cache/warung-preview-build", emptyOutDir: true },
  });
  process.exit(0);
}
const server = await createServer(config);
await server.listen();
console.log("Warung preview: http://127.0.0.1:4224/?state=waiting");
console.log(
  "Scenarios: serve, retry, empty, closed, sealed, visitor, worker, store, management. Add &tab=dekor to management, &controls=1 for reset.",
);
async function close() {
  await server.close();
  process.exit(0);
}
process.once("SIGINT", close);
process.once("SIGTERM", close);
