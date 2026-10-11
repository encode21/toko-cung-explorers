export type SecretInteractionType =
  | "TRIVIA"
  | "OBSERVATION"
  | "RIDDLE"
  | "SEQUENCE"
  | "FIND"
  | "NPC_KNOWLEDGE"
  | "SYMBOL"
  | "TIMED";

export interface SecretClue {
  archiveId: string;
  archiveIndex: number;
  title: string;
  discoveryText?: string;
  funFact?: string | null;
  interactionType: SecretInteractionType;
  question: string;
  answers: string[];
  /** Never sent by the server for public snapshots. */
  correctAnswer?: string;
  hints?: string[];
  nextClueHint?: string;
  xpReward?: number;
  firstTryBonus?: number;
}

export interface SecretFeedback {
  ok: boolean;
  attempts: number;
  hint?: string | null;
  hintLevel?: number;
  firstTry?: boolean;
  xpAwarded?: number;
  firstTryBonus?: number;
  archiveId?: string;
  title?: string | null;
  nextClueHint?: string | null;
  message?: string;
}

export interface SecretMetrics {
  secretsFound: number;
  perfectAnswers: number;
  archiveCompletion: number;
  archiveTotal: number;
  archives?: string[];
  secretQuestCompletionTime: number | null;
}

export interface ArchiveEntry {
  id: string;
  index: number;
  title: string;
  lore: string;
}
