"use server";

import { revalidatePath } from "next/cache";
import { chartImageValidationError } from "@/lib/chart-image";
import {
  MAX_CONFLUENCE_SCORE,
  parseConfluenceChecklist,
  scoreConfluence,
  validateConfluenceChecklist,
} from "@/lib/confluence";
import { createTrade, deleteTrade } from "@/lib/trades";
import type { ChartImageMode, Ticker } from "@/lib/types";

export type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fail(error: string): ActionResult {
  return { error, success: false };
}

function revalidateTradePaths(id?: string) {
  revalidatePath("/");
  revalidatePath("/trades");
  revalidatePath("/calendar");
  if (id) {
    revalidatePath(`/trades/${id}`);
  }
}

function parseCreateTradeFields(formData: FormData) {
  const chartModeRaw = asString(formData.get("chartMode"));
  const chartMode: ChartImageMode =
    chartModeRaw === "entry_exit" ? "entry_exit" : "single";
  const checklistRaw = asString(formData.get("confluenceChecklist"));
  const confluenceChecklist = parseConfluenceChecklist(checklistRaw);

  return {
    anxietyLevel: asNumber(formData.get("anxietyLevel")),
    chartImage: asString(formData.get("chartImage")),
    chartMode,
    confluenceChecklist,
    exitImage: asString(formData.get("exitImage")) || null,
    notesText: asString(formData.get("notesText")) || null,
    pnl: asNumber(formData.get("pnl")),
    positionSize: asNumber(formData.get("positionSize")),
    ticker: asString(formData.get("ticker")) as Ticker,
    voiceNote: asString(formData.get("voiceNote")) || null,
    voiceNoteMime: asString(formData.get("voiceNoteMime")) || null,
  };
}

function validateTradeCoreFields(
  fields: ReturnType<typeof parseCreateTradeFields>
): string | null {
  const { anxietyLevel, pnl, positionSize, ticker } = fields;

  if (ticker !== "MNQ" && ticker !== "MES") {
    return "Ticker must be MNQ or MES.";
  }
  if (pnl === null) {
    return "P&L is required.";
  }
  if (positionSize === null || positionSize <= 0) {
    return "Position size must be greater than 0.";
  }
  if (
    anxietyLevel === null ||
    anxietyLevel < 1 ||
    anxietyLevel > 10 ||
    !Number.isInteger(anxietyLevel)
  ) {
    return "Anxiety level must be a whole number from 1 to 10.";
  }
  return null;
}

function validateTradeMediaFields(
  fields: ReturnType<typeof parseCreateTradeFields>
): string | null {
  const { chartImage, chartMode, exitImage, notesText, voiceNote } = fields;

  const primaryLabel =
    chartMode === "entry_exit" ? "Entry chart image" : "Chart image";
  const chartError = chartImageValidationError(chartImage, primaryLabel);
  if (chartError) {
    return chartError;
  }

  if (chartMode === "entry_exit") {
    const exitError = chartImageValidationError(
      exitImage ?? "",
      "Exit chart image"
    );
    if (exitError) {
      return exitError;
    }
  } else if (exitImage) {
    return "Remove the exit image or switch to Entry + Exit mode.";
  }

  if (!(notesText || voiceNote)) {
    return "Add a text note or record a voice note.";
  }
  if (voiceNote && voiceNote.length > 8_000_000) {
    return "Voice note is too large. Keep recordings under ~1 minute.";
  }
  return null;
}

function validateTradeConfluenceFields(
  fields: ReturnType<typeof parseCreateTradeFields>
): string | null {
  const { confluenceChecklist } = fields;
  if (!confluenceChecklist) {
    return "Confluence checklist is required.";
  }
  const checklistError = validateConfluenceChecklist(confluenceChecklist);
  if (checklistError) {
    return checklistError;
  }
  const score = scoreConfluence(confluenceChecklist);
  if (score < 0 || score > MAX_CONFLUENCE_SCORE) {
    return `Confluence score must be between 0 and ${MAX_CONFLUENCE_SCORE}.`;
  }
  return null;
}

function validateCreateTradeFields(
  fields: ReturnType<typeof parseCreateTradeFields>
): string | null {
  return (
    validateTradeCoreFields(fields) ??
    validateTradeConfluenceFields(fields) ??
    validateTradeMediaFields(fields)
  );
}

export async function createTradeAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const fields = parseCreateTradeFields(formData);
    const validationError = validateCreateTradeFields(fields);
    if (validationError) {
      return fail(validationError);
    }

    const {
      anxietyLevel,
      chartImage,
      chartMode,
      confluenceChecklist,
      exitImage,
      notesText,
      pnl,
      positionSize,
      ticker,
      voiceNote,
      voiceNoteMime,
    } = fields;

    // Validated above — narrow for the type checker.
    if (
      pnl === null ||
      positionSize === null ||
      anxietyLevel === null ||
      !confluenceChecklist
    ) {
      return fail("Invalid trade fields.");
    }

    const trade = await createTrade({
      anxietyLevel,
      chartImage,
      confluenceChecklist,
      confluenceScore: scoreConfluence(confluenceChecklist),
      exitImage: chartMode === "entry_exit" ? exitImage : null,
      notesText,
      pnl,
      positionSize,
      ticker,
      voiceNote,
      voiceNoteMime,
    });

    revalidateTradePaths(trade.id);
    return { id: trade.id, success: true };
  } catch (error) {
    console.error("createTradeAction failed:", error);
    return fail(
      error instanceof Error ? error.message : "Failed to save trade."
    );
  }
}

export async function deleteTradeAction(id: string): Promise<ActionResult> {
  try {
    if (!id) {
      return fail("Trade id is required.");
    }
    await deleteTrade(id);
    revalidateTradePaths(id);
    return { id, success: true };
  } catch (error) {
    console.error("deleteTradeAction failed:", error);
    return fail(
      error instanceof Error ? error.message : "Failed to delete trade."
    );
  }
}
