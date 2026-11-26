/** Local game illustrations: no remote images or text baked into the artwork. */
export function BeginnerGuideArtwork({ className }: { kind: "guide"; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 150"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="100" cy="79" rx="66" ry="66" fill="#ffe2a7" />
        <path
          d="M47 143c1-32 19-49 53-49s52 17 53 49"
          fill="#58bdce"
          stroke="#408593"
          strokeWidth="3"
        />
        <path d="m84 100 16 16 16-16" fill="#fff8df" stroke="#408593" strokeWidth="3" />
        <path
          d="M68 61c-14-5-20 6-14 17 3 5 9 5 14 3m64-20c14-5 20 6 14 17-3 5-9 5-14 3"
          fill="#f4c997"
          stroke="#a8784e"
          strokeWidth="2.5"
        />
        <path
          d="M64 47c0-23 72-23 72 0v29c0 24-18 37-36 37S64 100 64 76Z"
          fill="#ffddb0"
          stroke="#a8784e"
          strokeWidth="3"
        />
        <path d="M65 47c-4 11-2 21 5 27l4-24m61-3c4 11 2 21-5 27l-4-24" fill="#fff8df" />
        <path
          d="M66 40 71 19c10-14 48-14 58 0l5 21"
          fill="#efbd66"
          stroke="#a8784e"
          strokeWidth="3"
        />
        <path d="M69 32c20-8 42-8 62 0l3 10H66Z" fill="#728962" />
        <path
          d="M46 45c0-10 24-15 54-15s54 5 54 15-24 13-54 13-54-3-54-13Z"
          fill="#f7d48b"
          stroke="#a8784e"
          strokeWidth="3"
        />
        <path d="M58 43c12-4 27-6 42-6" stroke="#fff0b5" strokeWidth="4" />
        <path d="M76 66h12m24 0h12" stroke="#fff8df" strokeWidth="5" />
        <circle
          cx="82"
          cy="77"
          r="10"
          fill="#fff8df"
          fillOpacity=".45"
          stroke="#805b45"
          strokeWidth="2.5"
        />
        <circle
          cx="118"
          cy="77"
          r="10"
          fill="#fff8df"
          fillOpacity=".45"
          stroke="#805b45"
          strokeWidth="2.5"
        />
        <path d="M92 76c5-3 11-3 16 0" stroke="#805b45" strokeWidth="2.5" />
        <circle cx="82" cy="77" r="2.8" fill="#6d4b3b" />
        <circle cx="118" cy="77" r="2.8" fill="#6d4b3b" />
        <path d="M89 94c7 6 15 6 22 0" stroke="#9e624b" strokeWidth="2.5" />
        <ellipse cx="71" cy="90" rx="7" ry="4" fill="#f3a47a" />
        <ellipse cx="129" cy="90" rx="7" ry="4" fill="#f3a47a" />
        <path
          d="M48 110c18-6 37-2 52 6 15-8 34-12 52-6v32c-18-5-36-2-52 5-16-7-34-10-52-5Z"
          fill="#d99553"
          stroke="#98643e"
          strokeWidth="3"
        />
        <path
          d="M55 106c16-3 31 1 45 9 14-8 29-12 45-9v29c-16-2-31 1-45 8-14-7-29-10-45-8Z"
          fill="#fff8df"
          stroke="#ba9167"
          strokeWidth="2"
        />
        <path
          d="M100 116v26m-36-25 23 5m-23 4 23 5m26-9 23-5m-23 14 23-5"
          stroke="#d6b795"
          strokeWidth="2.5"
        />
        <path
          d="M52 117c-13-5-16 8-7 13l9 2m94-15c13-5 16 8 7 13l-9 2"
          fill="#ffddb0"
          stroke="#a8784e"
          strokeWidth="2.5"
        />
      </g>
    </svg>
  );
}
