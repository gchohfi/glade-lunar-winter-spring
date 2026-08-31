import { DAILY_GOAL, TIMEZONE, todayKey, type DayStat, type PlayerState } from "./types";

const WEEK_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"] as const;

export type WeekDay = {
  key: string;
  label: string;
  isToday: boolean;
};

export function weekStrip(now = new Date()): WeekDay[] {
  const today = todayKey(now);
  const [year, month, day] = today.split("-").map(Number);
  const noonUtc = Date.UTC(year, month - 1, day, 15);
  const dow = new Date(noonUtc).getUTCDay();
  const mondayShift = dow === 0 ? -6 : 1 - dow;
  return WEEK_LABELS.map((label, i) => {
    const ms = noonUtc + (mondayShift + i) * 86_400_000;
    const key = new Date(ms).toISOString().slice(0, 10);
    return { key, label, isToday: key === today };
  });
}

export function dayMet(day: DayStat | undefined): boolean {
  return (day?.correct ?? 0) >= DAILY_GOAL;
}

export function todayDone(state: PlayerState, now = new Date()): boolean {
  return dayMet(state.days[todayKey(now)]);
}

export function weekdayName(now = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    weekday: "long",
  }).format(now);
}
