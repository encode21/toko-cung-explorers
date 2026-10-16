type MusicIconName =
  | "music"
  | "play"
  | "pause"
  | "next"
  | "headphones"
  | "queue"
  | "check"
  | "up"
  | "down"
  | "close"
  | "volume"
  | "muted";

/** Filled artwork shared by the Underground shortcuts and music panel. */
export function ClubMusicIcon({ name }: { name: MusicIconName }) {
  const paths: Partial<Record<MusicIconName, string>> = {
    music: "M9 4v12.3A4.5 3.4 0 1 0 11 19V8l10-2V1Z",
    play: "M7 4.5a1 1 0 0 1 1.5-.86l12 7.5a1 1 0 0 1 0 1.72l-12 7.5A1 1 0 0 1 7 19.5Z",
    pause: "M6 4h4v16H6zm8 0h4v16h-4Z",
    next: "M4 5a1 1 0 0 1 1.5-.86L17 11V5h3v14h-3v-6L5.5 19.86A1 1 0 0 1 4 19Z",
    headphones:
      "M12 2A10 10 0 0 0 2 12v6a3 3 0 0 0 3 3h3V11H5a7 7 0 0 1 14 0h-3v10h3a3 3 0 0 0 3-3v-6A10 10 0 0 0 12 2Z",
    queue: "M3 4h3v3H3zm5 0h13v3H8zM3 10h3v3H3zm5 0h13v3H8zM3 16h3v3H3zm5 0h9v3H8Z",
    check: "m9 15.5-4.5-4.5L2 13.5l7 7L23 6.5 20.5 4Z",
    up: "m12 4-8 9h5v7h6v-7h5Z",
    down: "m12 20 8-9h-5V4H9v7H4Z",
    close: "m6 3 6 6 6-6 3 3-6 6 6 6-3 3-6-6-6 6-3-3 6-6-6-6Z",
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {name === "volume" || name === "muted" ? (
        <>
          <path d="M4 8h4l5-4v16l-5-4H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" fill="currentColor" />
          <path
            d={name === "muted" ? "m17 9 5 6m0-6-5 6" : "M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <path d={paths[name]} fill="currentColor" />
      )}
    </svg>
  );
}
