type ArtworkKind =
  | "daily-missions"
  | "shop"
  | "quests"
  | "explore"
  | "daily-login"
  | "phone"
  | "stop-guidance"
  | "spawn";

/** Small, local illustrations stay sharp at every HUD scale without image downloads. */
export function HudMenuArtwork({ kind }: { kind: ArtworkKind }) {
  return (
    <svg className="mmo-menu-artwork" viewBox="0 0 64 64" fill="none" aria-hidden="true">
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
