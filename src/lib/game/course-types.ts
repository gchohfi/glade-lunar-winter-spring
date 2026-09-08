import type { Fact, PlayerState } from "./types";

export type ShotDirection = "left" | "center" | "right";
export type CourseState = {
  version: 1;
  completedMatches: string[];
  selectedMatchId: string;
  durationSec: 120 | 180 | 300;
  rewardDays: Record<string, number>;
  lastResult: CourseResult | null;
};
export type CourseResult = {
  attemptId: string;
  matchId: string;
  passed: boolean;
  correct: number;
  wrong: number;
  goals: number;
  mathElapsedMs: number;
  coinsGained: number;
  finishedAt: number;
  /** Absent on older results; never synthesize unrecorded detail. */
  learning?: {
    firstResponses: number;
    independentCorrect: number;
    assistedCorrect: number;
    repeatedResponses: number;
  };
};
export type CourseAttempt = {
  id: string;
  matchId: string;
  ownerDeviceId: string;
  phase: "answer" | "feedback" | "shot" | "paused";
  resumePhase: "answer" | "feedback" | "shot";
  startedAt: number;
  updatedAt: number;
  timeLimitMs: number;
  mathElapsedMs: number;
  correct: number;
  wrong: number;
  goals: number;
  fact: Fact;
  queue: Fact[];
  responses: Array<{ fact: Fact; ok: boolean; ms: number; assisted: boolean }>;
  feedback: "correct" | "incorrect" | "help" | null;
  assistedCurrent: boolean;
  lastShot: ShotDirection | null;
};
export type CourseCommand =
  | { type: "start"; matchId: string }
  | { type: "resume"; attemptId: string; takeover?: boolean }
  | { type: "answer"; attemptId: string; guess: number; elapsedMs: number }
  | { type: "help"; attemptId: string; elapsedMs: number }
  | { type: "continue"; attemptId: string }
  | { type: "shoot"; attemptId: string; direction: ShotDirection }
  | { type: "pause"; attemptId: string; elapsedMs: number }
  | { type: "checkpoint"; attemptId: string; elapsedMs: number }
  | { type: "expire"; attemptId: string; elapsedMs: number }
  | { type: "buy"; itemId: string }
  | { type: "equip"; itemId: string }
  | { type: "goal"; itemId: string | null }
  | { type: "select"; matchId: string }
  | {
      type: "settings";
      durationSec?: 120 | 180 | 300;
      childName?: string;
      sound?: boolean;
      prizeName?: string;
    }
  | { type: "claim-prize" };
export type CourseRequest = {
  protocolVersion: 3;
  expectedRevision: number;
  operationId: string;
  deviceId: string;
  command: CourseCommand;
};
export type CourseEnvelope = {
  protocolVersion: 3;
  revision: number;
  state: PlayerState;
  activeAttempt: CourseAttempt | null;
  storage: "persistent" | "temporary";
};
export type CourseResponse = CourseEnvelope & {
  status: "applied" | "duplicate" | "conflict" | "rejected";
  message?: string;
};
