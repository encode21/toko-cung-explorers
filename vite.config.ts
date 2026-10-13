// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type Plugin } from "vite";

/** Server-only keys (TOKO_CUNG_API_URL, WORLD_ORIGIN, …) live in `.env` but are not `VITE_*`.
 *  Vite only exposes `VITE_*` to the client; without this, `process.env` on serverFns never
 *  sees `.env` and a stale shell export (e.g. old LAN IP) silently wins → login timeouts. */
function serverEnvFromDotenv(): Plugin {
  return {
    name: "tokocung-server-env",
    config(_, { mode }) {
      const env = loadEnv(mode, process.cwd(), "");
      for (const [key, value] of Object.entries(env)) {
        if (key.startsWith("VITE_")) continue;
        process.env[key] = value;
      }
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [serverEnvFromDotenv()],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
