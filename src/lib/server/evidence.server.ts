import type { SqlQuery } from "@/lib/db";
import type { CourseAttempt, CourseRequest } from "@/lib/game/course-types";
import type { CourseCommandOutcome } from "@/lib/game/course-engine";
import type {
  LearningEvent,
  LearningWindow,
  ParentReport,
  FactReport,
} from "@/lib/game/parent-types";
import { normalizeCourse } from "@/lib/game/course";
import { factKey, todayKey, type PlayerState } from "@/lib/game/types";

/** Runs under the SAME player lock/transaction as the command and its idempotency record. */
export async function recordEvidence(
  tx: SqlQuery,
  userId: string,
  request: CourseRequest,
  before: PlayerState,
  attempt: CourseAttempt | null,
  result: CourseCommandOutcome,
  now: number,
) {
  await tx`insert into evidence_versions (user_id, started_ms, legacy_facts, legacy_rewards, opening_balance)
    values (${userId}, ${now}, ${JSON.stringify(before.facts)}::jsonb,
      ${JSON.stringify(normalizeCourse(before).rewardDays)}::jsonb, ${before.club?.balance ?? 0}) on conflict (user_id) do nothing`;
  const day = todayKey(new Date(now));
  const command = request.command;
  const afterAttempt = result.activeAttempt;
  const responded =
    command.type === "answer" &&
    attempt &&
    afterAttempt &&
    afterAttempt.responses.length === attempt.responses.length + 1;
  const helped = command.type === "help" && attempt && afterAttempt?.feedback === "help";
  if ((responded || helped) && attempt && afterAttempt) {
    const key = factKey(attempt.fact);
    const earlier = await tx<{ kind: string }>`select kind from learning_events
      where user_id = ${userId} and fact_key = ${key} and day_key = ${day}`;
    const response = responded ? afterAttempt.responses.at(-1)! : null;
    const firstInDay = !!responded && !earlier.some((event) => event.kind === "answer");
    const helpBeforeFirst =
      firstInDay && (attempt.assistedCurrent || earlier.some((event) => event.kind === "help"));
    const event: LearningEvent = {
      id: request.operationId,
      kind: responded ? "answer" : "help",
      attemptId: attempt.id,
      matchId: attempt.matchId,
      factKey: key,
      fact: attempt.fact,
      day,
      at: now,
      activeMs:
        response?.ms ??
        Math.max(
          0,
          afterAttempt.mathElapsedMs - attempt.responses.reduce((sum, row) => sum + row.ms, 0),
        ),
      attemptActiveMs: afterAttempt.mathElapsedMs,
      ok: response?.ok ?? null,
      guess: command.type === "answer" ? command.guess : null,
      firstInAttempt: !attempt.responses.some((row) => factKey(row.fact) === key),
      assisted: response?.assisted ?? true,
      firstInDay,
      helpBeforeFirst,
    };
    await tx`insert into learning_events (user_id, operation_id, kind, attempt_id, match_id, fact_key, day_key, occurred_ms, payload)
      values (${userId}, ${request.operationId}, ${event.kind}, ${attempt.id}, ${attempt.matchId}, ${key}, ${day}, ${now}, ${JSON.stringify(event)}::jsonb)`;
    const previous = result.state.facts[key] ?? {
      attempts: 0,
      correct: 0,
      wrong: 0,
      totalMs: 0,
      lastSeen: 0,
    };
    const independent = await tx<{
      day_key: string;
    }>`select day_key from learning_events where user_id = ${userId}
      and fact_key = ${key} and kind = 'answer' and payload->>'firstInDay' = 'true'
      and payload->>'ok' = 'true' and payload->>'helpBeforeFirst' = 'false' and payload->>'assisted' = 'false'
      order by day_key desc limit 7`;
    result.state = {
      ...result.state,
      facts: {
        ...result.state.facts,
        [key]: {
          ...previous,
          helpRequests: (previous.helpRequests ?? 0) + Number(helped),
          lastSeen: now,
          independentDays: independent.map((row) => row.day_key).reverse(),
        },
      },
    };
  }
  const delta = (result.state.club?.balance ?? 0) - (before.club?.balance ?? 0);
  if (delta !== 0) {
    if (
      !(command.type === "buy" && delta < 0) &&
      !(delta > 0 && result.state.course?.lastResult?.coinsGained === delta)
    )
      throw new Error("Movimentação sem origem válida. Nada foi salvo.");
    await tx`insert into coin_events (user_id, operation_id, kind, amount, balance_after, day_key, occurred_ms, item_id, attempt_id)
      values (${userId}, ${request.operationId}, ${delta > 0 ? "reward" : "purchase"}, ${delta}, ${result.state.club!.balance},
        ${day}, ${now}, ${command.type === "buy" ? command.itemId : null}, ${delta > 0 ? result.state.course!.lastResult!.attemptId : null})`;
  }
}

function dayOffset(day: string, delta: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}
export function summarizeWindow(events: LearningEvent[], from: string, to: string): LearningWindow {
  const rows = events.filter((row) => row.day >= from && row.day <= to);
  const answers = rows.filter((row) => row.kind === "answer");
  const first = answers.filter((row) => row.firstInDay);
  const independent = first.filter((row) => row.ok && !row.helpBeforeFirst && !row.assisted);
  return {
    from,
    to,
    responses: answers.length,
    correct: answers.filter((row) => row.ok).length,
    help: rows.filter((row) => row.kind === "help").length,
    firstResponses: first.length,
    independentCorrect: independent.length,
    independentPercent: first.length ? Math.round((independent.length / first.length) * 100) : null,
    averageIndependentMs: independent.length
      ? Math.round(independent.reduce((sum, row) => sum + row.activeMs, 0) / independent.length)
      : null,
    timedSamples: independent.length,
  };
}

export async function readParentReport(
  tx: SqlQuery,
  userId: string,
  player: PlayerState,
  now: number,
): Promise<ParentReport> {
  const today = todayKey(new Date(now));
  const from = dayOffset(today, -29);
  const rows = await tx<{
    payload: LearningEvent;
  }>`select payload from learning_events where user_id = ${userId}
    and day_key >= ${from} and day_key <= ${today} order by occurred_ms, operation_id`;
  const events = rows.map((row) => row.payload);
  const grouped = new Map<string, FactReport>();
  for (const event of events) {
    const report = grouped.get(event.factKey) ?? {
      key: event.factKey,
      fact: event.fact,
      responses: 0,
      errors: 0,
      help: 0,
      days: [],
      events: [],
    };
    report.events.push(event);
    if (event.kind === "help") report.help++;
    else {
      report.responses++;
      report.errors += Number(!event.ok);
      if (event.firstInDay)
        report.days.push({
          day: event.day,
          ok: !!event.ok,
          assisted: event.helpBeforeFirst || event.assisted,
          activeMs: event.activeMs,
        });
    }
    grouped.set(event.factKey, report);
  }
  const version = (
    await tx<{
      started_ms: number;
      legacy_facts: PlayerState["facts"];
      legacy_rewards: Record<string, number>;
      opening_balance: number;
    }>`select * from evidence_versions where user_id = ${userId}`
  )[0];
  const coins = await tx<{
    operation_id: string;
    kind: "reward" | "purchase";
    amount: number;
    balance_after: number;
    day_key: string;
    occurred_ms: number;
    item_id: string | null;
    attempt_id: string | null;
  }>`select * from coin_events where user_id = ${userId} order by occurred_ms desc, operation_id`;
  const archived = (
    await tx<{
      archived_ms: number;
    }>`select archived_ms from legacy_attempt_archives where user_id = ${userId}`
  )[0];
  return {
    generatedAt: now,
    detailedSince: version ? Number(version.started_ms) : null,
    current: summarizeWindow(events, dayOffset(today, -6), today),
    previous: summarizeWindow(events, dayOffset(today, -13), dayOffset(today, -7)),
    detailPeriod: { from, to: today },
    facts: [...grouped.values()].sort(
      (a, b) => b.errors + b.help - a.errors - a.help || a.key.localeCompare(b.key),
    ),
    coinEvents: coins.map((row) => ({
      id: row.operation_id,
      kind: row.kind,
      amount: row.amount,
      balanceAfter: row.balance_after,
      day: row.day_key,
      at: Number(row.occurred_ms),
      itemId: row.item_id,
      attemptId: row.attempt_id,
    })),
    legacyRewards: Object.entries(version?.legacy_rewards ?? normalizeCourse(player).rewardDays)
      .map(([day, amount]) => ({ day, amount }))
      .sort((a, b) => b.day.localeCompare(a.day)),
    legacyFacts: version?.legacy_facts ?? player.facts,
    openingBalance: version?.opening_balance ?? player.club?.balance ?? null,
    archivedLegacyAttemptAt: archived ? Number(archived.archived_ms) : null,
    player,
  };
}
