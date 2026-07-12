/** Direction, exit outcomes, partials, and mistake tags for trade logging. */

export const DIRECTIONS = ["long", "short"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const MANAGEMENT_STYLES = ["full", "partials"] as const;
export type ManagementStyle = (typeof MANAGEMENT_STYLES)[number];

export const EXIT_OUTCOMES = [
  "sl_initial",
  "tp1_then_sl",
  "tp1_be_sl",
  "tp1_tp2",
  "full_tp",
  "runner_tp",
  "manual_flat",
  "other",
] as const;
export type ExitOutcome = (typeof EXIT_OUTCOMES)[number];

export const AFTER_TP1_STOPS = ["held", "breakeven", "trail"] as const;
export type AfterTp1Stop = (typeof AFTER_TP1_STOPS)[number];

export const MISTAKE_TAGS = [
  "fomo",
  "early_entry",
  "moved_sl_wider",
  "revenge",
  "oversized",
  "ignored_plan",
  "late_exit",
  "other",
] as const;
export type MistakeTag = (typeof MISTAKE_TAGS)[number];

export const EXIT_OUTCOME_OPTIONS: {
  description: string;
  id: ExitOutcome;
  label: string;
}[] = [
  {
    description: "Stopped before any take-profit",
    id: "sl_initial",
    label: "SL initial",
  },
  {
    description: "Took TP1, remainder hit stop",
    id: "tp1_then_sl",
    label: "TP1 → SL",
  },
  {
    description: "TP1, SL to BE, stopped at BE",
    id: "tp1_be_sl",
    label: "TP1 → BE",
  },
  {
    description: "Hit TP1 and TP2 / plan targets",
    id: "tp1_tp2",
    label: "TP1 + TP2",
  },
  {
    description: "Full position to final target",
    id: "full_tp",
    label: "Full TP",
  },
  {
    description: "Runner reached final TP",
    id: "runner_tp",
    label: "Runner TP",
  },
  {
    description: "Flattened manually / discretionary",
    id: "manual_flat",
    label: "Manual flat",
  },
  {
    description: "Other / multi-leg story in notes",
    id: "other",
    label: "Other",
  },
];

export const AFTER_TP1_OPTIONS: { id: AfterTp1Stop; label: string }[] = [
  { id: "held", label: "SL held" },
  { id: "breakeven", label: "Moved to BE" },
  { id: "trail", label: "Trailed" },
];

export const MISTAKE_TAG_OPTIONS: { id: MistakeTag; label: string }[] = [
  { id: "fomo", label: "FOMO" },
  { id: "early_entry", label: "Early entry" },
  { id: "moved_sl_wider", label: "Moved SL wider" },
  { id: "revenge", label: "Revenge" },
  { id: "oversized", label: "Oversized" },
  { id: "ignored_plan", label: "Ignored plan" },
  { id: "late_exit", label: "Late exit" },
  { id: "other", label: "Other" },
];

export function isDirection(value: unknown): value is Direction {
  return value === "long" || value === "short";
}

export function isManagementStyle(value: unknown): value is ManagementStyle {
  return value === "full" || value === "partials";
}

export function isExitOutcome(value: unknown): value is ExitOutcome {
  return (
    typeof value === "string" &&
    (EXIT_OUTCOMES as readonly string[]).includes(value)
  );
}

export function isAfterTp1Stop(value: unknown): value is AfterTp1Stop {
  return (
    typeof value === "string" &&
    (AFTER_TP1_STOPS as readonly string[]).includes(value)
  );
}

export function isMistakeTag(value: unknown): value is MistakeTag {
  return (
    typeof value === "string" &&
    (MISTAKE_TAGS as readonly string[]).includes(value)
  );
}

export function directionLabel(
  direction: Direction | null | undefined
): string {
  if (direction === "long") {
    return "Long";
  }
  if (direction === "short") {
    return "Short";
  }
  return "—";
}

export function exitOutcomeLabel(
  outcome: ExitOutcome | null | undefined
): string {
  if (!outcome) {
    return "—";
  }
  return EXIT_OUTCOME_OPTIONS.find((o) => o.id === outcome)?.label ?? outcome;
}

export function afterTp1StopLabel(
  stop: AfterTp1Stop | null | undefined
): string {
  if (!stop) {
    return "—";
  }
  return AFTER_TP1_OPTIONS.find((o) => o.id === stop)?.label ?? stop;
}

export function mistakeTagLabel(tag: MistakeTag): string {
  return MISTAKE_TAG_OPTIONS.find((t) => t.id === tag)?.label ?? tag;
}

export function serializeMistakeTags(tags: MistakeTag[]): string {
  return JSON.stringify(tags.filter(isMistakeTag));
}

export function parseMistakeTags(raw: string | null | undefined): MistakeTag[] {
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

/**
 * Validate management fields before save.
 * Full exits need only outcome; partials may include TP1 size + after-TP1 stop.
 */
export function validateTradeManagement(input: {
  afterTp1Stop?: AfterTp1Stop | null;
  exitOutcome: ExitOutcome | null | undefined;
  managementStyle: ManagementStyle | null | undefined;
  tp1Contracts?: number | null;
}): string | null {
  if (!(input.managementStyle && isManagementStyle(input.managementStyle))) {
    return "Select full exit or partials.";
  }
  if (!(input.exitOutcome && isExitOutcome(input.exitOutcome))) {
    return "Select an exit outcome.";
  }
  if (input.managementStyle === "partials") {
    if (
      typeof input.tp1Contracts === "number" &&
      !(Number.isFinite(input.tp1Contracts) && input.tp1Contracts > 0)
    ) {
      return "TP1 size must be greater than 0 when set.";
    }
    if (
      typeof input.afterTp1Stop === "string" &&
      !isAfterTp1Stop(input.afterTp1Stop)
    ) {
      return "Invalid after-TP1 stop setting.";
    }
  }
  return null;
}

/** Partials path is optional: full exit with outcome only is always valid. */
export function isValidFullExitPath(
  managementStyle: ManagementStyle,
  exitOutcome: ExitOutcome
): boolean {
  return (
    managementStyle === "full" &&
    isExitOutcome(exitOutcome) &&
    validateTradeManagement({ exitOutcome, managementStyle }) === null
  );
}
