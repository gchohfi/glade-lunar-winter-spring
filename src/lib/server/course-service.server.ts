import { createHash } from "node:crypto";
import { z } from "zod";
import type { Sql, SqlQuery } from "@/lib/db";
import { applyCourseCommand } from "@/lib/game/course-engine";
import { normalizeCourse } from "@/lib/game/course";
import { migrateState } from "@/lib/game/progress";
import { emptyState, type PlayerState } from "@/lib/game/types";
import { validClubDay } from "@/lib/game/club";
import { recordEvidence } from "./evidence.server";
import {
  assertParentGrant,
  revokeParentSession,
  type ParentAuthority,
} from "./parent-security.server";
import type {
  CourseAttempt,
  CourseEnvelope,
  CourseRequest,
  CourseResponse,
} from "@/lib/game/course-types";

const token = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);
const count = z.number().int().min(0).max(10_000_000);
const milliseconds = z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER);
const dayKey = z.string().refine(validClubDay);
const rank = z.enum([
  "cadete",
  "aprendiz",
  "piloto",
  "capitao",
  "comandante",
  "almirante",
  "lenda",
]);
const duration = z.union([z.literal(120), z.literal(180), z.literal(300)]);
const elapsed = z.number().finite().min(0).max(86_400_000);
const fact = z
  .object({
    a: z.number().finite().min(0).max(1000),
    b: z.number().finite().positive().max(1000),
    op: z.enum(["mul", "div"]).optional(),
  })
  .strict();
const stats = z
  .object({
    attempts: count,
    correct: count,
    wrong: count,
    totalMs: milliseconds,
    lastSeen: milliseconds,
    independentDays: z.array(dayKey).max(7).optional(),
    helpRequests: count.optional(),
  })
  .strict();
const stateShape = {
  version: z.union([z.literal(1), z.literal(2)]),
  childName: z.string().max(80),
  rankId: rank,
  consecutiveWins: count,
  consecutiveFails: count,
  totalMissionsPassed: count,
  prizeCycle: count,
  prizesEarned: count,
  prizesClaimed: count,
  facts: z
    .record(z.string().regex(/^\d{1,3}(?:x|d)\d{1,3}$/), stats)
    .refine((value) => Object.keys(value).length <= 2500),
  missions: z
    .array(
      z
        .object({
          id: z.string().min(1).max(128),
          mode: z.enum(["multiplication", "vocabulary", "definitions"]),
          rankId: rank,
          startedAt: milliseconds,
          finishedAt: milliseconds,
          elapsedMs: milliseconds,
          timeLimitMs: milliseconds,
          correct: count,
          wrong: count,
          passed: z.boolean(),
        })
        .strict(),
    )
    .max(60),
  days: z
    .record(dayKey, z.object({ answered: count, correct: count, missions: count }).strict())
    .refine((value) => Object.keys(value).length <= 10_000),
  sound: z.boolean(),
  onboarded: z.boolean(),
  level: z.number().int().min(1).max(30).optional(),
  xp: z.number().finite().min(0).max(10_000_000).optional(),
  selectedPlanet: z.number().int().min(0).max(11).optional(),
  furthestPlanet: z.number().int().min(0).max(11).optional(),
  planetStars: z.array(z.number().int().min(0).max(3)).max(12).optional(),
  planetBestMs: z.array(milliseconds).max(12).optional(),
  bestCombo: count.optional(),
  extraTimeSec: z
    .union([z.literal(0), z.literal(15), z.literal(30), z.literal(45), z.literal(60)])
    .optional(),
  parentAlerts: z
    .array(
      z
        .object({
          id: z.string().max(128),
          at: milliseconds,
          kind: z.enum(["level", "rank", "ship", "prize"]),
          title: z.string().max(300),
          body: z.string().max(1000),
          read: z.boolean(),
        })
        .strict(),
    )
    .max(40)
    .optional(),
  notifyParents: z.boolean().optional(),
  prizeName: z.string().max(40).optional(),
  cosmetics: z.object({ ballId: token, fieldId: token }).strict().optional(),
  club: z
    .object({
      balance: count,
      ownedItemIds: z.array(token).max(100),
      goalItemId: token.nullable(),
      rewardDays: z
        .record(dayKey, z.object({ mission: z.boolean(), focus: z.boolean() }).strict())
        .refine((value) => Object.keys(value).length <= 10_000),
    })
    .strict()
    .optional(),
};
const storedStateSchema = z.object({ ...stateShape, course: z.unknown().optional() }).passthrough();
const legacyStateSchema = z.object({ ...stateShape, version: z.literal(2) }).strict();
const attemptSchema = z
  .object({
    id: token,
    matchId: token,
    ownerDeviceId: token,
    phase: z.enum(["answer", "feedback", "shot", "paused"]),
    resumePhase: z.enum(["answer", "feedback", "shot"]),
    startedAt: milliseconds,
    updatedAt: milliseconds,
    timeLimitMs: elapsed,
    mathElapsedMs: elapsed,
    correct: count,
    wrong: count,
    goals: z.number().int().min(0).max(5),
    fact,
    queue: z.array(fact).max(1000),
    responses: z
      .array(z.object({ fact, ok: z.boolean(), ms: elapsed, assisted: z.boolean() }).strict())
      .max(5000),
    feedback: z.enum(["correct", "incorrect", "help"]).nullable(),
    assistedCurrent: z.boolean(),
    lastShot: z.enum(["left", "center", "right"]).nullable(),
  })
  .strict();
const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start"), matchId: token }).strict(),
  z
    .object({ type: z.literal("resume"), attemptId: token, takeover: z.boolean().optional() })
    .strict(),
  z
    .object({
      type: z.literal("answer"),
      attemptId: token,
      guess: z.number().finite().min(-1_000_000).max(1_000_000),
      elapsedMs: elapsed,
    })
    .strict(),
  z.object({ type: z.literal("help"), attemptId: token, elapsedMs: elapsed }).strict(),
  z.object({ type: z.literal("continue"), attemptId: token }).strict(),
  z
    .object({
      type: z.literal("shoot"),
      attemptId: token,
      direction: z.enum(["left", "center", "right"]),
    })
    .strict(),
  z.object({ type: z.literal("pause"), attemptId: token, elapsedMs: elapsed }).strict(),
  z.object({ type: z.literal("expire"), attemptId: token, elapsedMs: elapsed }).strict(),
  z.object({ type: z.literal("checkpoint"), attemptId: token, elapsedMs: elapsed }).strict(),
  z.object({ type: z.literal("buy"), itemId: token }).strict(),
  z.object({ type: z.literal("equip"), itemId: token }).strict(),
  z.object({ type: z.literal("goal"), itemId: token.nullable() }).strict(),
  z.object({ type: z.literal("select"), matchId: token }).strict(),
  z
    .object({
      type: z.literal("settings"),
      durationSec: duration.optional(),
      childName: z.string().max(80).optional(),
      sound: z.boolean().optional(),
      prizeName: z.string().max(40).optional(),
    })
    .strict(),
  z.object({ type: z.literal("claim-prize") }).strict(),
]);
const requestSchema = z
  .object({
    protocolVersion: z.literal(3),
    expectedRevision: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER - 1),
    operationId: token,
    deviceId: token,
    command: commandSchema,
  })
  .strict();
const importSchema = z
  .object({ protocolVersion: z.literal(3), operationId: token, legacyState: legacyStateSchema })
  .strict();
export type LegacyImportRequest = {
  protocolVersion: 3;
  operationId: string;
  legacyState: PlayerState;
};

export function validateCourseRequest(input: unknown): CourseRequest {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      "Atualize o jogo e tente novamente. O pedido recebido não é válido para esta versão.",
    );
  return parsed.data;
}
export function validateLegacyImport(input: unknown): LegacyImportRequest {
  const encoded = JSON.stringify(input);
  if (!encoded || encoded.length > 1_000_000)
    throw new Error("O progresso local é grande demais ou inválido para importar com segurança.");
  const parsed = importSchema.safeParse(input);
  if (!parsed.success)
    throw new Error("O progresso local não está no formato esperado. Nada foi substituído.");
  return parsed.data as LegacyImportRequest;
}
function json(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}
export function stateFrom(raw: unknown): PlayerState {
  const parsed = storedStateSchema.safeParse(json(raw));
  if (!parsed.success)
    throw new Error("Não foi possível ler o progresso salvo com segurança. Ele não foi apagado.");
  const state = migrateState(parsed.data as Partial<PlayerState>);
  return { ...state, course: normalizeCourse(state) };
}
function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(object[key])}`)
    .join(",")}}`;
}
function hash(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}
type PlayerRow = {
  state: unknown;
  revision: number;
  protocol_version: number;
  active_attempt: unknown;
};
type OperationRow = { command_hash: string; outcome: unknown };
type Outcome = { ok: boolean; message?: string };

/** Actor always comes from authenticated server context, never a request field. */
export function createCourseService(
  sql: Sql,
  storage: CourseEnvelope["storage"],
  clock = Date.now,
) {
  const requirePersistentStorage = () => {
    if (storage !== "persistent")
      throw new Error(
        "O servidor ainda não tem armazenamento permanente configurado. Nada foi salvo na conta. Tente novamente quando o serviço estiver disponível.",
      );
  };
  const envelope = (row: PlayerRow): CourseEnvelope => ({
    protocolVersion: 3,
    revision: Number(row.revision),
    state: stateFrom(row.state),
    activeAttempt: row.active_attempt
      ? (attemptSchema.parse(json(row.active_attempt)) as CourseAttempt)
      : null,
    storage,
  });
  const read = async (tx: SqlQuery, userId: string): Promise<PlayerRow | undefined> => {
    if (!userId || typeof userId !== "string") throw new Error("Unauthorized");
    return (
      await tx<PlayerRow>`select state, revision, protocol_version, active_attempt from players where user_id = ${userId} for update`
    )[0];
  };
  const write = async (
    tx: SqlQuery,
    userId: string,
    row: PlayerRow,
    state: PlayerState,
    attempt: CourseAttempt | null,
  ): Promise<PlayerRow> => {
    const rows =
      await tx<PlayerRow>`update players set state = ${JSON.stringify(state)}::jsonb, active_attempt = ${JSON.stringify(attempt)}::jsonb,
      revision = revision + 1, protocol_version = 3, updated_at = now(), child_name = ${state.childName}, rank_id = ${state.rankId},
      consecutive_wins = ${state.consecutiveWins}, consecutive_fails = ${state.consecutiveFails}, total_missions = ${state.totalMissionsPassed},
      prize_cycle = ${state.prizeCycle}, prizes_earned = ${state.prizesEarned}, prizes_claimed = ${state.prizesClaimed}, sound_on = ${state.sound}, onboarded = ${state.onboarded}
      where user_id = ${userId} and revision = ${row.revision} returning state, revision, protocol_version, active_attempt`;
    if (!rows[0])
      throw new Error("O progresso mudou enquanto era salvo. Recarregue para continuar.");
    return rows[0];
  };
  const migrate = async (tx: SqlQuery, userId: string, row: PlayerRow): Promise<PlayerRow> => {
    if (row.protocol_version === 3) return row;
    if (row.active_attempt && json(row.active_attempt) !== null)
      await tx`insert into legacy_attempt_archives (user_id, archived_ms, attempt, reason)
        values (${userId}, ${clock()}, ${JSON.stringify(json(row.active_attempt))}::jsonb, 'Tentativa do percurso anterior, incompatível com os 20 jogos')
        on conflict (user_id) do nothing`;
    // Legacy passthrough snapshots are not evidence of playing the new curriculum.
    const legacy = { ...(json(row.state) as Record<string, unknown>) };
    delete legacy.course;
    return write(tx, userId, row, stateFrom(legacy), null);
  };
  const previous = async (tx: SqlQuery, userId: string, operationId: string) =>
    (
      await tx<OperationRow>`select command_hash, outcome from player_operations where user_id = ${userId} and operation_id = ${operationId}`
    )[0];
  const duplicate = (
    row: PlayerRow,
    operation: OperationRow,
    expectedHash: string,
  ): CourseResponse => {
    if (operation.command_hash !== expectedHash)
      return {
        ...envelope(row),
        status: "rejected",
        message: "Este pedido já foi usado para outra ação. Atualize e tente novamente.",
      };
    const outcome = json(operation.outcome) as Outcome;
    return {
      ...envelope(row),
      status: outcome.ok ? "duplicate" : "rejected",
      ...(outcome.message ? { message: outcome.message } : {}),
    };
  };
  const record = async (
    tx: SqlQuery,
    userId: string,
    operationId: string,
    commandHash: string,
    commandType: string,
    outcome: Outcome,
  ) => {
    await tx`insert into player_operations (user_id, operation_id, command_hash, command_type, outcome) values (${userId}, ${operationId}, ${commandHash}, ${commandType}, ${JSON.stringify(outcome)}::jsonb)`;
  };
  return {
    async load(userId: string): Promise<CourseEnvelope | null> {
      return sql.transaction(async (tx) => {
        const row = await read(tx, userId);
        return row ? envelope(await migrate(tx, userId, row)) : null;
      });
    },
    async save(
      userId: string,
      input: CourseRequest,
      authority?: ParentAuthority,
    ): Promise<CourseResponse> {
      const request = validateCourseRequest(input);
      if (!userId || typeof userId !== "string") throw new Error("Unauthorized");
      // Never acknowledge an account mutation backed only by process memory.
      requirePersistentStorage();
      const commandHash = hash({ deviceId: request.deviceId, command: request.command });
      return sql.transaction(async (tx) => {
        if (request.command.type === "settings" || request.command.type === "claim-prize")
          await assertParentGrant(tx, userId, authority, clock());
        else if (authority) await revokeParentSession(tx, authority.session);
        const fresh = stateFrom(emptyState());
        await tx`insert into players (user_id, state, protocol_version, revision) values (${userId}, ${JSON.stringify(fresh)}::jsonb, 3, 0) on conflict (user_id) do nothing`;
        let row = (await read(tx, userId))!;
        const operation = await previous(tx, userId, request.operationId);
        if (operation) return duplicate(row, operation, commandHash);
        row = await migrate(tx, userId, row);
        if (Number(row.revision) !== request.expectedRevision)
          return {
            ...envelope(row),
            status: "conflict",
            message: "Seu progresso foi atualizado em outro aparelho. Confira antes de continuar.",
          };
        const current = envelope(row);
        const now = clock();
        const result = applyCourseCommand(current.state, current.activeAttempt, request.command, {
          now,
          deviceId: request.deviceId,
          operationId: request.operationId,
        });
        const outcome: Outcome = {
          ok: result.ok,
          ...(result.message ? { message: result.message } : {}),
        };
        if (result.ok) {
          await recordEvidence(
            tx,
            userId,
            request,
            current.state,
            current.activeAttempt,
            result,
            now,
          );
          row = await write(tx, userId, row, result.state, result.activeAttempt);
        }
        await record(tx, userId, request.operationId, commandHash, request.command.type, outcome);
        return {
          ...envelope(row),
          status: result.ok ? "applied" : "rejected",
          ...(result.message ? { message: result.message } : {}),
        };
      });
    },
    async importLegacy(
      userId: string,
      input: LegacyImportRequest,
      authority?: ParentAuthority,
    ): Promise<CourseResponse> {
      const request = validateLegacyImport(input);
      if (!userId || typeof userId !== "string") throw new Error("Unauthorized");
      requirePersistentStorage();
      const commandHash = hash({ type: "import-legacy", state: request.legacyState });
      return sql.transaction(async (tx) => {
        await assertParentGrant(tx, userId, authority, clock());
        const state = stateFrom(request.legacyState);
        const inserted =
          await tx<PlayerRow>`insert into players (user_id, state, protocol_version, revision, child_name, rank_id, total_missions, onboarded, sound_on)
          values (${userId}, ${JSON.stringify(state)}::jsonb, 3, 1, ${state.childName}, ${state.rankId}, ${state.totalMissionsPassed}, ${state.onboarded}, ${state.sound})
          on conflict (user_id) do nothing returning state, revision, protocol_version, active_attempt`;
        let row = inserted[0] ?? (await read(tx, userId))!;
        const operation = await previous(tx, userId, request.operationId);
        if (operation) return duplicate(row, operation, commandHash);
        if (!inserted[0]) {
          row = await migrate(tx, userId, row);
          return {
            ...envelope(row),
            status: "rejected",
            message:
              "Esta conta já tem progresso salvo. A importação não substituiu nenhuma conquista.",
          };
        }
        await record(tx, userId, request.operationId, commandHash, "import-legacy", { ok: true });
        return { ...envelope(row), status: "applied" };
      });
    },
  };
}
