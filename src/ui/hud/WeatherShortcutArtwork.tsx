import type { WeatherCondition } from "@/game/weather/timeline";

type WeatherArtwork = WeatherCondition | "night";

const skies: Record<WeatherArtwork, { sky: string; shade: string; rim: string }> = {
  clear: { sky: "#42c9ef", shade: "#24a2df", rim: "#bef9fd" },
  night: { sky: "#6379d7", shade: "#424fae", rim: "#d5e1ff" },
  rain: { sky: "#526dc9", shade: "#374ea5", rim: "#cadbff" },
  flood: { sky: "#50d3c1", shade: "#229fa1", rim: "#c5fae9" },
};

export function WeatherShortcutArtwork({ condition }: { condition: WeatherArtwork }) {
  const { sky, shade, rim } = skies[condition];

  return (
    <svg
      className="mmo-weather-icon"
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="28" cy="28" r="25" fill={sky} />
      <path d="M4 33a30 30 0 0 0 48 0 25 25 0 0 1-48 0Z" fill={shade} />
      <circle cx="28" cy="28" r="25" stroke={rim} strokeWidth="2.5" />
      <path
        d="M10 19a20 20 0 0 1 12-10"
        stroke="#fff"
        strokeOpacity=".45"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {condition === "clear" && (
        <g strokeLinecap="round">
          <path
            d="M28 9v5m0 28v5M9 28h5m28 0h5M14.6 14.6l3.5 3.5m19.8 19.8 3.5 3.5m0-26.8-3.5 3.5M18.1 37.9l-3.5 3.5"
            stroke="#fff3a3"
            strokeWidth="2.8"
          />
          <circle cx="28" cy="28" r="10.5" fill="#ffdc58" stroke="#ffec96" strokeWidth="2" />
          <path d="M22.5 25a6.3 6.3 0 0 1 6-3.5" stroke="#fff7c4" strokeWidth="2" />
        </g>
      )}
      {condition === "night" && (
        <>
          <path
            d="M30 12a15 15 0 1 0 14 20 14 14 0 0 1-14-20Z"
            fill="#ffdb6d"
            stroke="#fff1b3"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="m39 14 1.5 3.5L44 19l-3.5 1.5L39 24l-1.5-3.5L34 19l3.5-1.5Z" fill="#fff5c2" />
          <circle cx="16" cy="16" r="1.8" fill="#defaff" />
          <circle cx="44" cy="26" r="1.4" fill="#defaff" />
        </>
      )}
      {condition === "rain" && (
        <>
          <path
            d="M17 32a7 7 0 0 1-1-14 10 10 0 0 1 19-2 8 8 0 0 1 5 16Z"
            fill="#eeeaff"
            stroke="#cfdeff"
            strokeWidth="2"
          />
          <path d="M15 27c7 2 19 2 27 0a6 6 0 0 1-5 5H18a6 6 0 0 1-3-5Z" fill="#bbc8f5" />
          <path
            d="m20 37-3 5m12-6-4 7m13-6-3 5"
            stroke="#8ef4ff"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </>
      )}
      {condition === "flood" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 25h18v13H19Z" fill="#ffe6a6" stroke="#96613f" strokeWidth="2" />
          <path d="m15 26 13-12 13 12Z" fill="#ff9761" stroke="#924f43" strokeWidth="2" />
          <path d="M27 29h5v9h-5Z" fill="#397f9a" />
          <path d="M9 36c6-6 10 6 17 0s10 6 20 0l-2 7c-3 4-9 7-16 7S14 46 9 36Z" fill="#287fae" />
          <path
            d="M9 36c6-6 10 6 17 0s10 6 20 0M16 43c5-3 7 4 12 0s7 2 12-1"
            stroke="#b2fff0"
            strokeWidth="2.7"
          />
        </g>
      )}
    </svg>
  );
}
