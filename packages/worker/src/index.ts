import { Hono } from "hono";
import { logger } from "hono/logger";
import { dbClient } from "@mise/api/db";
import { startNotificationPoller } from "./notifications.js";

const app = new Hono();

app.use("*", logger());

app.get("/health", async (c) => {
  try {
    await dbClient`select 1`;
    return c.json({ ok: true, service: "mise-worker" });
  } catch (error) {
    console.error("[Worker Health]", error);
    return c.json({ ok: false, service: "mise-worker" }, 503);
  }
});

app.onError((err, c) => {
  console.error("[Worker Error]", err);
  return c.json({ error: err.message }, 500);
});

// Start the notification poller
startNotificationPoller();

const port = Number(process.env.PORT ?? 8092);
console.log(`mise-worker listening on :${port}`);

export default { port, fetch: app.fetch };
