export type MiniGame = "QUIZ" | "SACK" | "CHICKEN";
export type MiniPlayer = {
  connectionId: string;
  score: number;
  eliminated: boolean;
  left: boolean;
  actedAt: number;
};
export type MiniRound = {
  id: string;
  eventId: string;
  game: MiniGame;
  phase: "lobby" | "countdown" | "running" | "finished" | "cancelled";
  deadline: number;
  players: MiniPlayer[];
  winners: string[];
  question: number;
  prompt: string | null;
  reveal?: boolean;
  chickens: { id: number; x: number; z: number; available: boolean }[];
};
export type MiniSnapshot = {
  serverNow: number;
  schedule: { id: string; game: MiniGame; startsAt: number; endsAt: number } | null;
  round: MiniRound | null;
  badges: string[];
};
export const MINI_NAMES: Record<MiniGame, string> = {
  QUIZ: "Benar atau Salah",
  SACK: "Balap Karung",
  CHICKEN: "Tangkap Ayam",
};
export const BADGE_NAMES: Record<string, string> = {
  "alun-quiz-winner": "Cermat Alun-alun",
  "alun-sack-winner": "Lompat Juara",
  "alun-chicken-winner": "Sahabat Ayam",
};

export const inMiniArena = (p: readonly number[]) =>
  p[0]! >= 82 && p[0]! <= 126 && p[2]! >= 27 && p[2]! <= 43 && p[1]! >= 0 && p[1]! <= 3;
