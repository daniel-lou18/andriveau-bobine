import { Hono } from "hono";
import type { Database } from "../db";
import { loaderAuth } from "./auth";
import { loadBatch } from "./index";
import { extractionBatchValidator } from "./validate";

type LoaderEnv = {
  Bindings: Cloudflare.Env;
  Variables: { db: Database };
};

export const loaderRoutes = new Hono<LoaderEnv>();

loaderRoutes.use("*", loaderAuth);

loaderRoutes.post("/extraction", extractionBatchValidator, async (c) => {
  const batch = c.req.valid("json");
  const report = await loadBatch(c.get("db"), batch);
  return c.json(report);
});
