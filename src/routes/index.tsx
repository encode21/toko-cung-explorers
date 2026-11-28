import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/lib/site-meta";
import { LandingScreen } from "@/ui/entry/LandingScreen";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: pageMeta({
      title: "Toko Cung World — Jadi juragan dari nol di Mampang",
      description:
        "Mampang versi game: narik ojol, kulakan di Toko Cung yang beneran ada, buka warung dari teras sampai grosir, bertahan dari bencana, dan main bareng teman.",
      path: "/",
    }),
  }),
  component: LandingScreen,
});
