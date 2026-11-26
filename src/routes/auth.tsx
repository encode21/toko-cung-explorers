import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/lib/site-meta";
import { AuthScreen } from "@/ui/entry/AuthScreen";
export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "register" } =>
    search["mode"] === "register" ? { mode: "register" } : {},
  head: () => ({
    meta: pageMeta({
      title: "Masuk Toko Cung World",
      description: "Daftar langsung dan bermain dengan PIN khusus game. Tidak perlu mengunduh App.",
      path: "/auth",
    }),
  }),
  component: AuthRoute,
});

function AuthRoute() {
  const initialMode = Route.useSearch().mode ?? "login";
  return <AuthScreen key={initialMode} initialMode={initialMode} />;
}
