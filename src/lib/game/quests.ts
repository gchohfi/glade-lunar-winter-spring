import { weakestTable } from "./mastery.ts";
import { applyXp } from "./progress.ts";
import { DAILY_GOAL, todayKey, type PlayerState } from "./types.ts";

/**
 * Missões do dia: 3 desafios sorteados pela DATA (determinístico — recarregar
 * a página nunca troca as missões) e avaliados só com dados persistidos, para
 * que fechar o app não perca progresso nem re-conceda XP.
 */

export const QUEST_XP = 20;

export type QuestId = "meta" | "perfeita" | "combo8" | "recorde" | "tabela" | "rapida";

export type Quest = {
  id: QuestId;
  title: string;
  progress: number;
  target: number;
  done: boolean;
};

const POOL: QuestId[] = ["perfeita", "combo8", "recorde", "tabela", "rapida"];

function hashDay(dayKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dayKey.length; i += 1) {
    h ^= dayKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function questIdsForDay(dayKey: string): QuestId[] {
  const h = hashDay(dayKey);
  const second = POOL[h % POOL.length];
  const offset = 1 + ((h >>> 3) % (POOL.length - 1));
  const third = POOL[(POOL.indexOf(second) + offset) % POOL.length];
  return ["meta", second, third];
}

export function questsForDay(state: PlayerState, dayKey = todayKey()): Quest[] {
  const day = state.days[dayKey];
  const doneIds = day?.questsDone ?? [];
  const missionsToday = state.missions.filter(
    (m) => todayKey(new Date(m.finishedAt)) === dayKey,
  );
  const table = weakestTable(state) ?? 7;

  return questIdsForDay(dayKey).map((id) => {
    let title: string;
    let target: number;
    let progress: number;
    switch (id) {
      case "meta":
        title = `Fazer os ${DAILY_GOAL} acertos de hoje`;
        target = DAILY_GOAL;
        progress = day?.correct ?? 0;
        break;
      case "perfeita":
        title = "Vencer uma missão sem errar";
        target = 1;
        progress = missionsToday.filter((m) => m.passed && m.wrong === 0).length;
        break;
      case "combo8":
        title = "Emendar 8 acertos seguidos";
        target = 8;
        progress = missionsToday.reduce((best, m) => Math.max(best, m.bestCombo ?? 0), 0);
        break;
      case "recorde":
        title = "Bater um recorde de planeta";
        target = 1;
        progress = day?.records ?? 0;
        break;
      case "tabela":
        title = `Acertar 6 da tabuada do ${table}`;
        target = 6;
        progress = day?.tables?.[table] ?? 0;
        break;
      case "rapida":
        title = "Vencer com folga no relógio";
        target = 1;
        progress = missionsToday.filter(
          (m) => m.passed && m.elapsedMs <= m.timeLimitMs * 0.7,
        ).length;
        break;
    }
    const done = doneIds.includes(id) || progress >= target;
    return { id, title, target, progress: Math.min(target, done ? target : progress), done };
  });
}

export function settleQuests(
  state: PlayerState,
  dayKey = todayKey(),
): { state: PlayerState; completed: Quest[]; xpGained: number } {
  const day = state.days[dayKey];
  const ledger = day?.questsDone ?? [];
  const completed = questsForDay(state, dayKey).filter(
    (q) => q.done && !ledger.includes(q.id),
  );
  if (completed.length === 0) return { state, completed, xpGained: 0 };

  const xpGained = completed.length * QUEST_XP;
  const leveled = applyXp(state.level, state.xp, xpGained);
  const base = day ?? { answered: 0, correct: 0, missions: 0 };
  return {
    state: {
      ...state,
      level: leveled.level,
      xp: leveled.xp,
      days: {
        ...state.days,
        [dayKey]: {
          ...base,
          questsDone: [...ledger, ...completed.map((q) => q.id)],
        },
      },
    },
    completed,
    xpGained,
  };
}
