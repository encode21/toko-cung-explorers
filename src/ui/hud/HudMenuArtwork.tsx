type ArtworkKind =
  | "kulakan-book"
  | "daily-missions"
  | "prolog"
  | "delivery"
  | "shop"
  | "quests"
  | "explore"
  | "daily-login"
  | "phone"
  | "stop-guidance"
  | "spawn"
  | "warung-manage"
  | "warung-decor"
  | "warung-community"
  | "warung-lock"
  | "warung-sealed"
  | "warung-exit"
  | "warung-work"
  | "warung-shop"
  | "warung-closed"
  | "calendar";

/** Small, local illustrations stay sharp at every HUD scale without image downloads. */
export function HudMenuArtwork({ kind }: { kind: ArtworkKind }) {
  return (
    <svg className="mmo-menu-artwork" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {kind === "kulakan-book" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="29" fill="#f9d58b" />
          <path
            d="M7 17q12-5 25 2 13-7 25-2v33q-13-5-25 1-12-6-25-1Z"
            fill="#b77a42"
            stroke="#79533d"
            strokeWidth="2.5"
          />
          <path
            d="M11 13q10-3 21 4 11-7 21-4v32q-11-3-21 3-10-6-21-3Z"
            fill="#fff8e5"
            stroke="#a47c50"
            strokeWidth="2"
          />
          <path
            d="M32 17v31M17 22l9 3m-9 5 9 3m12-8 9-3m-9 11 9-3"
            stroke="#c5a16a"
            strokeWidth="2"
          />
          <path d="M39 14v16l5-4 5 2V13" fill="#4eb6bd" />
        </g>
      )}
      {kind === "prolog" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="29" fill="#a9e2e6" />
          <path
            d="m11 23 14-6 15 5 13-5v26l-13 6-15-5-14 6Z"
            fill="#fff0cd"
            stroke="#9c7752"
            strokeWidth="2.5"
          />
          <path d="M25 18v26m15-22v26" stroke="#dfc299" strokeWidth="2" />
          <path d="M18 40c0-6 8-8 13-4" stroke="#67aaa5" strokeWidth="3" strokeDasharray="2 5" />
          <path
            d="M39 40c-2-4-10-10-10-17a10 10 0 0 1 20 0c0 7-8 13-10 17Z"
            fill="#efa754"
            stroke="#985738"
            strokeWidth="2.5"
          />
          <circle cx="39" cy="23" r="3.5" fill="#fff2d2" />
        </g>
      )}
      {kind === "delivery" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="31" r="29" fill="#a9e2e6" />
          <ellipse cx="33" cy="51" rx="24" ry="4" fill="#65aab2" opacity="0.35" />
          <rect
            x="7"
            y="17"
            width="31"
            height="29"
            rx="4"
            fill="#f9c752"
            stroke="#ac7746"
            strokeWidth="2.5"
          />
          <path d="M38 27h11l9 10v9H38Z" fill="#efaa42" stroke="#ac7746" strokeWidth="2.5" />
          <path d="M42 30h6l6 8H42Z" fill="#9bdce9" stroke="#508590" strokeWidth="2" />
          <path d="M12 22h21M12 39h21" stroke="#fff2b0" strokeWidth="3" />
          <rect
            x="17"
            y="26"
            width="12"
            height="10"
            rx="1.5"
            fill="#ffe7a3"
            stroke="#ba884e"
            strokeWidth="1.5"
          />
          <path d="M23 27v4" stroke="#ba884e" strokeWidth="2" />
          <path d="M54 42h4" stroke="#fff7cd" strokeWidth="3" />
          <path d="M7 46h51" stroke="#76675a" strokeWidth="3" />
          <g fill="#465a63" stroke="#34454e" strokeWidth="2">
            <circle cx="17" cy="47" r="6" />
            <circle cx="48" cy="47" r="6" />
          </g>
          <g fill="#d5e9e9">
            <circle cx="17" cy="47" r="2.5" />
            <circle cx="48" cy="47" r="2.5" />
          </g>
        </g>
      )}
      {kind === "warung-decor" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="29" fill="#e5cdf1" />
          <path d="M47 21h4v12a5 5 0 0 1-5 5H34v7" stroke="#a8784e" strokeWidth="3.5" />
          <rect
            x="12"
            y="13"
            width="35"
            height="17"
            rx="5"
            fill="#5fc7d8"
            stroke="#4d919b"
            strokeWidth="2.5"
          />
          <path d="M19 18h21" stroke="#d7f6f1" strokeWidth="3" />
          <rect
            x="29"
            y="41"
            width="10"
            height="14"
            rx="4"
            fill="#edaa62"
            stroke="#a8784e"
            strokeWidth="2.5"
          />
        </g>
      )}
      {kind === "warung-community" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="29" fill="#c6e6f1" />
          <path
            d="M6 49c0-9 5-15 12-15s12 6 12 15"
            fill="#f3a47a"
            stroke="#a86c50"
            strokeWidth="2"
          />
          <circle cx="18" cy="25" r="9" fill="#ffe4b5" stroke="#a86c50" strokeWidth="2" />
          <path d="M10 24c0-8 5-11 10-9 5 0 7 4 7 8l-7-4-5 5Z" fill="#875746" />
          <path
            d="M34 49c0-9 5-15 12-15s12 6 12 15"
            fill="#bc8ee1"
            stroke="#7d619e"
            strokeWidth="2"
          />
          <circle cx="46" cy="25" r="9" fill="#eec197" stroke="#a86c50" strokeWidth="2" />
          <path d="M37 25c-1-8 3-12 9-12s10 4 9 12l-6-5-4 3-4-3Z" fill="#58494f" />
          <path
            d="M17 55c0-11 6-18 15-18s15 7 15 18"
            fill="#58bdce"
            stroke="#408593"
            strokeWidth="2"
          />
          <circle cx="32" cy="28" r="10" fill="#ffddb0" stroke="#a86c50" strokeWidth="2" />
          <path d="M22 27c-1-9 5-14 12-12 7 1 10 5 8 13l-7-6-7 4-3-3Z" fill="#805446" />
          <path d="m26 42 6 5 6-5" stroke="#e2f7ef" strokeWidth="3" />
          <path d="m29 32 3 2 3-2" stroke="#9e624b" strokeWidth="1.5" />
          <circle cx="28" cy="28" r="1.2" fill="#6d4b3b" />
          <circle cx="36" cy="28" r="1.2" fill="#6d4b3b" />
        </g>
      )}
      {kind === "warung-manage" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="29" fill="#ffe2a7" />
          <rect
            x="15"
            y="14"
            width="34"
            height="40"
            rx="5"
            fill="#fff8df"
            stroke="#b67c48"
            strokeWidth="2.5"
          />
          <rect
            x="25"
            y="10"
            width="14"
            height="9"
            rx="3"
            fill="#72c9dd"
            stroke="#427584"
            strokeWidth="2.5"
          />
          <path d="M23 28h18M23 37h18M23 46h18" stroke="#b67c48" strokeWidth="3" />
          <g fill="#72c9dd" stroke="#427584" strokeWidth="2">
            <circle cx="28" cy="28" r="3.5" />
            <circle cx="36" cy="37" r="3.5" />
            <circle cx="28" cy="46" r="3.5" />
          </g>
        </g>
      )}
      {(kind === "warung-lock" || kind === "warung-sealed") && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="29" fill={kind === "warung-sealed" ? "#ffd0c0" : "#c8e9a1"} />
          <path d="M21 28V19a11 11 0 0 1 22 0v9" stroke="#477e72" strokeWidth="7" />
          <path d="M22 26V19a10 10 0 0 1 20 0v7" stroke="#e7f8d9" strokeWidth="3" />
          <rect
            x="16"
            y="25"
            width="32"
            height="29"
            rx="7"
            fill="#efba57"
            stroke="#a17436"
            strokeWidth="2"
          />
          <path d="M20 29h23" stroke="#fff1b4" strokeWidth="3" />
          <circle cx="32" cy="37" r="4" fill="#725330" />
          <path d="M30 39h4v7h-4Z" fill="#725330" />
          {kind === "warung-sealed" && (
            <g>
              <circle cx="48" cy="48" r="11" fill="#f58a74" stroke="#fff8df" strokeWidth="3" />
              <path d="m44 44 8 8m0-8-8 8" stroke="#8f493b" strokeWidth="3" />
            </g>
          )}
        </g>
      )}
      {kind === "warung-exit" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="29" fill="#aae3e9" />
          <path d="M14 52V12h25v40" fill="#fff6d5" stroke="#a8784e" strokeWidth="2" />
          <path d="m18 15 16 5v34l-16-5Z" fill="#ecaa66" stroke="#a8784e" strokeWidth="2" />
          <path d="M22 22v21" stroke="#ffd7a0" strokeWidth="3" />
          <circle cx="29" cy="36" r="2" fill="#8b583a" />
          <path
            d="M39 27h8v-6l12 12-12 12v-7h-8Z"
            fill="#f67867"
            stroke="#fff9e2"
            strokeWidth="3"
          />
          <path d="M40 31h10" stroke="#ffb39b" strokeWidth="2" />
          <path d="M11 54h27" stroke="#6ca7ac" strokeWidth="3" />
        </g>
      )}
      {kind === "warung-work" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="29" fill="#c9dbf5" />
          <path d="M25 22v-6a7 7 0 0 1 14 0v6" fill="none" stroke="#b75e52" strokeWidth="5" />
          <path
            d="M22 20h20l-1 12 8 19c-10 6-24 6-34 0l8-19Z"
            fill="#f98d78"
            stroke="#b75e52"
            strokeWidth="2"
          />
          <path d="M25 24h14" stroke="#ffc1a5" strokeWidth="3" />
          <path d="M24 36h16v8c-5 4-11 4-16 0Z" fill="#ffe4b6" stroke="#b75e52" strokeWidth="2" />
          <circle cx="48" cy="46" r="12" fill="#a8d779" stroke="#fff8df" strokeWidth="3" />
          <path d="m42 46 4 4 8-9" fill="none" stroke="#47734a" strokeWidth="3" />
        </g>
      )}
      {kind === "warung-shop" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="29" fill="#f7c4ce" />
          <path d="M17 30V18h11v12" fill="#efbd66" stroke="#bc8843" strokeWidth="2" />
          <path d="M19 21h7" stroke="#fff0b5" strokeWidth="2" />
          <path d="M35 29V16h10v13" fill="#91cfe2" stroke="#598fa5" strokeWidth="2" />
          <path d="M37 12h6v5h-6Z" fill="#fff6d5" stroke="#598fa5" strokeWidth="2" />
          <path
            d="M27 29c-4-7-3-13 1-16 5 2 8 8 6 16Z"
            fill="#9bc96d"
            stroke="#648848"
            strokeWidth="2"
          />
          <path d="M14 30h37l-5 22H19Z" fill="#e97776" stroke="#a85257" strokeWidth="2" />
          <path d="m24 35 1 11m7-11v11m8-11-1 11" stroke="#ffe3c9" strokeWidth="4" />
          <path d="M12 29h41" stroke="#a85257" strokeWidth="7" />
          <path d="M13 28h39" stroke="#ffb8a4" strokeWidth="4" />
          <path d="m20 28 9-13m15 13-9-13" stroke="#a85257" strokeWidth="3" />
        </g>
      )}
      {kind === "warung-closed" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="29" fill="#d5c8ed" />
          <path
            d="M39 10a22 22 0 1 0 14 32A22 22 0 0 1 39 10Z"
            fill="#ffe5a1"
            stroke="#b58d50"
            strokeWidth="2"
          />
          <path d="M17 27a16 16 0 0 0 10 20" stroke="#fff6ce" strokeWidth="3" />
          <path d="m45 13 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#fff8dd" />
          <path d="m54 30 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="#fff8dd" />
        </g>
      )}
      {kind === "calendar" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="29" fill="#cfe8f5" />
          <rect
            x="15"
            y="17"
            width="34"
            height="31"
            rx="4"
            fill="#fffaf0"
            stroke="#4f7a92"
            strokeWidth="2.5"
          />
          <path d="M15 26h34" stroke="#4f7a92" strokeWidth="2.5" />
          <rect x="15" y="17" width="34" height="9" rx="4" fill="#e8665a" />
          <path d="M23 13v8M41 13v8" stroke="#4f7a92" strokeWidth="3" />
          <path d="M21 32h5M29.5 32h5M38 32h5M21 39h5M29.5 39h5" stroke="#9bb7c6" strokeWidth="3" />
          <rect x="37" y="36" width="7" height="6" rx="1.5" fill="#f2b632" />
        </g>
      )}
      {kind === "spawn" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="26" fill="#91dce5" stroke="#fff8d9" strokeWidth="4" />
          <path d="m18 31 14-12 14 12v16H18Z" fill="#fff8d9" stroke="#427584" strokeWidth="2" />
          <path d="M28 47V35h8v12" fill="#efbd66" stroke="#b88040" strokeWidth="2" />
          <path d="M14 24a20 20 0 0 1 35 0M14 15v9h9" stroke="#fff8d9" strokeWidth="5" />
          <path d="M14 24a20 20 0 0 1 35 0M14 15v9h9" stroke="#427584" strokeWidth="2" />
        </g>
      )}
      {kind === "stop-guidance" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <g stroke="#fff8d9" strokeWidth="6">
            <path d="m15 20 17-14 17 14-6 7-11-9-11 9Z" />
            <path d="m15 35 17-14 17 14-6 7-11-9-11 9Z" />
            <path d="m15 50 17-14 17 14-6 7-11-9-11 9Z" />
          </g>
          <g stroke="#427584" strokeWidth="2">
            <path d="m15 20 17-14 17 14-6 7-11-9-11 9Z" fill="#a5e8df" />
            <path d="m15 35 17-14 17 14-6 7-11-9-11 9Z" fill="#6cd4dc" />
            <path d="m15 50 17-14 17 14-6 7-11-9-11 9Z" fill="#39bedc" />
          </g>
          <path d="m10 10 44 44" stroke="#fff8d9" strokeWidth="9" />
          <path d="m10 10 44 44" stroke="#ad5245" strokeWidth="6" />
          <path d="m10 9 44 44" stroke="#ff8c70" strokeWidth="3.5" />
        </g>
      )}
      {kind === "daily-missions" && (
        <g transform="rotate(-9 32 32)" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 13h38v43H14z" fill="#bb8147" stroke="#fff8d9" strokeWidth="3" />
          <path d="M11 9h38v43H11z" fill="#fff5d6" stroke="#d6ac72" strokeWidth="2" />
          <path d="M38 52H11V10h38v31z" fill="#fff9e5" />
          <path d="m38 52 1-12 10 1" fill="#e4c18c" />
          <path d="M23 9h15v8H23z" fill="#e7b35e" stroke="#bd8449" strokeWidth="2" />
          <circle cx="31" cy="8" r="5" fill="#ff756a" stroke="#b94a47" strokeWidth="2" />
          <path d="m17 25 2 2 4-5m-6 14 2 2 4-5" stroke="#61aa97" strokeWidth="3" />
          <path d="M28 25h12M28 35h12M17 44h13" stroke="#bda27e" strokeWidth="3" />
        </g>
      )}
      {kind === "shop" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 24h44v31H10z" fill="#fff1d6" stroke="#fff" strokeWidth="3" />
          <path d="M7 24 13 13h38l6 11" fill="#ff6d79" stroke="#a44758" strokeWidth="2" />
          <path d="m20 13-2 11m12-11v11m12-11 2 11" stroke="#fff2dc" strokeWidth="7" />
          <path
            d="M7 24h50v5c0 6-10 6-10 0 0 6-10 6-10 0 0 6-10 6-10 0 0 6-10 6-10 0 0 6-10 6-10 0z"
            fill="#ff7d88"
            stroke="#a44758"
            strokeWidth="2"
          />
          <path
            d="M17 38h12v17H17zM36 38h11v10H36z"
            fill="#8fdded"
            stroke="#75a1b7"
            strokeWidth="2"
          />
          <path d="m38 40 7 6" stroke="#e6fbff" strokeWidth="2" />
          <rect
            x="19"
            y="3"
            width="26"
            height="13"
            rx="4"
            fill="#f54d66"
            stroke="#fff1d6"
            strokeWidth="2"
          />
          <path d="M29 7h6m-3-2v9m-3-4h6" stroke="#fff" strokeWidth="2" />
        </g>
      )}
      {kind === "quests" && (
        <g transform="rotate(8 32 32)" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 10h32v42H16z" fill="#ffe9ae" stroke="#fff8d6" strokeWidth="4" />
          <path
            d="M18 11v36c0 8-12 8-12 0h32c0 8 13 8 13 0V16c0-8-13-8-13 0H13c-8 0-8-11 0-11h32"
            fill="#ffe7a0"
            stroke="#bf8951"
            strokeWidth="2"
          />
          <path d="M18 22h14M18 29h10" stroke="#c8a06b" strokeWidth="3" />
          <path
            d="m43 27 4 8 9 1-7 7 1 10-7-5-8 5 1-10-7-7 10-1z"
            fill="#ffc949"
            stroke="#aa713b"
            strokeWidth="2"
          />
        </g>
      )}
      {kind === "explore" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="33" r="25" fill="#f8d47a" stroke="#fff5d9" strokeWidth="3" />
          <circle cx="32" cy="33" r="20" fill="#82d6de" stroke="#b27c44" strokeWidth="2" />
          <path d="M32 15v4m0 28v4M14 33h4m28 0h4" stroke="#eaffff" strokeWidth="2" />
          <path d="m43 20-6 18-16 8 6-18z" fill="#fffaf0" stroke="#427584" strokeWidth="2" />
          <path d="m43 20-6 18-10-10z" fill="#ff747e" />
          <circle cx="32" cy="33" r="3" fill="#f9e6b0" stroke="#816c49" />
          <path d="M27 7V4h10v3" stroke="#e7bc66" strokeWidth="3" />
        </g>
      )}
      {kind === "daily-login" && (
        <g transform="rotate(-5 32 32)" strokeLinecap="round" strokeLinejoin="round">
          <rect
            x="10"
            y="10"
            width="43"
            height="44"
            rx="7"
            fill="#faf0ff"
            stroke="#fff"
            strokeWidth="3"
          />
          <path d="M10 25V17a7 7 0 0 1 7-7h29a7 7 0 0 1 7 7v8" fill="#b16aee" />
          <path d="M22 6v10M42 6v10" stroke="#694d9d" strokeWidth="5" />
          <path d="M19 32h5m-5 7h5m6-7h4m-4 7h4" stroke="#bbaccf" strokeWidth="3" />
          <path d="M35 38h24v18H35z" fill="#ffce62" stroke="#ad7648" strokeWidth="2" />
          <path d="M33 36h28v6H33z" fill="#ffe292" stroke="#ad7648" strokeWidth="2" />
          <path d="M47 37v19" stroke="#fc7c91" strokeWidth="5" />
          <path
            d="M47 36c-17-1-13-16-5-9zm0 0c17-1 13-16 5-9z"
            fill="#ff8b9c"
            stroke="#bf5e78"
            strokeWidth="2"
          />
        </g>
      )}
      {kind === "phone" && (
        <g transform="rotate(10 32 32)" strokeLinecap="round" strokeLinejoin="round">
          <rect
            x="17"
            y="3"
            width="32"
            height="55"
            rx="7"
            fill="#81dfed"
            stroke="#f0ffff"
            strokeWidth="3"
          />
          <rect x="21" y="7" width="24" height="46" rx="4" fill="#263859" />
          <path d="M29 9h8" stroke="#83adbf" strokeWidth="2" />
          <path d="m23 16 20 12v9L23 25z" fill="#405d83" />
          <rect x="25" y="32" width="6" height="6" rx="2" fill="#7edcbb" />
          <rect x="35" y="32" width="6" height="6" rx="2" fill="#ffc768" />
          <rect x="25" y="42" width="6" height="6" rx="2" fill="#bb93ff" />
          <rect x="35" y="42" width="6" height="6" rx="2" fill="#f587a8" />
        </g>
      )}
    </svg>
  );
}
