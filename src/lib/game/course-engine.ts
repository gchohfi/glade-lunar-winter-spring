import { chooseGoal, normalizeClub, purchaseCosmetic, validClubDay } from "./club";
import {
  courseFacts,
  courseMatch,
  courseMatchUnlocked,
  nextCourseMatch,
  normalizeCourse,
} from "./course";
import type { CourseAttempt, CourseCommand, CourseResult } from "./course-types";
import { cosmeticItem, cosmeticUnlocked, equipCosmetic } from "./wardrobe";
import {
  factAnswer,
  factKey,
  PRIZE_EVERY,
  todayKey,
  type FactStat,
  type PlayerState,
} from "./types";

export type CourseContext = { now: number; deviceId: string; operationId: string };
export type CourseCommandOutcome = {
  state: PlayerState;
  activeAttempt: CourseAttempt | null;
  ok: boolean;
  message?: string;
};

const VALID_DIRECTIONS = ["left", "center", "right"];
const MAX_CORRECT = 15;

function firstIndependentAnswer(
  state: PlayerState,
  attempt: CourseAttempt,
  ok: boolean,
  elapsedMs: number,
  now: number,
): PlayerState {
  const key = factKey(attempt.fact);
  if (
    attempt.assistedCurrent ||
    attempt.responses.some((response) => factKey(response.fact) === key)
  )
    return state;
  const previous: FactStat = state.facts[key] ?? {
    attempts: 0,
    correct: 0,
    wrong: 0,
    totalMs: 0,
    lastSeen: 0,
  };
  const day = todayKey(new Date(now));
  const days = Array.isArray(previous.independentDays)
    ? previous.independentDays.filter((value) => validClubDay(value) && value <= day)
    : [];
  return {
    ...state,
    facts: {
      ...state.facts,
      [key]: {
        ...previous,
        attempts: previous.attempts + 1,
        correct: previous.correct + Number(ok),
        wrong: previous.wrong + Number(!ok),
        totalMs: previous.totalMs + elapsedMs,
        lastSeen: now,
        independentDays: ok ? [...new Set([...days, day])].sort().slice(-7) : days,
      },
    },
  };
}

function nextQuestion(state: PlayerState, attempt: CourseAttempt): CourseAttempt {
  const queue = attempt.queue.length
    ? attempt.queue
    : courseFacts(state, attempt.matchId, attempt.updatedAt);
  return {
    ...attempt,
    phase: "answer",
    resumePhase: "answer",
    fact: queue[0],
    queue: queue.slice(1),
    assistedCurrent: false,
    feedback: null,
  };
}

/** Final score, progress and daily credit are a single pure state transition. */
function finish(
  state: PlayerState,
  attempt: CourseAttempt,
  passed: boolean,
  now: number,
): CourseCommandOutcome {
  const course = normalizeCourse(state);
  if (
    course.lastResult?.attemptId === attempt.id ||
    state.missions.some((mission) => mission.id === attempt.id)
  ) {
    return { state, activeAttempt: null, ok: false, message: "Esta partida já foi registrada." };
  }
  const club = normalizeClub(state.club);
  const day = todayKey(new Date(now));
  const alreadyRewarded = Object.hasOwn(course.rewardDays, day);
  const coinsGained =
    passed && !alreadyRewarded && Number.isSafeInteger(club.balance + 30) ? 30 : 0;
  const completedMatches =
    passed && !course.completedMatches.includes(attempt.matchId)
      ? [...course.completedMatches, attempt.matchId]
      : course.completedMatches;
  const lastResult: CourseResult = {
    attemptId: attempt.id,
    matchId: attempt.matchId,
    passed,
    correct: attempt.correct,
    wrong: attempt.wrong,
    goals: attempt.goals,
    mathElapsedMs: attempt.mathElapsedMs,
    coinsGained,
    finishedAt: now,
    learning: {
      firstResponses: attempt.responses.filter(
        (response, index, all) =>
          !all
            .slice(0, index)
            .some((previous) => factKey(previous.fact) === factKey(response.fact)),
      ).length,
      independentCorrect: attempt.responses.filter((response) => response.ok && !response.assisted)
        .length,
      assistedCorrect: attempt.responses.filter((response) => response.ok && response.assisted)
        .length,
      repeatedResponses: attempt.responses.filter((response, index, all) =>
        all.slice(0, index).some((previous) => factKey(previous.fact) === factKey(response.fact)),
      ).length,
    },
  };
  const prizeReady = passed && state.prizeCycle === PRIZE_EVERY - 1;
  const previousDay = state.days[day] ?? { answered: 0, correct: 0, missions: 0 };
  const next: PlayerState = {
    ...state,
    totalMissionsPassed: state.totalMissionsPassed + Number(passed),
    consecutiveWins: passed ? state.consecutiveWins + 1 : 0,
    consecutiveFails: passed ? 0 : state.consecutiveFails + 1,
    prizeCycle: passed ? Math.min(PRIZE_EVERY, state.prizeCycle + 1) : state.prizeCycle,
    prizesEarned: state.prizesEarned + Number(prizeReady),
    missions: [
      {
        id: attempt.id,
        mode: "multiplication" as const,
        rankId: state.rankId,
        startedAt: attempt.startedAt,
        finishedAt: now,
        elapsedMs: attempt.mathElapsedMs,
        timeLimitMs: attempt.timeLimitMs,
        correct: attempt.correct,
        wrong: attempt.wrong,
        passed,
      },
      ...state.missions,
    ].slice(0, 60),
    days: {
      ...state.days,
      [day]: { ...previousDay, missions: previousDay.missions + Number(passed) },
    },
    club: {
      ...club,
      balance: club.balance + coinsGained,
      // Mark both former components claimed so an old client cannot mint a second daily grant.
      rewardDays: coinsGained
        ? { ...club.rewardDays, [day]: { mission: true, focus: true } }
        : club.rewardDays,
    },
    course: {
      ...course,
      completedMatches,
      rewardDays: coinsGained ? { ...course.rewardDays, [day]: coinsGained } : course.rewardDays,
      lastResult,
    },
  };
  next.course = {
    ...next.course!,
    selectedMatchId: passed ? nextCourseMatch(next).id : attempt.matchId,
  };
  if (prizeReady) {
    next.parentAlerts = [
      {
        id: `course-prize:${attempt.id}`,
        at: now,
        kind: "prize" as const,
        title: "Combinado familiar disponível",
        body: "Dez partidas concluídas. Confiram juntos o prêmio combinado.",
        read: false,
      },
      ...state.parentAlerts,
    ].slice(0, 40);
  }
  return { state: next, activeAttempt: null, ok: true };
}

/** Commands never trust client scores, rewards, ownership or full replacement state. */
export function applyCourseCommand(
  originalState: PlayerState,
  activeAttempt: CourseAttempt | null,
  command: CourseCommand,
  context: CourseContext,
): CourseCommandOutcome {
  const reject = (message: string): CourseCommandOutcome => ({
    state: originalState,
    activeAttempt,
    ok: false,
    message,
  });
  if (!Number.isFinite(context.now) || context.now < 0 || !context.deviceId || !context.operationId)
    return reject("Não foi possível identificar este comando.");
  const state: PlayerState = {
    ...originalState,
    course: normalizeCourse(originalState),
    club: normalizeClub(originalState.club),
  };
  const done = (next = state, attempt = activeAttempt): CourseCommandOutcome => ({
    state: next,
    activeAttempt: attempt,
    ok: true,
  });

  if (command.type === "start") {
    if (activeAttempt) return reject("Continue a partida que já está em andamento.");
    if (!courseMatchUnlocked(state, command.matchId))
      return reject("Conclua a partida anterior para liberar esta.");
    if (
      state.missions.some((mission) => mission.id === context.operationId) ||
      state.course?.lastResult?.attemptId === context.operationId
    )
      return reject("Esta partida já foi registrada.");
    const deck = courseFacts(state, command.matchId, context.now);
    if (!deck.length) return reject("Esta partida não está disponível.");
    return done(
      {
        ...state,
        course: { ...state.course!, selectedMatchId: command.matchId, lastResult: null },
      },
      {
        id: context.operationId,
        matchId: command.matchId,
        ownerDeviceId: context.deviceId,
        phase: "answer",
        resumePhase: "answer",
        startedAt: context.now,
        updatedAt: context.now,
        timeLimitMs: state.course!.durationSec * 1000,
        mathElapsedMs: 0,
        correct: 0,
        wrong: 0,
        goals: 0,
        fact: deck[0],
        queue: deck.slice(1),
        responses: [],
        feedback: null,
        assistedCurrent: false,
        lastShot: null,
      },
    );
  }
  if (command.type === "select") {
    if (!courseMatchUnlocked(state, command.matchId))
      return reject("Conclua a partida anterior para liberar esta.");
    if (activeAttempt) return reject("Continue a partida em andamento antes de trocar.");
    return done({
      ...state,
      course: { ...state.course!, selectedMatchId: command.matchId, lastResult: null },
    });
  }
  if (command.type === "buy") {
    const result = purchaseCosmetic(state, command.itemId);
    return result.ok
      ? done(result.state)
      : reject(
          result.reason === "insufficient-coins"
            ? "Ainda faltam moedas para esta escolha."
            : result.reason === "owned"
              ? "Este item já é seu."
              : "Este item não está à venda.",
        );
  }
  if (command.type === "equip") {
    const item = cosmeticItem(command.itemId);
    if (!item || !cosmeticUnlocked(item, state))
      return reject("Conquiste este item antes de usar.");
    return done(equipCosmetic(state, item.id));
  }
  if (command.type === "goal") {
    const item = command.itemId === null ? null : cosmeticItem(command.itemId);
    if (
      command.itemId !== null &&
      (!item?.cost || state.club!.ownedItemIds.includes(command.itemId))
    )
      return reject("Escolha um item da loja que você ainda quer conquistar.");
    return done(chooseGoal(state, command.itemId));
  }
  if (command.type === "settings") {
    if (command.durationSec !== undefined && ![120, 180, 300].includes(command.durationSec))
      return reject("Escolha 2, 3 ou 5 minutos.");
    if (
      command.childName !== undefined &&
      (typeof command.childName !== "string" || command.childName.trim().length > 40)
    )
      return reject("Use um nome de até 40 caracteres.");
    if (
      command.prizeName !== undefined &&
      (typeof command.prizeName !== "string" || command.prizeName.trim().length > 40)
    )
      return reject("Use um combinado de até 40 caracteres.");
    if (command.sound !== undefined && typeof command.sound !== "boolean")
      return reject("Preferência de som inválida.");
    return done({
      ...state,
      ...(command.childName !== undefined
        ? { childName: command.childName.trim(), onboarded: true }
        : {}),
      ...(command.prizeName !== undefined ? { prizeName: command.prizeName.trim() } : {}),
      ...(command.sound !== undefined ? { sound: command.sound } : {}),
      course: { ...state.course!, durationSec: command.durationSec ?? state.course!.durationSec },
    });
  }
  if (command.type === "claim-prize") {
    if (state.prizeCycle < PRIZE_EVERY) return reject("O combinado ainda não está disponível.");
    return done({ ...state, prizeCycle: 0, prizesClaimed: state.prizesClaimed + 1 });
  }

  if (!("attemptId" in command) || !activeAttempt || activeAttempt.id !== command.attemptId)
    return reject("Esta partida não está mais ativa. Atualize para continuar.");
  if (!courseMatch(activeAttempt.matchId) || !courseMatchUnlocked(state, activeAttempt.matchId))
    return reject("O progresso desta partida precisa ser recuperado.");
  if (
    activeAttempt.ownerDeviceId !== context.deviceId &&
    !(command.type === "resume" && command.takeover === true)
  )
    return reject("A partida está em outro aparelho. Escolha continuar aqui para transferir.");
  if (context.now < activeAttempt.updatedAt)
    return reject("Este comando é anterior ao último progresso salvo.");
  const attempt: CourseAttempt = { ...activeAttempt, updatedAt: context.now };

  if (command.type === "resume") {
    return done(state, {
      ...attempt,
      ownerDeviceId: context.deviceId,
      phase: attempt.phase === "paused" ? attempt.resumePhase : attempt.phase,
    });
  }
  const charged = "elapsedMs" in command;
  if (charged) {
    const elapsedMs = command.elapsedMs;
    const remaining = attempt.timeLimitMs - attempt.mathElapsedMs;
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > remaining)
      return reject("O tempo enviado não corresponde à partida.");
    if (attempt.phase !== "answer" && elapsedMs !== 0)
      return reject("O relógio só conta enquanto uma conta está sendo respondida.");
    attempt.mathElapsedMs += elapsedMs;
  }
  if (command.type === "pause") {
    if (attempt.phase === "paused") return reject("A partida já está pausada.");
    if (attempt.phase === "answer" && attempt.mathElapsedMs >= attempt.timeLimitMs)
      return finish(state, attempt, false, context.now);
    return done(state, { ...attempt, resumePhase: attempt.phase, phase: "paused" });
  }
  if (attempt.phase === "paused") return reject("Continue a partida antes de jogar.");
  if (command.type === "expire") {
    if (attempt.phase !== "answer" || attempt.mathElapsedMs < attempt.timeLimitMs)
      return reject("Ainda há tempo para responder.");
    return finish(state, attempt, false, context.now);
  }
  if (command.type === "checkpoint") {
    if (attempt.phase !== "answer") return reject("O relógio está pausado neste momento.");
    return attempt.mathElapsedMs >= attempt.timeLimitMs
      ? finish(state, attempt, false, context.now)
      : done(state, attempt);
  }
  if (command.type === "help") {
    if (attempt.phase !== "answer") return reject("A ajuda acompanha a conta atual.");
    if (attempt.mathElapsedMs >= attempt.timeLimitMs)
      return finish(state, attempt, false, context.now);
    return done(state, {
      ...attempt,
      phase: "feedback",
      resumePhase: "feedback",
      feedback: "help",
      assistedCurrent: true,
    });
  }
  if (command.type === "answer") {
    if (
      attempt.phase !== "answer" ||
      !Number.isFinite(command.guess) ||
      attempt.correct >= MAX_CORRECT
    )
      return reject("Confira a conta e envie uma resposta válida.");
    if (attempt.mathElapsedMs >= attempt.timeLimitMs)
      return finish(state, attempt, false, context.now);
    const ok = command.guess === factAnswer(attempt.fact);
    const assisted =
      attempt.assistedCurrent ||
      attempt.responses.some((response) => factKey(response.fact) === factKey(attempt.fact));
    // Checkpoints may already have charged most of this question's thinking time.
    const responseMs = Math.max(
      0,
      attempt.mathElapsedMs - attempt.responses.reduce((sum, response) => sum + response.ms, 0),
    );
    const withEvidence = firstIndependentAnswer(state, attempt, ok, responseMs, context.now);
    const day = todayKey(new Date(context.now));
    const dayBefore = withEvidence.days[day] ?? { answered: 0, correct: 0, missions: 0 };
    const nextState = {
      ...withEvidence,
      days: {
        ...withEvidence.days,
        [day]: {
          ...dayBefore,
          answered: dayBefore.answered + 1,
          correct: dayBefore.correct + Number(ok),
        },
      },
    };
    const queue = [...attempt.queue];
    if (!ok) {
      const key = factKey(attempt.fact);
      const existing = queue.findIndex((fact) => factKey(fact) === key);
      if (existing >= 0) queue.splice(existing, 1);
      queue.splice(Math.min(3, queue.length), 0, attempt.fact);
    }
    return done(nextState, {
      ...attempt,
      phase: "feedback",
      resumePhase: "feedback",
      correct: attempt.correct + Number(ok),
      wrong: attempt.wrong + Number(!ok),
      queue,
      feedback: ok ? "correct" : "incorrect",
      responses: [...attempt.responses, { fact: attempt.fact, ok, ms: responseMs, assisted }],
    });
  }
  if (command.type === "continue") {
    if (attempt.phase !== "feedback") return reject("A próxima jogada ainda não está disponível.");
    if (attempt.feedback === "help")
      return done(state, {
        ...attempt,
        phase: "answer",
        resumePhase: "answer",
        feedback: null,
        assistedCurrent: true,
      });
    if (attempt.feedback === "correct" && attempt.correct % 3 === 0)
      return done(state, { ...attempt, phase: "shot", resumePhase: "shot", feedback: null });
    return done(state, nextQuestion(state, attempt));
  }
  if (command.type === "shoot") {
    if (
      attempt.phase !== "shot" ||
      !VALID_DIRECTIONS.includes(command.direction) ||
      attempt.correct !== (attempt.goals + 1) * 3
    )
      return reject("Faça três acertos para preparar seu próximo chute.");
    const shot = { ...attempt, goals: attempt.goals + 1, lastShot: command.direction };
    return shot.goals === 5
      ? finish(state, shot, true, context.now)
      : done(state, nextQuestion(state, shot));
  }
  return reject("Este comando não está disponível.");
}
