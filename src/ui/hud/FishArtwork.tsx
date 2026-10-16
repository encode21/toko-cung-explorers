import { TIER_COLORS, type FishTier } from "@/game/fishing/model";

/** The same species silhouette is used in the catch reveal and inventory. */
export function FishArtwork({ id, tier }: { id: string; tier: FishTier }) {
  const long = id === "arwana" || id === "naga";
  return (
    <svg viewBox="0 0 120 72" aria-hidden="true" className="fish-artwork">
      <ellipse cx="60" cy="62" rx="34" ry="4" fill="#79584d" opacity=".1" />
      <path d="M36 36 12 16v40z" fill={TIER_COLORS[tier]} stroke="#fff4d3" strokeWidth="3" />
      <path d="m51 23 16-17 10 20m-21 23 12 14 7-17" fill={TIER_COLORS[tier]} />
      <ellipse cx="65" cy="36" rx={long ? 41 : 34} ry={long ? 16 : 23} fill={TIER_COLORS[tier]} />
      <path d="M42 41q27 20 51-1-14 13-30 13Z" fill="#fff4d3" opacity=".8" />
      <path d="m59 31 12 7-12 8" fill="#fff4d3" opacity=".65" />
      {id === "koi" && <path d="m43 20 12 3-4 24-13-7m29-25 12 2-6 15-9-4" fill="#ff986b" />}
      <circle cx="85" cy="30" r="6" fill="#fffef5" />
      <circle cx="87" cy="30" r="3" fill="#34312e" />
      {tier === "Legendary" && (
        <path
          d="m54 17-5-13 12 7 8-10 5 15M104 13v10m-5-5h10"
          fill="#ffe27a"
          stroke="#b77c19"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}
