import { createContext, useContext } from "react";

const STUDIO_SPLASH_ROUTES = new Set(["/", "/auth", "/world", "/app-login"]);

export const StudioSplashContext = createContext(false);

export function useStudioSplashActive() {
  return useContext(StudioSplashContext);
}

export function isStudioSplashRoute(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return STUDIO_SPLASH_ROUTES.has(normalized);
}
