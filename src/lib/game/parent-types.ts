import type { Fact, PlayerState } from "./types";

export type LearningEvent = {
  id: string;
  kind: "answer" | "help";
  attemptId: string;
  matchId: string;
  factKey: string;
  fact: Fact;
  day: string;
  at: number;
  activeMs: number;
  attemptActiveMs: number;
  ok: boolean | null;
  guess: number | null;
  firstInAttempt: boolean;
  assisted: boolean;
  firstInDay: boolean;
  helpBeforeFirst: boolean;
};
export type LearningWindow = {
  from: string;
  to: string;
  responses: number;
  correct: number;
  help: number;
  firstResponses: number;
  independentCorrect: number;
  independentPercent: number | null;
  averageIndependentMs: number | null;
  timedSamples: number;
};
export type FactReport = {
  key: string;
  fact: Fact;
  responses: number;
  errors: number;
  help: number;
  days: Array<{ day: string; ok: boolean; assisted: boolean; activeMs: number }>;
  events: LearningEvent[];
};
export type ParentReport = {
  generatedAt: number;
  detailedSince: number | null;
  current: LearningWindow;
  previous: LearningWindow;
  detailPeriod: { from: string; to: string };
  facts: FactReport[];
  coinEvents: Array<{
    id: string;
    kind: "reward" | "purchase";
    amount: number;
    balanceAfter: number;
    day: string;
    at: number;
    itemId: string | null;
    attemptId: string | null;
  }>;
  legacyRewards: Array<{ day: string; amount: number }>;
  legacyFacts: PlayerState["facts"];
  openingBalance: number | null;
  archivedLegacyAttemptAt: number | null;
  player: PlayerState;
};
export type ParentStatus = { configured: boolean; recentAuth: boolean; lockedUntil: number };
export type ParentUnlock = {
  ok: boolean;
  message?: string;
  grant?: string;
  expiresAt?: number;
  lockedUntil?: number;
};
