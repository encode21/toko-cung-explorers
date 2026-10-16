/** @jsxImportSource @/game/jsx */
import { useEffect, useRef } from "react";
import { Html, Text } from "@react-three/drei";
import { LOW_QUALITY } from "@/game/engine/quality";
import { WORLD_HTML_LAYERS } from "@/game/engine/world-html-layers";
import { trackTitle } from "./model";
import { YOUTUBE_ENABLED } from "./music-provider";
import { setClubYoutubeHost, useClubYoutubeUi } from "./youtube-host";
export function ClubMusicScreen({ color, mediaId }: { color: string; mediaId: string | null }) {
  // Stable callback ref — avoids remounting YouTube on every status re-render.
  const hostCb = useRef((el: HTMLDivElement | null) => {
    setClubYoutubeHost(el);
  }).current;
  const title = trackTitle(mediaId);
  const status = useClubYoutubeUi((s) => s.status);
  const errorCode = useClubYoutubeUi((s) => s.errorCode);
  // Mobile / low-quality: smaller CSS + higher distanceFactor so the wall panel stays on the mesh
  // (world ≈ cssPx * distanceFactor/400). Desktop keeps a slightly larger screen.
  const mobile =
    typeof window !== "undefined" &&
    (LOW_QUALITY || window.matchMedia("(max-width: 900px), (pointer: coarse)").matches);
  const DF = mobile ? 5.2 : 4.4;
  const W = mobile ? 400 : 560;
  const H = mobile ? 168 : 220;

  useEffect(() => () => setClubYoutubeHost(null), []);

  return (
    <>
      <mesh>
        <boxGeometry args={[6.4, 2.25, 0.16]} />
        <meshBasicMaterial color="#0b0d16" />
      </mesh>
      <Text position={[0, 1.22, 0.12]} fontSize={0.14} color={color} anchorX="center">
        CUNG WORLD · NOW PLAYING
      </Text>
      {YOUTUBE_ENABLED ? (
        <Html
          transform
          distanceFactor={DF}
          position={[0, -0.05, 0.12]}
          pointerEvents="none"
          style={{ width: W, height: H, pointerEvents: "none" }}
          zIndexRange={WORLD_HTML_LAYERS.screen}
        >
          <div
            className="pointer-events-none overflow-hidden rounded border border-white/20 bg-black text-white"
            style={{ width: W, height: H }}
          >
            <div className="flex items-center justify-between gap-2 bg-[#15121f]/95 px-2 py-0.5 text-[9px] tracking-wider text-fuchsia-200/90">
              <span>LIVE</span>
              <span className="truncate text-white/70">{title}</span>
              {(status === "unavailable" || status === "failed") && (
                <span className="text-rose-300">err{errorCode != null ? ` ${errorCode}` : ""}</span>
              )}
            </div>
            <div className="relative bg-black" style={{ width: W, height: H - 20 }}>
              <div
                ref={hostCb}
                className="h-full w-full bg-black"
                style={{ minWidth: 200, minHeight: 112 }}
              />
            </div>
          </div>
        </Html>
      ) : (
        <>
          <Text
            position={[0, 0.15, 0.12]}
            fontSize={0.28}
            color="#fff3dc"
            maxWidth={5.5}
            textAlign="center"
          >
            {title}
          </Text>
          <Text position={[0, -0.55, 0.12]} fontSize={0.16} color="#bcb2cd">
            YouTube disabled
          </Text>
        </>
      )}
    </>
  );
}
