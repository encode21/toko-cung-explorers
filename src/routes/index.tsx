import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/lib/site-meta";
import { LandingScreen } from "@/ui/entry/LandingScreen";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: pageMeta({
      title: "Toko Cung World — Petualanganmu Dimulai",
      description: "Jelajahi dunia Toko Cung, temui Nakama dan temukan quest bersama pemain lain.",
      path: "/",
    }),
  }),
  component: LandingScreen,
});
