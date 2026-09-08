import { createMiddleware } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

export const parentContext = createMiddleware({ type: "function" })
  .middleware([authMiddleware])
  .client(async ({ next }) => {
    const { getParentAccess } = await import("@/lib/game/parent-access");
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({
      sendContext: {
        parentGrant: getParentAccess()?.token,
        parentBearer: getBearerToken() ?? undefined,
      },
    });
  })
  .server(async ({ next, context }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "no-store, private");
    const { getSql } = await import("@/lib/db");
    const { parentSession } = await import("./parent-session.server");
    const session = await parentSession(await getSql(), context.userId, context.parentBearer);
    return next({ context: { parentAuthority: { session, grant: context.parentGrant ?? null } } });
  });
