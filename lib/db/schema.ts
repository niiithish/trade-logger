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
    chartImage: text("chart_image").notNull(),
    confluenceScore: integer("confluence_score").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
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
