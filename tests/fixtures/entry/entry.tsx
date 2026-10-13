import React from "react";
import { createRoot } from "react-dom/client";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import { LandingScreen } from "@/ui/entry/LandingScreen";
import { AuthScreen } from "@/ui/entry/AuthScreen";
import "@/styles.css";
const root = createRootRoute({ component: Outlet });
const router = createRouter({
  routeTree: root.addChildren([
    createRoute({ getParentRoute: () => root, path: "/", component: LandingScreen }),
    createRoute({ getParentRoute: () => root, path: "/auth", component: AuthScreen }),
    createRoute({
      getParentRoute: () => root,
      path: "/world",
      component: () => <div>World destination</div>,
    }),
  ]),
});
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
