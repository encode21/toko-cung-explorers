import type { ReactNode } from "react";
import {
  APP_LINK,
  androidAppIntent,
  detectAppPlatform,
  storeUrlForPlatform,
} from "./app-bridge-targets";

export { detectAppPlatform, storeUrlForPlatform } from "./app-bridge-targets";

/** Open the installed app when possible; otherwise Play Store / App Store / web shop. */
export function openTokoCungApp() {
  const platform = detectAppPlatform();
  if (platform === "other") {
    window.open(APP_LINK, "_blank", "noopener,noreferrer");
    return;
  }

  const store = storeUrlForPlatform(platform);

  if (platform === "android") {
    window.location.href = androidAppIntent(store);
    return;
  }

  // iOS: try the universal link, then App Store if the page is still visible.
  const started = Date.now();
  let leftPage = false;
  const markLeft = () => {
    leftPage = true;
  };
  document.addEventListener("visibilitychange", markLeft, { once: true });
  window.addEventListener("pagehide", markLeft, { once: true });
  window.location.href = APP_LINK;
  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", markLeft);
    window.removeEventListener("pagehide", markLeft);
    if (!leftPage && document.visibilityState === "visible" && Date.now() - started < 2800) {
      window.location.href = store;
    }
  }, 1600);
}

export function AppBridge({
  className = "",
  children = "Belanja di Toko Cung App",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <button type="button" className={className} onClick={() => openTokoCungApp()}>
      {children}
    </button>
  );
}
