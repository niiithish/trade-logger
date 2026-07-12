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
    // Lucid eval account: lucid_a | lucid_b (null = legacy unassigned).
    accountId: text("account_id"),
    // After TP1: held | breakeven | trail (partials only).
    afterTp1Stop: text("after_tp1_stop"),
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
    // long | short (null = legacy).
    direction: text("direction"),
    // Optional exit chart when logging entry + exit separately.
    exitImage: text("exit_image"),
    // Exit story: sl_initial | tp1_then_sl | tp1_be_sl | tp1_tp2 | full_tp | …
    exitOutcome: text("exit_outcome"),
    id: text("id").primaryKey(),
    // full | partials (null = legacy).
    managementStyle: text("management_style"),
    // JSON array of mistake tag ids.
    mistakeTags: text("mistake_tags"),
    notesText: text("notes_text"),
    plannedR: real("planned_r"),
    pnl: real("pnl").notNull(),
    positionSize: real("position_size").notNull(),
    realizedR: real("realized_r"),
    ticker: text("ticker", { enum: ["MNQ", "MES"] }).notNull(),
    // Contracts taken at TP1 when using partials.
    tp1Contracts: real("tp1_contracts"),
    voiceNote: text("voice_note"),
    voiceNoteMime: text("voice_note_mime"),
  },
  (table) => [
    index("idx_trades_created_at").on(table.createdAt),
    index("idx_trades_account_id").on(table.accountId),
  ]
);

export type TradeRow = typeof trades.$inferSelect;
export type NewTradeRow = typeof trades.$inferInsert;
