import { useEffect, useState } from "react";

const DISPLAY_MS = 3000;

/** One notice per physical visit; menus and data refreshes never restart the timer. */
export function useLocationNotice(locationKey: string | null) {
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  useEffect(() => {
    setVisibleKey(locationKey);
    if (!locationKey) return;
    const timer = window.setTimeout(() => setVisibleKey(null), DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [locationKey]);
  return locationKey !== null && visibleKey === locationKey;
}
