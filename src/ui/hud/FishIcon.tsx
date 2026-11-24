import { fishLook } from "@/game/fishing/fish-look";

/** Side-view SVG of a species, coloured from the same look table as the 3D model. */
export function FishIcon({
  id,
  glow,
  className = "fish-artwork",
}: {
  id?: string | null;
  glow?: string;
  className?: string;
}) {
  const l = fishLook(id),
    k = `fi-${id ?? "x"}`,
    h = 4 + l.aspect * 56, // body half-height in a 56x28 box
    ty = Math.min(12, h + 3);
  return (
    <svg viewBox="0 0 56 28" width="56" height="28" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={k} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={l.back} />
          <stop offset=".55" stopColor={l.back} />
          <stop offset="1" stopColor={l.belly} />
        </linearGradient>
      </defs>
      <path
        d={`M${14 - l.tailLen * 14} ${14 - ty}Q12 14 ${14 - l.tailLen * 14} ${14 + ty}L14 15Q16 14 14 13Z`}
        fill={l.tail}
        opacity=".9"
      />
      <path
        d={`M${54 - l.dorsal[1] * 40} ${14 - h}L${54 - l.dorsal[0] * 40} ${14 - h}L${54 - l.dorsal[0] * 40 - 8} ${14 - h - l.dorsal[2] * 60}Z`}
        fill={l.fin}
        opacity=".9"
      />
      <path
        d={`M${54 - l.anal[1] * 40} ${14 + h}L${54 - l.anal[0] * 40} ${14 + h}L${54 - l.anal[0] * 40 - 4} ${14 + h + l.anal[2] * 50}Z`}
        fill={l.fin}
        opacity=".9"
      />
      <path
        d={`M14 ${14 - h * 0.3}C22 ${14 - h * 1.1} 38 ${14 - h * 1.2} 54 14C38 ${14 + h * 1.1} 22 ${14 + h * 0.9} 14 ${14 + h * 0.3}Z`}
        fill={`url(#${k})`}
        stroke={glow}
        strokeWidth={glow ? 1.2 : 0}
      />
      {l.bars &&
        [26, 31, 36, 41].map((x) => (
          <path
            key={x}
            d={`M${x} ${14 - h * 0.9}V${14 + h * 0.2}`}
            stroke={l.bars!.color}
            strokeWidth="2"
            opacity={l.bars!.strength}
          />
        ))}
      {l.patches && (
        <>
          <ellipse cx="28" cy={14 - h * 0.4} rx="5" ry={h * 0.35} fill={l.patches} />
          <ellipse cx="40" cy={14 - h * 0.2} rx="4" ry={h * 0.3} fill={l.patches} />
        </>
      )}
      <path d="M45 8q-3 6 0 12" stroke="#1d1a17" strokeWidth=".7" fill="none" opacity=".5" />
      <circle cx="48" cy={14 - h * 0.25} r="2.2" fill="#e9c46a" />
      <circle cx="48.4" cy={14 - h * 0.25} r="1.1" fill="#1d1a17" />
    </svg>
  );
}
