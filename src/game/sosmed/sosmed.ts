export const MAX_FRAMES = 5;
export const MAX_TEXT = 140;
export const MAX_CLIP_CHARS = 2_000_000;
export interface Post {
  id: number;
  authorId: string;
  author: string;
  text: string;
  at: number;
  hasClip: boolean;
  commentCount: number;
}
export interface Comment {
  id: number;
  postId: number;
  parentId: number | null;
  authorId: string;
  author: string;
  text: string;
  at: number;
}
/** Cursor pages and retry receipts may overlap; one server ID always means one row. */
export function mergeRows<T extends { id: number }>(old: T[], incoming: T[]): T[] {
  return [...new Map([...old, ...incoming].map((row) => [row.id, row])).values()].sort(
    (a, b) => b.id - a.id,
  );
}
export function commentThreads(comments: Comment[]) {
  return comments
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.id - b.id)
    .map((root) => ({
      root,
      replies: comments.filter((c) => c.parentId === root.id).sort((a, b) => a.id - b.id),
    }));
}
