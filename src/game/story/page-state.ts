import type { StorySection, StorySnapshot } from "./types";

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
