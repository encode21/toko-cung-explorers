import type { StorySection, StorySnapshot } from "./types";

/** The server's counter includes every claimed page, including existing player progress. */
export function canReadStoryPage(section: StorySection, index: number) {
  return index >= 0 && index < section.pageCount && index <= section.page;
}

/** A global daily gate takes precedence over every section-specific prerequisite. */
export function storyPageState(
  data: Extract<StorySnapshot, { enabled: true }>,
  page: StorySection["current"],
) {
  if (data.locked || page?.progress.locked) return "locked";
  if (page?.needsWarung) return "needs_warung";
  if (data.guest) return "guest";
  if (page?.progress.claimInWarung) return "claim_in_warung";
  return page?.progress.done ? "ready" : "unfinished";
}
