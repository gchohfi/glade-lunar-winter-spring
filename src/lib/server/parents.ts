import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql, dbStorage } from "@/lib/db";
import { parentContext } from "./parent-middleware";
import { createParentSecurity, assertParentGrant } from "./parent-security.server";
import { readParentReport } from "./evidence.server";
import { stateFrom } from "./course-service.server";
import { emptyState } from "@/lib/game/types";

const pinInput = (input: unknown) =>
  z
    .object({ pin: z.string().regex(/^\d{6}$/, "Use seis números.") })
    .strict()
    .parse(input);
export const parentStatus = createServerFn({ method: "GET" })
  .middleware([parentContext])
  .handler(async ({ context }) =>
    createParentSecurity(await getSql(), dbStorage).status(context.parentAuthority.session),
  );
export const setParentPin = createServerFn({ method: "POST" })
  .middleware([parentContext])
  .validator(pinInput)
  .handler(async ({ context, data }) =>
    createParentSecurity(await getSql(), dbStorage).setPin(
      context.parentAuthority.session,
      data.pin,
    ),
  );
export const unlockParents = createServerFn({ method: "POST" })
  .middleware([parentContext])
  .validator(pinInput)
  .handler(async ({ context, data }) =>
    createParentSecurity(await getSql(), dbStorage).unlock(
      context.parentAuthority.session,
      data.pin,
    ),
  );
export const closeParents = createServerFn({ method: "POST" })
  .middleware([parentContext])
  .validator((input: unknown) =>
    z
      .object({ grant: z.string().regex(/^[a-f0-9]{64}$/) })
      .strict()
      .parse(input),
  )
  .handler(async ({ context, data }) =>
    createParentSecurity(await getSql(), dbStorage).close(
      context.parentAuthority.session,
      data.grant,
    ),
  );
export const loadParentReport = createServerFn({ method: "GET" })
  .middleware([parentContext])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql.transaction(async (tx) => {
      await assertParentGrant(tx, context.userId, context.parentAuthority, Date.now());
      const row = (
        await tx<{ state: unknown }>`select state from players where user_id = ${context.userId}`
      )[0];
      return readParentReport(
        tx,
        context.userId,
        stateFrom(row?.state ?? emptyState()),
        Date.now(),
      );
    });
  });
