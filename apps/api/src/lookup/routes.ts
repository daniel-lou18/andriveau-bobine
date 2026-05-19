import { Hono } from "hono";
import type { Database } from "../db";
import { notFound } from "../http/errors";
import { jsonErrorValidator } from "../http/zod";
import { lookupRue } from "./index";
import { lookupParamsSchema, lookupQuerySchema } from "./schema";

type LookupEnv = {
  Bindings: Cloudflare.Env;
  Variables: { db: Database };
};

export const lookupRoutes = new Hono<LookupEnv>();

lookupRoutes.get(
  "/:rueId/lookup",
  jsonErrorValidator("param", lookupParamsSchema),
  jsonErrorValidator("query", lookupQuerySchema),
  async (c) => {
    const { rueId } = c.req.valid("param");
    const { n, suffix } = c.req.valid("query");
    const result = await lookupRue(c.get("db"), rueId, n, suffix);

    if (result === "not_found") {
      throw notFound("rue not found");
    }

    return c.json(result);
  }
);
