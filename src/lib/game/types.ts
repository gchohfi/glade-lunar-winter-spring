export type ModeId = "multiplication" | "vocabulary" | "definitions";

export type RankId =
  | "cadete"
  | "aprendiz"
  | "piloto"
  | "capitao"
  | "comandante"
  | "almirante"
  | "lenda";

export type FactOp = "mul" | "div";

export type Fact = {
  a: number;
  b: number;
  op?: FactOp;
};

export type FactStat = {
  attempts: number;
  correct: number;
  wrong: number;
  totalMs: number;
  lastSeen: number;
};

export type DayStat = {
  answered: number;
  correct: number;
  missions: number;
};

export type MissionRecord = {
  id: string;
  mode: ModeId;
  rankId: RankId;
  startedAt: number;
  finishedAt: number;
  elapsedMs: number;
  timeLimitMs: number;
  correct: number;
  wrong: number;
  passed: boolean;
};

export type ParentAlertKind = "level" | "rank" | "ship" | "prize";

export type ParentAlert = {
  id: string;
  at: number;
  kind: ParentAlertKind;
  title: string;
  body: string;
  read: boolean;
};

export type PlayerState = {
  version: 2;
  childName: string;
  rankId: RankId;
  consecutiveWins: number;
  consecutiveFails: number;
  totalMissionsPassed: number;
  prizeCycle: number;
  prizesEarned: number;
  prizesClaimed: number;
  facts: Record<string, FactStat>;
  missions: MissionRecord[];
  days: Record<string, DayStat>;
  sound: boolean;
  onboarded: boolean;
  level: number;
  xp: number;
  selectedPlanet: number;
  furthestPlanet: number;
  planetStars: number[];
  planetBestMs: number[];
  bestCombo: number;
  extraTimeSec: number;
  parentAlerts: ParentAlert[];
  notifyParents: boolean;
  prizeName: string;
};

export type RankDef = {
  id: RankId;
  name: string;
  blurb: string;
  tables: number[];
  factors: number[];
  timeLimitMs: number;
  secondsPerFact: number;
};

export const STORAGE_KEY = "missao-tabuada-v1";
export const PRIZE_EVERY = 10;
export const DAILY_GOAL = 15;
export const TARGET_CORRECT = 15;
export const TIMEZONE = "America/Sao_Paulo";

export const EXTRA_TIME_OPTIONS = [0, 15, 30, 45, 60] as const;

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function factOp(fact: Fact): FactOp {
  return fact.op ?? "mul";
}

export function factKey(fact: Fact): string {
  return factOp(fact) === "div" ? `${fact.a}d${fact.b}` : `${fact.a}x${fact.b}`;
}

export function factAnswer(fact: Fact): number {
  return factOp(fact) === "div" ? fact.a / fact.b : fact.a * fact.b;
}

export function formatAnswer(n: number): string {
  if (!Number.isFinite(n)) return "?";
  const rounded = Math.round(n * 2) / 2;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1).replace(".", ",");
}

export function parseGuess(raw: string): number {
  const cleaned = raw.trim().replace(",", ".");
  if (!cleaned || cleaned === "." || cleaned === ",") return Number.NaN;
  return Number(cleaned);
}

export function guessesMatch(guess: number, answer: number): boolean {
  return Number.isFinite(guess) && Math.abs(guess - answer) < 0.051;
}

export function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(now);
}

export function emptyState(): PlayerState {
  return {
    version: 2,
    childName: "",
    rankId: "cadete",
    consecutiveWins: 0,
    consecutiveFails: 0,
    totalMissionsPassed: 0,
    prizeCycle: 0,
    prizesEarned: 0,
    prizesClaimed: 0,
    facts: {},
    missions: [],
    days: {},
    sound: true,
    onboarded: false,
    level: 1,
    xp: 0,
    selectedPlanet: 0,
    furthestPlanet: 0,
    planetStars: Array.from({ length: 12 }, () => 0),
    planetBestMs: Array.from({ length: 12 }, () => 0),
    bestCombo: 0,
    extraTimeSec: 15,
    parentAlerts: [],
    notifyParents: false,
    prizeName: "",
  };
}

export function displayName(state: PlayerState): string {
  const name = state.childName.trim();
  return name.length > 0 ? name : "Jogador";
}
