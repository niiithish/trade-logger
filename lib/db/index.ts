import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { trades } from "@/lib/db/schema";

function requireEnv(name: "DATABASE_URL" | "DATABASE_TOKEN") {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env.local for your Turso database.`
    );
  }
  return value;
}

const client = createClient({
  authToken: requireEnv("DATABASE_TOKEN"),
  url: requireEnv("DATABASE_URL"),
});

export const db = drizzle(client, { schema: { trades } });

export type Db = typeof db;
