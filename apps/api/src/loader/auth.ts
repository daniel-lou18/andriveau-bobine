import { createMiddleware } from "hono/factory";
import { unauthorized } from "../http/errors";

export const loaderAuth = createMiddleware(async (c, next) => {
  const auth = c.req.header("Authorization") ?? "";
  const token = c.env.LOADER_TOKEN;
  if (!token || auth !== `Bearer ${token}`) {
    throw unauthorized();
  }
  await next();
});
