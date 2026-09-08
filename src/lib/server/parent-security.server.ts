import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { Sql, SqlQuery } from "@/lib/db";
import type { ParentStatus, ParentUnlock } from "@/lib/game/parent-types";

export type ParentSession = { id: string; userId: string; createdAt: number; expiresAt: number };
export type ParentAuthority = { session: ParentSession; grant: string | null };
const ACCESS_MS = 10 * 60_000;
const LOCK_MS = 15 * 60_000;
export const grantHash = (token: string) => createHash("sha256").update(token).digest("hex");
function pinKey(pin: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(pin, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}
export function recentParentAuth(session: ParentSession, now: number) {
  return (
    now >= session.createdAt && now - session.createdAt <= 5 * 60_000 && session.expiresAt > now
  );
}
export async function assertParentGrant(
  tx: SqlQuery,
  userId: string,
  authority: ParentAuthority | undefined,
  now: number,
) {
  if (
    !authority?.grant ||
    authority.session.userId !== userId ||
    authority.session.expiresAt <= now
  )
    throw new Error("Abra os Pais com seu PIN para continuar.");
  // Row locking makes revocation/reset and protected mutations serialize.
  const rows = await tx<{
    token_hash: string;
  }>`select token_hash from parent_grants where user_id = ${userId}
    and session_id = ${authority.session.id} and token_hash = ${grantHash(authority.grant)} and expires_ms > ${now} for update`;
  if (!rows.length) throw new Error("O acesso aos Pais terminou. Digite seu PIN novamente.");
}
export async function revokeParentSession(tx: SqlQuery, session: ParentSession) {
  await tx`delete from parent_grants where user_id = ${session.userId} and session_id = ${session.id}`;
}

/** The caller supplies a DB-verified live Better Auth session, never a client timestamp. */
export function createParentSecurity(
  sql: Sql,
  storage: "persistent" | "temporary",
  clock = Date.now,
) {
  const permanent = () => {
    if (storage !== "persistent")
      throw new Error("O armazenamento permanente está indisponível. Nenhum PIN foi alterado.");
  };
  const validSession = (session: ParentSession) => {
    if (!session.id || !session.userId || session.expiresAt <= clock())
      throw new Error("Unauthorized");
  };
  const grant = async (tx: SqlQuery, session: ParentSession): Promise<ParentUnlock> => {
    const token = randomBytes(32).toString("hex");
    const expiresAt = Math.min(clock() + ACCESS_MS, session.expiresAt);
    await revokeParentSession(tx, session);
    await tx`insert into parent_grants (token_hash, user_id, session_id, expires_ms)
      values (${grantHash(token)}, ${session.userId}, ${session.id}, ${expiresAt})`;
    return { ok: true, grant: token, expiresAt };
  };
  return {
    async status(session: ParentSession): Promise<ParentStatus> {
      validSession(session);
      const rows = await sql<{
        locked_until: number;
      }>`select locked_until from parent_security where user_id = ${session.userId}`;
      return {
        configured: !!rows.length,
        recentAuth: recentParentAuth(session, clock()),
        lockedUntil: Number(rows[0]?.locked_until ?? 0),
      };
    },
    async setPin(session: ParentSession, pin: string): Promise<ParentUnlock> {
      permanent();
      validSession(session);
      if (!/^\d{6}$/.test(pin)) throw new Error("Use um PIN com seis números.");
      if (!recentParentAuth(session, clock()))
        throw new Error("Entre novamente na conta do responsável para definir ou recuperar o PIN.");
      const salt = randomBytes(24).toString("hex");
      const key = (await pinKey(pin, salt)).toString("hex");
      return sql.transaction(async (tx) => {
        if (!recentParentAuth(session, clock()))
          throw new Error("Entre novamente na conta para definir o PIN.");
        await tx`insert into parent_security (user_id, pin_hash, pin_salt, updated_ms) values (${session.userId}, ${key}, ${salt}, ${clock()})
          on conflict (user_id) do update set pin_hash = excluded.pin_hash, pin_salt = excluded.pin_salt, updated_ms = excluded.updated_ms, failures = 0, locked_until = 0`;
        await tx`delete from parent_grants where user_id = ${session.userId}`;
        return grant(tx, session);
      });
    },
    async unlock(session: ParentSession, pin: string): Promise<ParentUnlock> {
      permanent();
      validSession(session);
      if (!/^\d{6}$/.test(pin)) throw new Error("Digite os seis números do PIN.");
      return sql.transaction(async (tx) => {
        const row = (
          await tx<{
            pin_hash: string;
            pin_salt: string;
            failures: number;
            locked_until: number;
          }>`select * from parent_security where user_id = ${session.userId} for update`
        )[0];
        if (!row) return { ok: false, message: "Defina o PIN do responsável primeiro." };
        const now = clock();
        if (Number(row.locked_until) > now)
          return {
            ok: false,
            message: "Acesso bloqueado por 15 minutos após cinco tentativas incorretas.",
            lockedUntil: Number(row.locked_until),
          };
        const candidate = await pinKey(pin, row.pin_salt);
        const expected = Buffer.from(row.pin_hash, "hex");
        if (expected.length !== candidate.length || !timingSafeEqual(expected, candidate)) {
          const failures = (Number(row.locked_until) > 0 ? 0 : row.failures) + 1;
          const lockedUntil = failures >= 5 ? now + LOCK_MS : 0;
          await tx`update parent_security set failures = ${failures}, locked_until = ${lockedUntil} where user_id = ${session.userId}`;
          if (lockedUntil) await tx`delete from parent_grants where user_id = ${session.userId}`;
          return {
            ok: false,
            message: lockedUntil
              ? "Cinco tentativas incorretas. Aguarde 15 minutos ou recupere o PIN com sua conta."
              : `PIN incorreto. Restam ${5 - failures} tentativas.`,
            lockedUntil,
          };
        }
        await tx`update parent_security set failures = 0, locked_until = 0 where user_id = ${session.userId}`;
        return grant(tx, session);
      });
    },
    async close(session: ParentSession, token: string) {
      validSession(session);
      await sql`delete from parent_grants where user_id = ${session.userId} and session_id = ${session.id} and token_hash = ${grantHash(token)}`;
      return { closed: true };
    },
  };
}
