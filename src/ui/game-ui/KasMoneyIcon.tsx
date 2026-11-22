/** Kas usaha banknote artwork for the HUD (fictional business money, not Point). */
export function KasMoneyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
      <rect
        x="5"
        y="15"
        width="38"
        height="22"
        rx="4"
        fill="#2f8f5b"
        transform="rotate(-12 24 26)"
      />
      <rect
        x="4"
        y="12"
        width="38"
        height="22"
        rx="4"
        fill="#5cc98a"
        stroke="#2c7a4e"
        strokeWidth="2"
      />
      <rect x="8.5" y="16.5" width="29" height="13" rx="2.5" stroke="#d9f7e4" strokeWidth="1.6" />
      <circle cx="23" cy="23" r="5.2" fill="#e9fff1" stroke="#2c7a4e" strokeWidth="1.6" />
      <path
        d="M23 19.8v6.4m1.8-5.2c-.4-.6-1-.9-1.8-.9-1 0-1.8.6-1.8 1.4 0 1.9 3.6 1 3.6 2.9 0 .8-.8 1.4-1.8 1.4-.8 0-1.5-.3-1.9-.9"
        stroke="#2c7a4e"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path d="M8 13.5h7" stroke="#c6f5d8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
