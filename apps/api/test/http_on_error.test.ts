import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { badRequest, invalidExtractionBatch } from "../src/http/errors";
import { extractionBatchSchema } from "../src/loader/schema";
import { apiErrorHandler } from "../src/http/on-error";

function mockContext(path = "/api/rues/suggest") {
  return {
    req: { method: "GET", path },
    json: vi.fn((body: unknown, status: number) =>
      new Response(JSON.stringify(body), { status })
    ),
  } as Parameters<typeof apiErrorHandler>[1];
}

describe("apiErrorHandler", () => {
  it("returns the HTTPException message and does not expose Zod issues in the body", async () => {
    const schema = z.object({ q: z.string().min(2, "too short") });
    const parsed = schema.safeParse({ q: "a" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const err = badRequest(parsed.error.issues[0]!.message, {
      cause: parsed.error,
    });

    const c = mockContext();
    const res = await apiErrorHandler(err, c);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "too short" });
    expect(body).not.toHaveProperty("issues");
  });

  it("logs full Zod issues when cause is a ZodError", async () => {
    const schema = z.object({
      q: z.string().min(2, "too short"),
      extra: z.string().min(1, "required"),
    });
    const parsed = schema.safeParse({ q: "a" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const err = badRequest("too short", { cause: parsed.error });
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await apiErrorHandler(err, mockContext());

    expect(logSpy).toHaveBeenCalledOnce();
    const logged = JSON.parse(String(logSpy.mock.calls[0]![0])) as {
      event: string;
      issues: { message: string }[];
    };
    expect(logged.event).toBe("validation_error");
    expect(logged.issues.length).toBeGreaterThan(1);

    logSpy.mockRestore();
  });

  it("returns issues in the body for invalid extraction batch (loader CLI)", async () => {
    const parsed = extractionBatchSchema.safeParse({ logical_records: [] });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const err = invalidExtractionBatch(parsed.error);
    const res = await apiErrorHandler(err, mockContext("/api/_loader/extraction"));

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: unknown[] };
    expect(body.error).toBe("Invalid extraction batch JSON");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });
});
