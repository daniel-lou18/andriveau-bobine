import type { Context, ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

function logExceptionCause(c: Context, cause: unknown): void {
  if (cause instanceof ZodError) {
    console.error(
      JSON.stringify({
        event: "validation_error",
        method: c.req.method,
        path: c.req.path,
        issues: cause.issues,
      })
    );
    return;
  }

  console.error(
    JSON.stringify({
      event: "error_cause",
      method: c.req.method,
      path: c.req.path,
      cause:
        cause instanceof Error
          ? { name: cause.name, message: cause.message, stack: cause.stack }
          : cause,
    })
  );
}

/**
 * Maps thrown {@link HTTPException} (and unexpected errors) to the v1 JSON
 * error shape `{ error: string }`. Logs `cause` (e.g. full Zod issues) while
 * keeping the response message user-facing. Register with `app.onError(apiErrorHandler)`.
 */
function isMalformedJsonError(err: Error): boolean {
  return (
    err instanceof SyntaxError ||
    /JSON|Unexpected token|not valid JSON/i.test(err.message)
  );
}

export const apiErrorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    if (err.cause !== undefined) {
      logExceptionCause(c, err.cause);
    }

    if (err.res) {
      return err.getResponse();
    }

    const message =
      err.message.trim() !== "" ? err.message : "Request failed";
    return c.json({ error: message }, err.status);
  }

  if (err instanceof Error && isMalformedJsonError(err)) {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  console.error(
    JSON.stringify({
      event: "unhandled_error",
      method: c.req.method,
      path: c.req.path,
      name: err.name,
      message: err.message,
      stack: err.stack,
    })
  );
  return c.json({ error: "Internal Server Error" }, 500);
};
