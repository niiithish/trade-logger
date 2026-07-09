import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load the same Turso credentials Next.js uses
config({ path: ".env.local" });

function requireEnv(name: "DATABASE_TOKEN" | "DATABASE_URL") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for Drizzle database commands.`);
  }
  return value;
}

export default defineConfig({
  dbCredentials: {
    authToken: requireEnv("DATABASE_TOKEN"),
    url: requireEnv("DATABASE_URL"),
  },
  dialect: "turso",
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
});
