"use server";

import { revalidatePath } from "next/cache";
import { createTrade, deleteTrade } from "@/lib/trades";
import type { Ticker } from "@/lib/types";

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
  return {
    anxietyLevel: asNumber(formData.get("anxietyLevel")),
    chartImage: asString(formData.get("chartImage")),
    confluenceScore: asNumber(formData.get("confluenceScore")),
    notesText: asString(formData.get("notesText")) || null,
    pnl: asNumber(formData.get("pnl")),
    positionSize: asNumber(formData.get("positionSize")),
    ticker: asString(formData.get("ticker")) as Ticker,
    voiceNote: asString(formData.get("voiceNote")) || null,
    voiceNoteMime: asString(formData.get("voiceNoteMime")) || null,
  };
}

function validateCreateTradeFields(
  fields: ReturnType<typeof parseCreateTradeFields>
): string | null {
  const {
    anxietyLevel,
    chartImage,
    confluenceScore,
    notesText,
    pnl,
    positionSize,
    ticker,
    voiceNote,
  } = fields;

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
    confluenceScore === null ||
    confluenceScore < 1 ||
    confluenceScore > 5 ||
    !Number.isInteger(confluenceScore)
  ) {
    return "Confluence score must be a whole number from 1 to 5.";
  }
  if (
    anxietyLevel === null ||
    anxietyLevel < 1 ||
    anxietyLevel > 10 ||
    !Number.isInteger(anxietyLevel)
  ) {
    return "Anxiety level must be a whole number from 1 to 10.";
  }
  if (!chartImage.startsWith("data:image/png")) {
    return "A PNG chart image is required.";
  }
  if (!(notesText || voiceNote)) {
    return "Add a text note or record a voice note.";
  }
  if (chartImage.length > 5_500_000) {
    return "Chart image is too large. Please use a smaller PNG.";
  }
  if (voiceNote && voiceNote.length > 8_000_000) {
    return "Voice note is too large. Keep recordings under ~1 minute.";
  }

  return null;
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
      confluenceScore,
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
      confluenceScore === null ||
      anxietyLevel === null
    ) {
      return fail("Invalid trade fields.");
    }

    const trade = await createTrade({
      anxietyLevel,
      chartImage,
      confluenceScore,
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
