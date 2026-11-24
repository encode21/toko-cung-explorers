/** Filled toy-like illustrations for the phone's local business apps. */
export function PhoneBusinessArtwork({ kind }: { kind: string }) {
  switch (kind) {
    case "warung":
      return (
        <g>
          <path d="M11 27h42v29H11Z" fill="#fff2ce" stroke="#fff8e5" strokeWidth="5" />
          <path d="M11 27h42v29H11Z" stroke="#aa7955" strokeWidth="1.8" />
          <path d="M46 30h7v26h-7Z" fill="#e9cca0" />
          <rect
            x="17"
            y="35"
            width="13"
            height="21"
            rx="2"
            fill="#70c5d3"
            stroke="#548a96"
            strokeWidth="1.8"
          />
          <path d="m20 38 7 0-7 8Z" fill="#c4f0ed" />
          <circle cx="26" cy="47" r="1.3" fill="#fff3c9" />
          <rect
            x="35"
            y="35"
            width="12"
            height="12"
            rx="2"
            fill="#98d8de"
            stroke="#548a96"
            strokeWidth="1.8"
          />
          <path d="m37 37 7 0-7 7Z" fill="#d7f4e9" />
          <path d="M9 29 15 13h34l6 16v3H9Z" fill="#f29172" stroke="#fff8e5" strokeWidth="5" />
          <path d="M9 29 15 13h34l6 16v3H9Z" stroke="#af6e55" strokeWidth="1.8" />
          <path d="m21 14-3 15h9l1-15m8 0 1 15h9l-3-15" fill="#fff4d4" />
          <path
            d="M9 29h46v2a5 5 0 0 1-10 0 4.5 4.5 0 0 1-9 0 4.5 4.5 0 0 1-9 0 4.5 4.5 0 0 1-9 0 4.5 4.5 0 0 1-9 0Z"
            fill="#f29172"
            stroke="#af6e55"
            strokeWidth="1.8"
          />
          <path d="M18 29h9v2a4.5 4.5 0 0 1-9 0Zm18 0h9v2a4.5 4.5 0 0 1-9 0Z" fill="#fff4d4" />
          <path d="M16 17h30" stroke="#ffe0ad" strokeWidth="2" />
          <path d="M10 57h44" stroke="#bd9870" strokeWidth="2.5" />
        </g>
      );
    case "usaha":
      return (
        <g transform="rotate(-5 32 32)">
          <path d="M23 21v-5a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v5" stroke="#fff6df" strokeWidth="7" />
          <path d="M23 21v-5a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v5" stroke="#a77950" strokeWidth="3.5" />
          <rect
            x="8"
            y="20"
            width="47"
            height="34"
            rx="7"
            fill="#e5a76b"
            stroke="#fff6df"
            strokeWidth="5"
          />
          <rect x="8" y="20" width="47" height="34" rx="7" stroke="#a77950" strokeWidth="1.8" />
          <path d="M11 41h41v6a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5Z" fill="#c78b58" />
          <path
            d="M9 25a5 5 0 0 1 5-5h35a5 5 0 0 1 5 5v8c-12 7-33 7-45 0Z"
            fill="#f5c68d"
            stroke="#a77950"
            strokeWidth="1.8"
          />
          <path d="M15 25h33" stroke="#fff1cb" strokeWidth="3" />
          <rect
            x="27"
            y="32"
            width="10"
            height="9"
            rx="2"
            fill="#fff0b2"
            stroke="#a77950"
            strokeWidth="1.8"
          />
          <circle cx="48" cy="48" r="11" fill="#ffd36e" stroke="#fff8df" strokeWidth="3" />
          <circle cx="48" cy="48" r="8" stroke="#b78743" strokeWidth="1.8" />
          <path
            d="m48 42 1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6Z"
            fill="#fff0b3"
          />
        </g>
      );
    case "ojek":
      return (
        <g>
          <circle cx="17" cy="47" r="9" fill="#526770" stroke="#fff8df" strokeWidth="3" />
          <circle cx="48" cy="47" r="9" fill="#526770" stroke="#fff8df" strokeWidth="3" />
          <circle cx="17" cy="47" r="4" fill="#c6e4db" stroke="#3b5d67" strokeWidth="1.5" />
          <circle cx="48" cy="47" r="4" fill="#c6e4db" stroke="#3b5d67" strokeWidth="1.5" />
          <path
            d="M8 40c0-7 5-11 13-11h9v11h6l5-15-2-7h8l6 25H38l-3 5H22c-1-7-6-11-14-8Z"
            fill="#76c6a3"
            stroke="#fff8df"
            strokeWidth="4"
          />
          <path
            d="M8 40c0-7 5-11 13-11h9v11h6l5-15-2-7h8l6 25H38l-3 5H22c-1-7-6-11-14-8Z"
            stroke="#488b75"
            strokeWidth="1.8"
          />
          <path d="M17 35h8m14 8h8" stroke="#c7f0cf" strokeWidth="3" />
          <path d="M20 27h12" stroke="#735e51" strokeWidth="6" />
          <path d="M21 26h10" stroke="#b79878" strokeWidth="2" />
          <path d="M42 18h9m-7 0-2-6" stroke="#466d6c" strokeWidth="2.5" />
          <ellipse
            cx="40"
            cy="10"
            rx="4"
            ry="3"
            fill="#9cd8e2"
            stroke="#466d6c"
            strokeWidth="1.5"
          />
          <path d="M47 22h5v7h-4Z" fill="#ffe8a0" stroke="#b58a55" strokeWidth="1.5" />
          <path d="M10 31h4v6h-4" fill="#f39579" />
          <path d="M7 18h13m-10 6h8" stroke="#fff7da" strokeWidth="3" />
        </g>
      );
    case "garasi":
      return (
        <g>
          <path d="M10 23h44v31H10Z" fill="#ffe4b9" stroke="#fff8df" strokeWidth="4" />
          <path d="M10 23h44v31H10Z" stroke="#b68b64" strokeWidth="1.8" />
          <path
            d="m7 23 25-16 25 16-3 5-22-13-22 13Z"
            fill="#ef9078"
            stroke="#fff8df"
            strokeWidth="4"
          />
          <path d="m7 23 25-16 25 16-3 5-22-13-22 13Z" stroke="#ad6b58" strokeWidth="1.8" />
          <path d="m16 20 16-10 15 10" stroke="#ffc0a1" strokeWidth="2" />
          <rect
            x="17"
            y="27"
            width="30"
            height="24"
            rx="2"
            fill="#a59582"
            stroke="#8b7967"
            strokeWidth="1.8"
          />
          <path d="M19 30h26m-26 5h26" stroke="#d4c9ac" strokeWidth="2" />
          <path d="m17 45 4-10h22l4 10v10H17Z" fill="#74c9e0" stroke="#fff8df" strokeWidth="3" />
          <path d="m17 45 4-10h22l4 10v10H17Z" stroke="#4c88a3" strokeWidth="1.8" />
          <path d="m24 38-2 6h20l-2-6Z" fill="#d1f0ec" />
          <path d="M21 49h4m14 0h4" stroke="#fff0b5" strokeWidth="3" />
          <rect x="18" y="54" width="7" height="5" rx="2" fill="#526770" />
          <rect x="39" y="54" width="7" height="5" rx="2" fill="#526770" />
          <path d="M29 52h6" stroke="#4c88a3" strokeWidth="2" />
        </g>
      );
    case "tokocung":
      return (
        <g transform="rotate(-5 32 32)">
          <path d="M14 31V15h13v16" fill="#f3ca7c" stroke="#fff8df" strokeWidth="3" />
          <path d="M14 31V15h13v16" stroke="#af8951" strokeWidth="1.8" />
          <path d="M17 20h7m-7 5h5" stroke="#fff1c4" strokeWidth="2.5" />
          <path d="M36 29V16l3-4h7l3 4v15" fill="#9bd8e5" stroke="#fff8df" strokeWidth="3" />
          <path d="M36 29V16l3-4h7l3 4v15" stroke="#5a96a5" strokeWidth="1.8" />
          <path d="M39 9h7v5h-7Z" fill="#f2b780" stroke="#aa7955" strokeWidth="1.5" />
          <path d="M39 21h7v7h-7Z" fill="#fff1d0" />
          <path
            d="M25 32c-4-8-1-16 4-19 6 5 8 12 6 19Z"
            fill="#9bcd7d"
            stroke="#689451"
            strokeWidth="1.8"
          />
          <path d="m29 21 1 10" stroke="#d9edaa" strokeWidth="2" />
          <path d="M9 29h46l-6 25H15Z" fill="#ee8f86" stroke="#fff8df" strokeWidth="4" />
          <path d="M9 29h46l-6 25H15Z" stroke="#af6764" strokeWidth="1.8" />
          <path d="m19 34 2 14m10-14v14m12-14-2 14" stroke="#ffe9c9" strokeWidth="4" />
          <path d="M10 30h44" stroke="#ffc3a7" strokeWidth="4" />
          <path d="m17 29 9-16m21 16-9-16" stroke="#8c7160" strokeWidth="3" />
          <path d="M17 54h30" stroke="#c8786c" strokeWidth="2" />
        </g>
      );
    case "cungchat":
      return (
        <g transform="rotate(-5 32 32)">
          <path
            d="M29 27h22a7 7 0 0 1 7 7v12a7 7 0 0 1-7 7h-2l-9 6v-6H29a7 7 0 0 1-7-7V34a7 7 0 0 1 7-7Z"
            fill="#ffdf9a"
            stroke="#fff8df"
            strokeWidth="4"
          />
          <path
            d="M29 27h22a7 7 0 0 1 7 7v12a7 7 0 0 1-7 7h-2l-9 6v-6H29a7 7 0 0 1-7-7V34a7 7 0 0 1 7-7Z"
            stroke="#b99258"
            strokeWidth="1.8"
          />
          <path
            d="M14 9h25a9 9 0 0 1 9 9v15a9 9 0 0 1-9 9H24l-11 8v-9a8 8 0 0 1-7-8V18a9 9 0 0 1 8-9Z"
            fill="#8ad2b1"
            stroke="#fff8df"
            strokeWidth="4"
          />
          <path
            d="M14 9h25a9 9 0 0 1 9 9v15a9 9 0 0 1-9 9H24l-11 8v-9a8 8 0 0 1-7-8V18a9 9 0 0 1 8-9Z"
            stroke="#548d78"
            strokeWidth="1.8"
          />
          <path d="M14 16h21" stroke="#d6f3ce" strokeWidth="3" />
          <g fill="#fff7dd">
            <circle cx="17" cy="27" r="3" />
            <circle cx="27" cy="27" r="3" />
            <circle cx="37" cy="27" r="3" />
          </g>
          <path d="M36 47h13" stroke="#fff3ca" strokeWidth="2.5" />
        </g>
      );
    case "notes":
      return (
        <g transform="rotate(-6 32 32)">
          <rect
            x="12"
            y="8"
            width="35"
            height="48"
            rx="5"
            fill="#ee9a84"
            stroke="#fff8df"
            strokeWidth="4"
          />
          <rect x="12" y="8" width="35" height="48" rx="5" stroke="#b77561" strokeWidth="1.8" />
          <path d="M19 9h24v43H19Z" fill="#fff0ce" />
          <path d="M17 9v45" stroke="#f7bb97" strokeWidth="2" />
          <path d="M9 18h7m-7 12h7m-7 12h7" stroke="#a7845e" strokeWidth="3.5" />
          <path d="M9 17h6m-6 12h6m-6 12h6" stroke="#fff3d6" strokeWidth="1.5" />
          <path d="M24 20h14m-14 8h14m-14 8h10" stroke="#ccb28a" strokeWidth="2" />
          <g transform="rotate(20 48 35)">
            <path d="M44 17h8v32l-4 8-4-8Z" fill="#7ac7da" stroke="#fff8df" strokeWidth="3" />
            <path d="M44 17h8v32l-4 8-4-8Z" stroke="#588c9d" strokeWidth="1.8" />
            <path
              d="M44 17v-4a4 4 0 0 1 8 0v4Z"
              fill="#ef9c9c"
              stroke="#a66b74"
              strokeWidth="1.8"
            />
            <path d="M44 21h8" stroke="#fff1cf" strokeWidth="3" />
            <path d="M47 25v20" stroke="#c7efec" strokeWidth="2" />
            <path d="m44 49 4 8 4-8Z" fill="#f5d6a6" />
            <path d="m46.5 54 1.5 3 1.5-3Z" fill="#6c6767" />
          </g>
        </g>
      );
    case "cngbank":
      return (
        <g>
          <path d="M10 25h42v28H10Z" fill="#abd2e6" stroke="#fff8df" strokeWidth="4" />
          <path d="M10 25h42v28H10Z" stroke="#678b9f" strokeWidth="1.8" />
          <path d="M6 24 31 8l25 16v5H6Z" fill="#fff0ca" stroke="#fff8df" strokeWidth="4" />
          <path d="M6 24 31 8l25 16v5H6Z" stroke="#a68863" strokeWidth="1.8" />
          <path d="M14 24 31 13l17 11" stroke="#e3c496" strokeWidth="2" />
          <circle cx="31" cy="22" r="4" fill="#f2c66d" stroke="#b28c48" strokeWidth="1.5" />
          <path
            d="M15 31h7v18h-7Zm13 0h7v18h-7Zm13 0h7v18h-7Z"
            fill="#fff3d6"
            stroke="#9aab9f"
            strokeWidth="1.5"
          />
          <rect
            x="7"
            y="49"
            width="49"
            height="7"
            rx="2"
            fill="#d1e5e5"
            stroke="#678b9f"
            strokeWidth="1.8"
          />
          <path d="M12 52h35" stroke="#f1f6dc" strokeWidth="2" />
          <circle cx="48" cy="47" r="11" fill="#ffd36e" stroke="#fff8df" strokeWidth="3" />
          <circle cx="48" cy="47" r="8" stroke="#b78743" strokeWidth="1.8" />
          <path
            d="M48 42v10m3-9h-4a2.5 2.5 0 0 0 0 5h2a2.5 2.5 0 0 1 0 5h-4"
            stroke="#fff0b3"
            strokeWidth="2"
            transform="translate(0 -1.5)"
          />
        </g>
      );
    default:
      return null;
  }
}
