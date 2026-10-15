type AppearanceSection = "look" | "closet" | "emotes";

/** Solid silhouettes for the dressing-room side tabs. */
export function AppearanceSectionIcon({ section }: { section: AppearanceSection }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true" focusable="false">
      {section === "look" ? (
        <>
          <circle cx="12" cy="4.5" r="3" />
          <path d="M9 8h6c1 0 1.7.6 2.1 1.5l2.7 6a1.3 1.3 0 0 1-2.4 1l-1.9-4V21a1.5 1.5 0 0 1-3 0v-5h-1v5a1.5 1.5 0 0 1-3 0v-8.5l-1.9 4a1.3 1.3 0 0 1-2.4-1l2.7-6C7.3 8.6 8 8 9 8Z" />
        </>
      ) : section === "closet" ? (
        <path d="M8 3c.4 2 1.8 3 4 3s3.6-1 4-3l3 1 4 5-4 3-1-2v11H6V10l-1 2-4-3 4-5 3-1Z" />
      ) : (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8.5 7.5a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm7 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8ZM7 13a5 5 0 0 0 10 0H7Z"
        />
      )}
    </svg>
  );
}
