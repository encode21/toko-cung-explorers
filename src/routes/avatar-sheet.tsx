import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
const AvatarSheet = lazy(() => import("@/game/avatar/AvatarSheet"));
export const Route = createFileRoute("/avatar-sheet")({
  ssr: false,
  component: () => (
    <Suspense fallback={null}>
      <AvatarSheet />
    </Suspense>
  ),
});
