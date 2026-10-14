/** Fixed artwork bounds keep the talk marker centered without font baseline offsets. */
export function NpcQuestionIcon() {
  return (
    <svg
      className="npc-question-icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M7.4 7.5c0-2.6 2-4.1 4.6-4.1s4.6 1.5 4.6 4.1c0 2.4-1.4 3.3-3 4.2-1.1.6-1.6 1.4-1.6 2.8v.3"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="20.5" r="1.8" fill="currentColor" />
    </svg>
  );
}
