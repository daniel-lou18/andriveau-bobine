import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createDb, type Database } from "./db";
import { loadBatch } from "./loader";

type AppBindings = Cloudflare.Env;

type AppVariables = {
  db: Database;
};

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use(
  "/*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("*", async (c, next) => {
  c.set("db", createDb(c.env.DB));
  await next();
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/db/health", async (c) => {
  const db = c.get("db");
  await db.run(sql`select 1`);
  return c.json({ ok: true, db: true });
});

app.post("/api/_loader/extraction", async (c) => {
  const auth = c.req.header("Authorization") ?? "";
  const token = c.env.LOADER_TOKEN;
  if (!token || auth !== `Bearer ${token}`) {
    return c.json({ error: "unauthorized" }, 401);
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON body" }, 400);
  }
  const result = await loadBatch(c.get("db"), body);
  return c.json(result.body, result.status);
});

export default app;
