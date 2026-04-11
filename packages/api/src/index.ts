import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth.js";
import { dbClient } from "./db/client.js";
import chatRoutes from "./routes/chat.js";
import cookRoutes from "./routes/cooks.js";
import pushRoutes from "./routes/push.js";

const app = new Hono();

const allowedOrigins = [
  "http://localhost:8080",
  ...(process.env.TRUSTED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? []),
];

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      if (allowedOrigins.includes(origin)) return origin;
      if (origin.startsWith("exp://")) return origin;
      return null;
    },
    credentials: true,
  }),
);

// Better Auth routes
app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

// Health check
app.get("/health", async (c) => {
  try {
    await dbClient`select 1`;
    return c.json({ ok: true, service: "mise-api" });
  } catch (error) {
    console.error("[API Health]", error);
    return c.json({ ok: false, service: "mise-api" }, 503);
  }
});

// API routes
app.route("/api/v1", chatRoutes);
app.route("/api/v1", cookRoutes);
app.route("/api/v1", pushRoutes);

// 404 fallback
app.notFound((c) => c.json({ error: "Not found" }, 404));

// Error handler
app.onError((err, c) => {
  console.error("[API Error]", err);
  return c.json({ error: "Internal server error" }, 500);
});

const port = Number(process.env.PORT ?? 8080);
console.log(`mise-api listening on :${port}`);

export default { port, fetch: app.fetch };
