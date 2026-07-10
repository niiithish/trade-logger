import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const trades = sqliteTable(
  "trades",
  {
    anxietyLevel: integer("anxiety_level").notNull(),
    // Primary chart: single-image trades, or entry chart when exitImage is set.
    chartImage: text("chart_image").notNull(),
    // JSON checklist that produced confluenceScore (null on legacy slider trades).
    confluenceChecklist: text("confluence_checklist"),
    // Points from checklist (0–6) or legacy slider (1–5).
    confluenceScore: integer("confluence_score").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    // Optional exit chart when logging entry + exit separately.
    exitImage: text("exit_image"),
    id: text("id").primaryKey(),
    notesText: text("notes_text"),
    pnl: real("pnl").notNull(),
    positionSize: real("position_size").notNull(),
    ticker: text("ticker", { enum: ["MNQ", "MES"] }).notNull(),
    voiceNote: text("voice_note"),
    voiceNoteMime: text("voice_note_mime"),
  },
  (table) => [index("idx_trades_created_at").on(table.createdAt)]
);

export type TradeRow = typeof trades.$inferSelect;
export type NewTradeRow = typeof trades.$inferInsert;
