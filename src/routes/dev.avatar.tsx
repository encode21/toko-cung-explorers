import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
const Viewer = lazy(() => import("@/game/avatar/AvatarViewer"));
export const Route = createFileRoute("/dev/avatar")({
  ssr: false,
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: () => (
    <Suspense fallback={<p>Loading avatar studio…</p>}>
      <Viewer />
    </Suspense>
  ),
});
