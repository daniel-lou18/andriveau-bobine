import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createDb, type Database } from "./db";
import { apiErrorHandler } from "./http/on-error";
import { loaderRoutes } from "./loader/routes";
import { suggestRoutes } from "./suggest/routes";

type AppBindings = Cloudflare.Env;

type AppVariables = {
  db: Database;
};

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.onError(apiErrorHandler);

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

app.route("/api/rues", suggestRoutes);
app.route("/api/_loader", loaderRoutes);

app.get("/api/db/health", async (c) => {
  const db = c.get("db");
  await db.run(sql`select 1`);
  return c.json({ ok: true, db: true });
});

export default app;
