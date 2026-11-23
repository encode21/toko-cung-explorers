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
import { EntryTitleScreen } from "@/ui/entry/EntryTitleScreen";
import { GameViewport } from "@/ui/game-ui/GameViewport";
import { useSession } from "./session";
import "@/styles.css";

const root = createRootRoute({ component: Outlet });
const router = createRouter({
  routeTree: root.addChildren([
    createRoute({ getParentRoute: () => root, path: "/", component: LandingScreen }),
    createRoute({ getParentRoute: () => root, path: "/auth", component: AuthScreen }),
    createRoute({
      getParentRoute: () => root,
      path: "/preparing",
      component: () => <EntryTitleScreen status="Menyiapkan profil…" />,
    }),
    createRoute({
      getParentRoute: () => root,
      path: "/loading-world",
      component: () => (
        <GameViewport allowPortrait>
          <EntryTitleScreen status="Memuat dunia…" embedded />
        </GameViewport>
      ),
    }),
    createRoute({
      getParentRoute: () => root,
      path: "/world",
      component: function WorldDestination() {
        const { user } = useSession();
        return (
          <main data-testid="world-destination" data-guest={user?.guest ? "true" : "false"}>
            <h1>World destination</h1>
            <p>{user?.guest ? "Sesi tamu siap." : "Sesi pemain siap."}</p>
          </main>
        );
      },
    }),
  ]),
});
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
