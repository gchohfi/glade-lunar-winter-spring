import { createServerFn } from "@tanstack/react-start";
import { getSql, dbStorage } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type { CourseRequest } from "@/lib/game/course-types";
import { parentContext } from "./parent-middleware";
import { gameView } from "./game-view.server";
import {
  createCourseService,
  validateCourseRequest,
  validateLegacyImport,
  type LegacyImportRequest,
} from "./course-service.server";

export const loadProgress = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const result = await createCourseService(await getSql(), dbStorage).load(context.userId);
    return result ? gameView(result) : null;
  });

export const saveProgress = createServerFn({ method: "POST" })
  .middleware([parentContext])
  .validator((input: CourseRequest) => validateCourseRequest(input))
  .handler(async ({ context, data }) =>
    gameView(
      await createCourseService(await getSql(), dbStorage).save(
        context.userId,
        data,
        context.parentAuthority,
      ),
    ),
  );

/** Explicit adult-reviewed import, once only; never an automatic local snapshot upload. */
export const importLegacyProgress = createServerFn({ method: "POST" })
  .middleware([parentContext])
  .validator((input: LegacyImportRequest) => validateLegacyImport(input))
  .handler(async ({ context, data }) =>
    gameView(
      await createCourseService(await getSql(), dbStorage).importLegacy(
        context.userId,
        data,
        context.parentAuthority,
      ),
    ),
  );
