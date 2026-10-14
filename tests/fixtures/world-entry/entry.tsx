import React from "react";
import { useSession } from "./session";
import { createRoot } from "react-dom/client";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route as WorldRoute } from "@/routes/_authenticated/world";
import { hydrateIntro, useIntro } from "@/state/intro-store";
import { useProfile } from "@/identity/profile-store";
import { DEFAULT_AVATAR } from "@/identity/avatar";
import "@/styles.css";
useProfile.setState({ profile: { id: "alice", displayName: "Alice", avatar: DEFAULT_AVATAR } });
hydrateIntro("alice", null);
window.expireSession = () => useSession.setState({ user: null });
window.introState = () => useIntro.getState();
const root = createRootRoute({ component: Outlet });
const router = createRouter({
  routeTree: root.addChildren([
    createRoute({
      getParentRoute: () => root,
      path: "/auth",
      component: () => <h1>Masuk lagi</h1>,
    }),
    createRoute({
      getParentRoute: () => root,
      path: "/world",
      component: WorldRoute.options.component,
    }),
  ]),
});
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={new QueryClient()}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
