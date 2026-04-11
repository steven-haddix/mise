import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────────────────────

export const cookStatusEnum = pgEnum("cook_status", [
  "planning",
  "active",
  "completed",
  "cancelled",
]);

export const stepStatusEnum = pgEnum("step_status", [
  "pending",
  "notified",
  "completed",
  "skipped",
]);

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

// ── USERS (Better Auth managed) ────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  emailVerified: text("email_verified").notNull().default("false"),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── SESSIONS (Better Auth) ─────────────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── ACCOUNTS (Better Auth — OAuth) ─────────────────────────────────────────

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── VERIFICATIONS (Better Auth) ────────────────────────────────────────────

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── CONVERSATIONS ──────────────────────────────────────────────────────────

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    title: text("title"),
    cookId: uuid("cook_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_conversations_user").on(t.userId),
  }),
);

// ── MESSAGES ───────────────────────────────────────────────────────────────

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    toolCalls: jsonb("tool_calls"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    conversationIdx: index("idx_messages_conversation").on(t.conversationId),
  }),
);

// ── COOKS ──────────────────────────────────────────────────────────────────

export const cooks = pgTable(
  "cooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id),
    title: text("title").notNull(),
    targetTime: timestamp("target_time", { withTimezone: true }).notNull(),
    status: cookStatusEnum("status").notNull().default("planning"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_cooks_user").on(t.userId),
    statusIdx: index("idx_cooks_status").on(t.status),
  }),
);

// ── COOK STEPS ─────────────────────────────────────────────────────────────

export const cookSteps = pgTable(
  "cook_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cookId: uuid("cook_id")
      .notNull()
      .references(() => cooks.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: stepStatusEnum("status").notNull().default("pending"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    cookIdx: index("idx_cook_steps_cook").on(t.cookId),
    pendingIdx: index("idx_cook_steps_pending").on(t.scheduledAt, t.status),
  }),
);

// ── PUSH TOKENS ────────────────────────────────────────────────────────────

export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    token: text("token").notNull(),
    deviceId: text("device_id").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_push_tokens_user").on(t.userId),
  }),
);

// ── RELATIONS ──────────────────────────────────────────────────────────────

export const conversationsRelations = relations(conversations, ({ many, one }) => ({
  messages: many(messages),
  cook: one(cooks, { fields: [conversations.cookId], references: [cooks.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const cooksRelations = relations(cooks, ({ many, one }) => ({
  steps: many(cookSteps),
  conversation: one(conversations, {
    fields: [cooks.conversationId],
    references: [conversations.id],
  }),
}));

export const cookStepsRelations = relations(cookSteps, ({ one }) => ({
  cook: one(cooks, { fields: [cookSteps.cookId], references: [cooks.id] }),
}));
