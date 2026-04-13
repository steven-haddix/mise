import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { bearer } from "better-auth/plugins/bearer";
import { db } from "./db/client.js";
import * as schema from "./db/schema.js";

const trustedOrigins = [
  "http://localhost:8090",
  ...(process.env.TRUSTED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? []),
];

export const auth = betterAuth({
  appName: "Mise",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:8090",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
    skipStateCookieCheck: process.env.NODE_ENV !== "production",
  },
  trustedOrigins: [
    ...new Set([...trustedOrigins, "mise://", "mise-local://", "mise-dev://", "exp://**"]),
  ],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [expo(), bearer()],
});

export type Auth = typeof auth;
