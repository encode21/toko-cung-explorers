/** Original pictograms for the appearance choices, matching the selected color palette. */
export function ExplorerLookIcon({
  kind,
  id,
  skin = "#f0c7a5",
  hair = "#46352b",
}: {
  kind: "body" | "hair" | "face" | "colors";
  id: string;
  skin?: string;
  hair?: string;
}) {
  if (kind === "colors")
    return (
      <svg viewBox="0 0 80 80" aria-hidden>
        <circle cx="27" cy="27" r="13" fill="#443b36" />
        <circle cx="53" cy="27" r="13" fill="#f5ceaf" />
        <circle cx="27" cy="53" r="13" fill="#b4d783" />
        <circle cx="53" cy="53" r="13" fill="#39bedc" />
      </svg>
    );
  if (kind === "body") {
    const child = id === "child",
      slim = id === "slim",
      heavy = id === "heavy",
      muscular = id === "muscular";
    const shoulder = heavy || muscular ? 20 : slim ? 7 : 12;
    const waist = heavy ? 18 : muscular ? 10 : slim ? 5 : id === "female" ? 8 : 10;
    return (
      <svg viewBox="0 0 80 80" aria-hidden fill="#514740">
        <g transform={child ? "translate(7 15) scale(.82)" : undefined}>
          <circle cx="40" cy="18" r={child ? 15 : 10} />
          <path
            d={`M${40 - shoulder} 31 Q40 25 ${40 + shoulder} 31 L${40 + waist} 55 H${40 - waist}Z`}
          />
          <path
            d={`M${40 - shoulder} 34 Q${20 - shoulder / 2} 43 ${28 - shoulder / 2} 50 M${40 + shoulder} 34 Q${60 + shoulder / 2} 43 ${52 + shoulder / 2} 50 M34 54 L32 69 M46 54 L48 69`}
            fill="none"
            stroke="#514740"
            strokeWidth={slim ? 4 : muscular ? 9 : 7}
            strokeLinecap="round"
          />
        </g>
      </svg>
    );
  }
  const hairPaths: Record<string, string> = {
    short: "M17 39Q12 13 39 12Q68 12 64 39L58 29 47 31 39 25 29 32 21 30Z",
    spiky:
      "M15 39L10 25 23 26 20 12 32 20 39 6 46 20 59 12 57 27 69 26 63 40 54 28 42 31 30 27 22 34Z",
    bob: "M14 63V34Q13 10 40 10Q67 10 66 34V63L54 67 55 30 45 32 39 28 27 31 25 67Z",
    buns: "M16 36Q10 14 40 13Q68 14 64 36L54 26 40 31 28 27Z",
    buzz: "M17 32Q17 11 40 11Q63 11 63 32L55 27H25Z",
    sidepart: "M16 40Q8 13 37 10Q69 10 64 39L55 25Q36 42 20 31Z",
    ponytail: "M17 38Q11 13 40 12Q65 13 64 37L54 26 43 29 31 25 23 34Z",
    hijab:
      "M12 62V35Q12 7 40 7Q68 7 68 35V62L40 74Z M24 36Q22 23 40 22Q58 23 56 36V49Q40 70 24 49Z",
  };
  return (
    <svg viewBox="0 0 80 80" aria-hidden>
      {kind === "hair" && id === "ponytail" && (
        <ellipse cx="64" cy="41" rx="10" ry="23" fill={hair} />
      )}
      {kind === "hair" && id === "buns" && (
        <g fill={hair}>
          <circle cx="17" cy="24" r="12" />
          <circle cx="63" cy="24" r="12" />
        </g>
      )}
      <g fill={skin}>
        <ellipse cx="40" cy="41" rx="24" ry="27" />
        <ellipse cx="16" cy="43" rx="4" ry="6" />
        <ellipse cx="64" cy="43" rx="4" ry="6" />
      </g>
      {kind === "hair" ? (
        <path d={hairPaths[id] ?? hairPaths["short"]} fill={hair} fillRule="evenodd" />
      ) : (
        <g fill="#493b32" stroke="#493b32" strokeLinecap="round">
          {id === "calm" ? (
            <path d="M25 39q5 4 10 0M46 39q5 4 10 0" fill="none" strokeWidth="2.5" />
          ) : (
            <>
              <ellipse cx="29" cy="39" rx="3" ry="4" />
              {id === "wink" ? (
                <path d="M46 39q5 4 10 0" fill="none" strokeWidth="2.5" />
              ) : (
                <ellipse cx="51" cy="39" rx="3" ry="4" />
              )}
            </>
          )}
          {id === "grin" ? (
            <>
              <path d="M28 50Q40 54 53 50Q42 69 28 50Z" />
              <path d="M31 52Q41 55 50 52" stroke="#fff8df" strokeWidth="3" fill="none" />
            </>
          ) : (
            <path
              d={id === "calm" ? "M35 54h10" : "M33 52q7 8 14 0"}
              strokeWidth="2.5"
              fill="none"
            />
          )}
        </g>
      )}
    </svg>
  );
}
