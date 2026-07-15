"use server";

import { revalidatePath } from "next/cache";
import { type AccountId, isAccountId } from "@/lib/accounts";
import { chartImageValidationError } from "@/lib/chart-image";
import {
  MAX_CONFLUENCE_SCORE,
  parseConfluenceChecklist,
  scoreConfluence,
  validateConfluenceChecklist,
} from "@/lib/confluence";
import {
  type AfterTp1Stop,
  type Direction,
  type ExitOutcome,
  isAfterTp1Stop,
  isDirection,
  isExitOutcome,
  isManagementStyle,
  isMistakeTag,
  type ManagementStyle,
  type MistakeTag,
  validateTradeManagement,
} from "@/lib/trade-management";
import { fromDatetimeLocalValue } from "@/lib/format";
import { createTrade, deleteTrade, updateTrade } from "@/lib/trades";
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
    revalidatePath(`/trades/${id}/edit`);
  }
}

function parseMistakeTagsField(raw: string): MistakeTag[] {
  if (!raw) {
    return [];
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) {
      return [];
    }
    return data.filter(isMistakeTag);
  } catch {
    return [];
  }
}

function parseCreateTradeFields(formData: FormData) {
  const chartModeRaw = asString(formData.get("chartMode"));
  const chartMode: ChartImageMode =
    chartModeRaw === "entry_exit" ? "entry_exit" : "single";
  const checklistRaw = asString(formData.get("confluenceChecklist"));
  const confluenceChecklist = parseConfluenceChecklist(checklistRaw);
  const accountRaw = asString(formData.get("accountId"));
  const directionRaw = asString(formData.get("direction"));
  const managementRaw = asString(formData.get("managementStyle"));
  const outcomeRaw = asString(formData.get("exitOutcome"));
  const afterTp1Raw = asString(formData.get("afterTp1Stop"));

  const tradeDateRaw = asString(formData.get("tradeDate"));
  const createdAt =
    fromDatetimeLocalValue(tradeDateRaw) ??
    (tradeDateRaw ? null : new Date().toISOString());

  return {
    accountId: isAccountId(accountRaw) ? accountRaw : null,
    afterTp1Stop: isAfterTp1Stop(afterTp1Raw) ? afterTp1Raw : null,
    anxietyLevel: asNumber(formData.get("anxietyLevel")),
    chartImage: asString(formData.get("chartImage")),
    chartMode,
    confluenceChecklist,
    createdAt,
    direction: isDirection(directionRaw) ? directionRaw : null,
    exitImage: asString(formData.get("exitImage")) || null,
    exitOutcome: isExitOutcome(outcomeRaw) ? outcomeRaw : null,
    managementStyle: isManagementStyle(managementRaw) ? managementRaw : null,
    mistakeTags: parseMistakeTagsField(asString(formData.get("mistakeTags"))),
    notesText: asString(formData.get("notesText")) || null,
    plannedR: asNumber(formData.get("plannedR")),
    pnl: asNumber(formData.get("pnl")),
    positionSize: asNumber(formData.get("positionSize")),
    realizedR: asNumber(formData.get("realizedR")),
    ticker: asString(formData.get("ticker")) as Ticker,
    tradeDateRaw,
    tp1Contracts: asNumber(formData.get("tp1Contracts")),
    voiceNote: asString(formData.get("voiceNote")) || null,
    voiceNoteMime: asString(formData.get("voiceNoteMime")) || null,
  };
}

function validateTradeCoreFields(
  fields: ReturnType<typeof parseCreateTradeFields>
): string | null {
  const {
    accountId,
    anxietyLevel,
    direction,
    exitOutcome,
    managementStyle,
    pnl,
    positionSize,
    ticker,
  } = fields;

  if (!(accountId && isAccountId(accountId))) {
    return "Select a trading account (Lucid A or Lucid B).";
  }
  if (ticker !== "MNQ" && ticker !== "MES") {
    return "Ticker must be MNQ or MES.";
  }
  if (!(direction && isDirection(direction))) {
    return "Select long or short.";
  }
  if (pnl === null) {
    return "P&L is required.";
  }
  if (positionSize === null || positionSize <= 0) {
    return "Position size must be greater than 0.";
  }
  if (fields.tradeDateRaw && !fields.createdAt) {
    return "Trade date is invalid.";
  }
  if (!fields.createdAt) {
    return "Trade date is required (use it to backfill a missed day).";
  }
  if (
    anxietyLevel === null ||
    anxietyLevel < 1 ||
    anxietyLevel > 10 ||
    !Number.isInteger(anxietyLevel)
  ) {
    return "Anxiety level must be a whole number from 1 to 10.";
  }
  const managementError = validateTradeManagement({
    afterTp1Stop: fields.afterTp1Stop,
    exitOutcome,
    managementStyle,
    tp1Contracts: fields.tp1Contracts,
  });
  if (managementError) {
    return managementError;
  }
  return null;
}

function validateTradeMediaFields(
  fields: ReturnType<typeof parseCreateTradeFields>,
  options?: { requireChart?: boolean; requireNotes?: boolean }
): string | null {
  const { chartImage, chartMode, exitImage, notesText, voiceNote } = fields;
  const requireChart = options?.requireChart ?? true;
  const requireNotes = options?.requireNotes ?? true;

  if (requireChart) {
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
  }

  if (requireNotes && !(notesText || voiceNote)) {
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

function toTradeInput(fields: ReturnType<typeof parseCreateTradeFields>) {
  const {
    accountId,
    afterTp1Stop,
    anxietyLevel,
    chartImage,
    chartMode,
    confluenceChecklist,
    direction,
    exitImage,
    exitOutcome,
    managementStyle,
    mistakeTags,
    notesText,
    plannedR,
    pnl,
    positionSize,
    realizedR,
    ticker,
    tp1Contracts,
    voiceNote,
    voiceNoteMime,
  } = fields;

  if (
    pnl === null ||
    positionSize === null ||
    anxietyLevel === null ||
    !confluenceChecklist ||
    !accountId ||
    !direction ||
    !managementStyle ||
    !exitOutcome
  ) {
    return null;
  }

  return {
    accountId: accountId as AccountId,
    afterTp1Stop: afterTp1Stop as AfterTp1Stop | null,
    anxietyLevel,
    chartImage,
    confluenceChecklist,
    confluenceScore: scoreConfluence(confluenceChecklist),
    createdAt: fields.createdAt ?? undefined,
    direction: direction as Direction,
    exitImage: chartMode === "entry_exit" ? exitImage : null,
    exitOutcome: exitOutcome as ExitOutcome,
    managementStyle: managementStyle as ManagementStyle,
    mistakeTags,
    notesText,
    plannedR,
    pnl,
    positionSize,
    realizedR,
    ticker,
    tp1Contracts,
    voiceNote,
    voiceNoteMime,
  };
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

    const input = toTradeInput(fields);
    if (!input) {
      return fail("Invalid trade fields.");
    }

    const trade = await createTrade(input);
    revalidateTradePaths(trade.id);
    return { id: trade.id, success: true };
  } catch (error) {
    console.error("createTradeAction failed:", error);
    return fail(
      error instanceof Error ? error.message : "Failed to save trade."
    );
  }
}

export async function updateTradeAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    if (!id) {
      return fail("Trade id is required.");
    }
    const fields = parseCreateTradeFields(formData);
    // Edit may keep existing voice; notes still required as text OR existing voice via form.
    const validationError =
      validateTradeCoreFields(fields) ??
      validateTradeConfluenceFields(fields) ??
      validateTradeMediaFields(fields, {
        requireChart: Boolean(fields.chartImage),
        requireNotes: true,
      });
    if (validationError) {
      return fail(validationError);
    }

    const input = toTradeInput(fields);
    if (!input) {
      return fail("Invalid trade fields.");
    }

    // If chart not re-sent empty path shouldn't happen; chart is always in form.
    if (!fields.chartImage) {
      return fail("Chart image is required.");
    }

    const trade = await updateTrade(id, input);
    if (!trade) {
      return fail("Trade not found.");
    }
    revalidateTradePaths(trade.id);
    return { id: trade.id, success: true };
  } catch (error) {
    console.error("updateTradeAction failed:", error);
    return fail(
      error instanceof Error ? error.message : "Failed to update trade."
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
