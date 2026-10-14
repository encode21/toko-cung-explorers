/** Cosmetic poses only: never trigger combat, bench movement, or mission actions. */
export const CHAT_EMOTES = [
  { id: "sit", label: "Duduk", animation: "SitGround", seconds: Infinity },
  { id: "lie", label: "Tiduran", animation: "LieDown", seconds: Infinity },
  { id: "angry", label: "Marah", animation: "Angry", seconds: 2.4 },
  { id: "laugh", label: "Ketawa", animation: "Laugh", seconds: 3 },
] as const;

export type ChatEmoteId = (typeof CHAT_EMOTES)[number]["id"];
export type ChatEmoteAnimation = (typeof CHAT_EMOTES)[number]["animation"];

export function isChatEmoteAnimation(
  value: string | null | undefined,
): value is ChatEmoteAnimation {
  return CHAT_EMOTES.some((emote) => emote.animation === value);
}

export const CHAT_EMOTE_ANIMATIONS = CHAT_EMOTES.map((emote) => emote.animation);
