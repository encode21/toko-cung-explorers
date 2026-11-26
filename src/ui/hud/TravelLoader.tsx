import { useEffect, useRef } from "react";
import { LOADER_TIPS, useLoader } from "./travel-loader";
import { HomeTravelLoader } from "./HomeTravelLoader";
import "./travel-loader.css";

const WORLD_PHOTO = "/assets/travel/koko-world.webp";

/** A small static illustration keeps the transition screen independent of WebGL. */
function WorldPattern() {
  return (
    <svg className="travel-loader-pattern" width="100%" height="100%" aria-hidden="true">
      <defs>
        <pattern id="travel-world-pattern" width="240" height="216" patternUnits="userSpaceOnUse">
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m28 46 22-17 22 17M34 43v30h32V43M46 73V57h9v16" />
            <path d="M152 26h34l6 17h-46l6-17Zm-3 19v27h40V45m-28 27V56h16v16m-20-46-2 17m20-17 2 17" />
            <path d="M28 139h32v29H28zm-5-9h42v9H23zm16 9v10h10v-10" />
            <path d="M151 134h29v25c0 14-29 14-29 0v-25Zm29 4h6c13 0 13 16 0 16h-6m-24-30v-8m13 8v-8" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#travel-world-pattern)" />
    </svg>
  );
}

/** Opaque loading postcard; the scene runtime decides when the destination is ready. */
export function TravelLoader() {
  const loader = useLoader((s) => s.loader);
  const screen = useRef<HTMLDivElement>(null);
  const visible = Boolean(loader);
  useEffect(() => {
    const photo = new Image();
    photo.src = WORLD_PHOTO;
  }, []);
  useEffect(() => {
    if (!visible) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    screen.current?.focus({ preventScroll: true });
    return () => {
      if (previous?.isConnected && document.activeElement === document.body)
        previous.focus({ preventScroll: true });
    };
  }, [visible]);
  if (!loader) return null;
  const home = loader.art === "rumah" && loader.mode !== "notice";
  const tip = LOADER_TIPS[Math.floor(loader.since / 1000) % LOADER_TIPS.length]!.replace(
    /^Tips:\s*/,
    "",
  );
  const status =
    loader.art === "grosir"
      ? loader.subtitle
      : loader.phase === "ready"
        ? "Siap, sebentar lagi…"
        : "Memuat tempat tujuan…";
  return (
    <div
      ref={screen}
      className={home ? "travel-loader travel-loader--home" : "travel-loader"}
      data-travel-loader
      data-travel-variant={home ? "home" : "world"}
      data-phase={loader.phase}
      tabIndex={-1}
      aria-label={home ? "Masuk rumah" : "Perpindahan lokasi"}
      onKeyDown={(event) => {
        if (event.key === "Tab") event.preventDefault();
        event.stopPropagation();
      }}
    >
      {home ? (
        <HomeTravelLoader phase={loader.phase} />
      ) : (
        <>
          <WorldPattern />
          <figure className="travel-loader-photo">
            <span className="travel-loader-tape" aria-hidden="true" />
            <div className="travel-loader-image">
              <img
                src={WORLD_PHOTO}
                width="1000"
                height="750"
                alt="Koko Cung menyambutmu di depan Toko Cung"
                decoding="async"
                fetchPriority="high"
              />
            </div>
            <figcaption>{tip}</figcaption>
          </figure>
          <div className="travel-loader-status" role="status" aria-live="polite" aria-atomic="true">
            <span className="travel-loader-spinner" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => (
                <i key={index} style={{ rotate: `${index * 45}deg`, opacity: (index + 1) / 8 }} />
              ))}
            </span>
            <strong>{loader.title}</strong>
            <span>{status}</span>
          </div>
          <div className="travel-loader-bar" aria-hidden="true">
            <i />
          </div>
        </>
      )}
    </div>
  );
}
