import { HTTPException } from "hono/http-exception";
import type { z } from "zod";

type ApiExceptionOptions = {
  cause?: unknown;
};

/** 400 — validation or bad input (`{ error: string }` body via `apiErrorHandler`). */
export function badRequest(
  message: string,
  options?: ApiExceptionOptions
): HTTPException {
  return new HTTPException(400, { message, ...options });
}

const INVALID_EXTRACTION_BATCH =
  "Invalid extraction batch JSON" as const;

/**
 * 400 — extraction interchange failed Zod validation.
 * Response includes `issues` for the loader CLI; full detail is logged via `cause`.
 */
export function invalidExtractionBatch(
  error: z.core.$ZodError
): HTTPException {
  return new HTTPException(400, {
    message: INVALID_EXTRACTION_BATCH,
    cause: error,
    res: Response.json(
      { error: INVALID_EXTRACTION_BATCH, issues: error.issues },
      { status: 400 }
    ),
  });
}

/** 401 — missing or invalid credentials. */
export function unauthorized(
  message = "unauthorized"
): HTTPException {
  return new HTTPException(401, { message });
}

/** 400 — request body was not valid JSON. */
export function invalidJsonBody(): HTTPException {
  return new HTTPException(400, { message: "invalid JSON body" });
}
