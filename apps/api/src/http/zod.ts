import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { z } from "zod";
import { badRequest } from "./errors";

/** Validates request parts; failures become {@link HTTPException} 400 (handled by `apiErrorHandler`). */
export function jsonErrorValidator<
  T extends z.ZodType,
  Target extends keyof ValidationTargets,
>(target: Target, schema: T) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      const message =
        result.error.issues[0]?.message ?? "Invalid request";
      throw badRequest(message, { cause: result.error });
    }
  });
}
