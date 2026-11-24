import { useEffect, useState } from "react";
import { useGame } from "@/state/game-store";
import { LOADER_TIPS, hideLoader, loaderDone, useLoader, type LoaderArt } from "./travel-loader";
import "./travel-loader.css";

function Art({ art }: { art: LoaderArt }) {
  if (art === "bus")
    return (
      <svg viewBox="0 0 160 80" aria-hidden="true" className="travel-loader-bus">
        <rect x="14" y="14" width="124" height="44" rx="10" fill="#2f8f5b" />
        <rect x="14" y="40" width="124" height="6" fill="#f2c94c" />
        {[24, 50, 76, 102].map((x) => (
          <rect key={x} x={x} y="20" width="20" height="16" rx="3" fill="#cfeef3" />
        ))}
        <rect x="124" y="20" width="10" height="24" rx="2" fill="#cfeef3" />
        <circle cx="40" cy="60" r="9" fill="#2b2b2b" />
        <circle cx="112" cy="60" r="9" fill="#2b2b2b" />
        <circle cx="40" cy="60" r="3.5" fill="#bdbdbd" />
        <circle cx="112" cy="60" r="3.5" fill="#bdbdbd" />
      </svg>
    );
  return (
    <svg viewBox="0 0 160 80" aria-hidden="true">
      <path d="M30 38 80 10l50 28" fill="#b5563f" />
      <rect x="38" y="36" width="84" height="38" fill="#f0dcb4" />
      <rect x="70" y="48" width="20" height="26" fill="#7b5a3c" />
      <rect x="46" y="46" width="16" height="14" fill="#cfeef3" />
      <rect x="98" y="46" width="16" height="14" fill="#cfeef3" />
    </svg>
  );
}

/** Full-screen game-style card that covers scene swaps (bus, rumah, gang). */
export function TravelLoader() {
  const loader = useLoader((s) => s.loader);
  const pending = useGame((s) => !!s.pendingTeleport);
  const [tip, setTip] = useState(0);
  useEffect(() => {
    if (!loader) return;
    setTip(Math.floor(Math.random() * LOADER_TIPS.length));
    const id = window.setInterval(() => {
      const l = useLoader.getState().loader;
      if (l && loaderDone(l, Date.now(), !!useGame.getState().pendingTeleport)) hideLoader();
    }, 150);
    const rotate = window.setInterval(() => setTip((t) => (t + 1) % LOADER_TIPS.length), 2600);
    return () => {
      window.clearInterval(id);
      window.clearInterval(rotate);
    };
  }, [loader]);
  if (!loader) return null;
  return (
    <div className="travel-loader" data-travel-loader role="status" aria-live="polite">
      <div className={`travel-loader-scene travel-loader-${loader.art}`}>
        <div className="travel-loader-road" />
        <Art art={loader.art} />
      </div>
      <strong>{loader.title}</strong>
      <span>{loader.subtitle}</span>
      <div className="travel-loader-bar" data-waiting={pending || undefined}>
        <i style={{ animationDuration: `${loader.minMs}ms` }} />
      </div>
      <p>{LOADER_TIPS[tip]}</p>
    </div>
  );
}
