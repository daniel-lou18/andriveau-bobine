import { Hono } from "hono";
import type { Database } from "../db";
import { jsonErrorValidator } from "../http/zod";
import { suggestRues } from "./index";
import { suggestQuerySchema } from "./schema";

type SuggestEnv = {
  Bindings: Cloudflare.Env;
  Variables: { db: Database };
};

export const suggestRoutes = new Hono<SuggestEnv>();

suggestRoutes.get(
  "/suggest",
  jsonErrorValidator("query", suggestQuerySchema),
  async (c) => {
    const { q } = c.req.valid("query");
    const results = await suggestRues(c.get("db"), q);
    return c.json({ results });
  }
);
