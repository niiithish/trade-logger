/**
 * Shared confirmation gates used by ConfirmDialog, log-form Reset, and delete.
 * Tests drive these same functions — they are the real shipped entry points.
 */

export type ConfirmDecision = "confirm" | "cancel" | "dismiss";

/**
 * Resolve a confirm-dialog decision.
 * Only an explicit "confirm" runs `action`. Cancel and dismiss never invoke it.
 * ConfirmDialog uses this for confirm / cancel / overlay-close (dismiss).
 */
export async function settleConfirm(
  decision: ConfirmDecision,
  action: () => void | Promise<void>
): Promise<"ran" | "skipped"> {
  if (decision !== "confirm") {
    return "skipped";
  }
  await action();
  return "ran";
}

/**
 * Log-form Reset entry.
 * Pristine form clears immediately; dirty form only opens the confirm modal.
 */
export function beginFormReset(options: {
  dirty: boolean;
  reset: () => void;
  openConfirm: () => void;
}): "cleared" | "confirm_required" {
  if (!options.dirty) {
    options.reset();
    return "cleared";
  }
  options.openConfirm();
  return "confirm_required";
}

/**
 * Delete entry for trades list + detail.
 * Never deletes; only opens the confirmation surface.
 */
export function beginDeleteTrade(openConfirm: () => void): "confirm_required" {
  openConfirm();
  return "confirm_required";
}
