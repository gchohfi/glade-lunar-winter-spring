import { getRequest } from "@tanstack/react-start/server";
import type { SqlQuery } from "@/lib/db";
import type { ParentSession } from "./parent-security.server";

/** Additional DB check AFTER authMiddleware. The frozen auth helpers stay unchanged.
 * Cookie/bearer content is only a lookup key, never proof of identity or authentication age.
 * Matching the verified owner plus a live session also defeats stale cookie-cache sessions.
 */
export async function parentSession(
  sql: SqlQuery,
  userId: string,
  bearer?: string,
  now = Date.now(),
): Promise<ParentSession> {
  const headers = getRequest().headers;
  let token = bearer || headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    const value = headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("__Host-grok-auth.session_token="))
      ?.split("=")
      .slice(1)
      .join("=");
    token = value;
  }
  if (!token || token.length > 2048) throw new Error("Unauthorized");
  // Better Auth's popup bearer may be the signed/URL-encoded cookie value.
  // authMiddleware already verified it; the DB stores only its opaque token part.
  try {
    token = decodeURIComponent(token).split(".")[0];
  } catch {
    throw new Error("Unauthorized");
  }
  const row = (
    await sql<{ id: string; created: number; expires: number }>`select id,
    (extract(epoch from "createdAt") * 1000)::bigint as created,
    (extract(epoch from "expiresAt") * 1000)::bigint as expires
    from "session" where token = ${token} and "userId" = ${userId} and "expiresAt" > to_timestamp(${now} / 1000.0)`
  )[0];
  if (!row) throw new Error("Unauthorized");
  return { id: row.id, userId, createdAt: Number(row.created), expiresAt: Number(row.expires) };
}
