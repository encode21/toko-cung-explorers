/** Shared Point coin artwork used by the HUD and dressing-room wallet. */
export function PointCoinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
      <circle cx="26" cy="26" r="19" fill="#d58b24" stroke="#a96c27" strokeWidth="2" />
      <circle cx="22" cy="22" r="19" fill="#ffd75b" stroke="#b67b2c" strokeWidth="2" />
      <circle cx="22" cy="22" r="14.5" fill="#ffbd34" stroke="#ffe99b" strokeWidth="2" />
      <path
        d="M18 31V13h7a6 6 0 0 1 0 12h-7"
        stroke="#a96c27"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 17a15 15 0 0 1 9-9" stroke="#fff4c6" strokeWidth="3" strokeLinecap="round" />
      <path d="m36 31 3 2m-7 3 2 3" stroke="#f7c74d" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
