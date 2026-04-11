import * as schema from "./schema.js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const url = process.env.DATABASE_URL!;
if (!url) throw new Error("DATABASE_URL environment variable is not set");

export const dbClient = postgres(url);
export const db = drizzle(dbClient, { schema });

export type DB = typeof db;
