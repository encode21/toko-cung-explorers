import { HudMenuArtwork } from "./HudMenuArtwork";

export type PhoneAppKind =
  | "camera"
  | "inventory"
  | "map"
  | "quest"
  | "daily-missions"
  | "shop"
  | "appearance"
  | "profile"
  | "daily-login"
  | "explore"
  | "archive"
  | "feed"
  | "settings"
  | "help";

const SHARED_ARTWORK = {
  quest: "quests",
  "daily-missions": "daily-missions",
  shop: "shop",
  "daily-login": "daily-login",
  explore: "explore",
} as const;

/** Local game illustrations, shared with the HUD wherever the application matches. */
export function PhoneAppArtwork({ kind }: { kind: PhoneAppKind }) {
  if (kind in SHARED_ARTWORK) {
    return (
      <span className="phone-app-artwork" aria-hidden="true">
        <HudMenuArtwork kind={SHARED_ARTWORK[kind as keyof typeof SHARED_ARTWORK]} />
      </span>
    );
  }

  return (
    <svg
      className="phone-app-artwork"
      viewBox="0 0 64 64"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {kind === "camera" && (
        <g transform="rotate(-6 32 32)">
          <path d="M8 21h12l5-8h16l5 8h10v31H8Z" fill="#fff3cf" stroke="#fffdf5" strokeWidth="3" />
          <rect x="8" y="26" width="48" height="25" rx="7" fill="#39bedc" />
          <circle cx="32" cy="35" r="13" fill="#79584d" stroke="#fffdf5" strokeWidth="3" />
          <circle cx="32" cy="35" r="8" fill="#24677d" />
          <circle cx="29" cy="32" r="3" fill="#b7eff4" />
          <rect x="46" y="22" width="7" height="5" rx="2" fill="#ffa415" />
        </g>
      )}
      {kind === "inventory" && (
        <g>
          <rect
            x="10"
            y="19"
            width="44"
            height="39"
            rx="11"
            fill="#efdaad"
            stroke="#fff9e9"
            strokeWidth="3"
          />
          <path d="M23 20v-7a9 9 0 0 1 18 0v7" stroke="#79584d" strokeWidth="5" />
          <path d="m27 38-9-8v18z" fill="#39bedc" />
          <ellipse cx="35" cy="38" rx="13" ry="9" fill="#39bedc" />
          <circle cx="41" cy="35" r="2" fill="#134e63" />
        </g>
      )}
      {kind === "map" && (
        <g transform="rotate(-6 32 32)">
          <path
            d="m6 18 16-6 19 6 16-6v39l-16 6-19-6-16 6z"
            fill="#fff4d3"
            stroke="#fff9e9"
            strokeWidth="4"
          />
          <path d="m6 18 16-6v39L6 57z" fill="#9bdba0" />
          <path d="m41 18 16-6v39l-16 6z" fill="#b7e5aa" />
          <path d="m6 39 10-4 7 5 9-5 12 3 13-7" stroke="#76c6d8" strokeWidth="6" />
          <path d="m12 24 12 4 9 18 15-1 5-5" stroke="#fffbdf" strokeWidth="4" />
          <path d="M22 15v36m19-32v35" stroke="#699e78" strokeOpacity="0.45" strokeWidth="2" />
          <path
            d="M49 20c0 7-11 15-11 15S27 27 27 20a11 11 0 0 1 22 0Z"
            fill="#ff8088"
            stroke="#a64b61"
            strokeWidth="2"
          />
          <circle cx="38" cy="20" r="4" fill="#fff2d9" />
          <path d="m10 10 2-4 2 4 4 2-4 2-2 4-2-4-4-2z" fill="#ffe68a" />
        </g>
      )}

      {(kind === "profile" || kind === "appearance") && (
        <g>
          <path
            d="M9 56v-5c0-10 9-17 23-17s23 7 23 17v5Z"
            fill="#72cdbd"
            stroke="#fff5dc"
            strokeWidth="4"
          />
          <path d="m21 39 11 11 11-11" fill="#fff5d9" stroke="#458b8c" strokeWidth="2" />
          <path d="M27 34v7l5 5 5-5v-7" fill="#efb788" stroke="#a9775c" strokeWidth="2" />
          <path
            d="M15 23C11 1 51 0 49 25l-6 13H21Z"
            fill="#77504d"
            stroke="#543e47"
            strokeWidth="2"
          />
          <circle cx="16" cy="27" r="4" fill="#f9c89b" />
          <circle cx="48" cy="27" r="4" fill="#f9c89b" />
          <path
            d="M18 22c6-1 11-5 14-11 3 7 9 10 14 11v8c0 9-7 14-14 14s-14-5-14-14Z"
            fill="#ffd6aa"
            stroke="#a9775c"
            strokeWidth="2"
          />
          <path d="M25 27v2m14-2v2" stroke="#64484c" strokeWidth="3" />
          <path d="M28 35q4 4 8 0" stroke="#b46666" strokeWidth="2" />
          <path d="M21 32h3m16 0h3" stroke="#f2a38e" strokeWidth="3" />
          <path d="m52 8 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z" fill="#fff0a2" />
          <path d="M32 50v5" stroke="#458b8c" strokeWidth="2" />
        </g>
      )}

      {kind === "archive" && (
        <g transform="rotate(-9 32 32)">
          <path d="M14 9h37v46H14c-7 0-7-10 0-10" fill="#f8e6ba" stroke="#fff9e4" strokeWidth="4" />
          <path
            d="M14 7h35v39H14c-7 0-7 9 0 9h36"
            fill="#a58bdf"
            stroke="#6d568f"
            strokeWidth="2"
          />
          <path d="M16 8v36" stroke="#cbb6ed" strokeWidth="4" />
          <path d="M18 49h28m-28 3h28" stroke="#cbb78e" strokeWidth="1.5" />
          <path d="M37 8h8v17l-4-3-4 3Z" fill="#f58b99" stroke="#a75b78" strokeWidth="1.5" />
          <path
            d="m29 20 3 6 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1Z"
            fill="#ffe293"
            stroke="#ad814f"
            strokeWidth="2"
          />
          <path d="m53 30 2-4 2 4 4 2-4 2-2 4-2-4-4-2Z" fill="#fff2bf" />
        </g>
      )}

      {kind === "feed" && (
        <g transform="rotate(-8 32 32)">
          <path d="M25 47a7 7 0 0 0 14 0" fill="#e99b61" stroke="#a77448" strokeWidth="2" />
          <path d="M28 13V9a4 4 0 0 1 8 0v4" stroke="#a77448" strokeWidth="4" />
          <path
            d="M13 45c6-5 5-12 5-18a14 14 0 0 1 28 0c0 6-1 13 5 18v4H13Z"
            fill="#ffd46d"
            stroke="#fff5db"
            strokeWidth="4"
          />
          <path
            d="M13 45c6-5 5-12 5-18a14 14 0 0 1 28 0c0 6-1 13 5 18v4H13Z"
            stroke="#b6804e"
            strokeWidth="2"
          />
          <path d="M24 27c0-6 3-9 7-10" stroke="#fff0b3" strokeWidth="4" />
          <path d="M20 43h24M8 20l-3-4m49 4 3-4" stroke="#b6804e" strokeWidth="2" />
          <circle cx="49" cy="15" r="9" fill="#ff8091" stroke="#fff7e3" strokeWidth="3" />
          <path d="M49 11v4m0 4v.1" stroke="#fff8e9" strokeWidth="3" />
        </g>
      )}

      {kind === "settings" && (
        <g transform="rotate(10 32 32)">
          <path
            d="m26 6 12 0 2 8 5 3 8-2 6 10-6 6v5l6 6-6 10-8-2-5 3-2 8H26l-2-8-5-3-8 2-6-10 6-6v-5l-6-6 6-10 8 2 5-3Z"
            fill="#80cedd"
            stroke="#fff7df"
            strokeWidth="4"
          />
          <path
            d="m26 6 12 0 2 8 5 3 8-2 6 10-6 6v5l6 6-6 10-8-2-5 3-2 8H26l-2-8-5-3-8 2-6-10 6-6v-5l-6-6 6-10 8 2 5-3Z"
            stroke="#4d8eab"
            strokeWidth="2"
          />
          <circle cx="32" cy="33" r="15" fill="#b5e8ec" />
          <circle cx="32" cy="33" r="10" fill="#fff1d1" stroke="#4d8eab" strokeWidth="2" />
          <path d="M24 22a14 14 0 0 1 16 0" stroke="#e8ffff" strokeWidth="3" />
          <circle cx="32" cy="33" r="4" fill="#e2bb7f" />
        </g>
      )}

      {kind === "help" && (
        <g>
          <path
            d="M5 17c11-3 19-1 27 5 8-6 16-8 27-5v36c-11-3-19-1-27 5-8-6-16-8-27-5Z"
            fill="#6ac7b2"
            stroke="#fff5d9"
            strokeWidth="4"
          />
          <path
            d="M8 12c10-1 17 2 24 8 7-6 14-9 24-8v36c-10-1-17 2-24 8-7-6-14-9-24-8Z"
            fill="#fff2d2"
            stroke="#ac8a62"
            strokeWidth="2"
          />
          <path d="M32 21v34" stroke="#d8ba8e" strokeWidth="2" />
          <path
            d="m14 33 11 4m-11 3 9 3m16-5 10-4m-10 11 10-4"
            stroke="#c9b48f"
            strokeWidth="2.5"
          />
          <circle cx="41" cy="19" r="14" fill="#83d7d7" stroke="#fff7df" strokeWidth="3" />
          <path d="M36 15c0-7 12-7 12 0 0 4-7 4-7 8m0 5v.1" stroke="#3b8095" strokeWidth="3" />
          <path d="M16 13v14l4-3 4 5V16" fill="#ff9b83" stroke="#bd745e" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}
