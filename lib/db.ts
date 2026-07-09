import { type Client, createClient } from "@libsql/client";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

export function getDb() {
  if (client) {
    return client;
  }

  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_TOKEN;

  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  client = createClient({
    authToken,
    url,
  });

  return client;
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb();
      await db.execute(`
        CREATE TABLE IF NOT EXISTS trades (
          id TEXT PRIMARY KEY,
          ticker TEXT NOT NULL CHECK (ticker IN ('MNQ', 'MES')),
          pnl REAL NOT NULL,
          position_size REAL NOT NULL,
          confluence_score INTEGER NOT NULL CHECK (confluence_score BETWEEN 1 AND 5),
          anxiety_level INTEGER NOT NULL CHECK (anxiety_level BETWEEN 1 AND 10),
          chart_image TEXT NOT NULL,
          notes_text TEXT,
          voice_note TEXT,
          voice_note_mime TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC)
      `);
    })();
  }

  await schemaReady;
}
