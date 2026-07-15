export function formatPnl(value: number): string {
  const abs = Math.abs(value).toLocaleString("en-US", {
    currency: "USD",
    style: "currency",
  });
  if (value > 0) {
    return `+${abs}`;
  }
  if (value < 0) {
    return `-${abs}`;
  }
  return abs;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function anxietyLabel(level: number): string {
  if (level <= 3) {
    return "Calm";
  }
  if (level <= 6) {
    return "Elevated";
  }
  if (level <= 8) {
    return "High";
  }
  return "Panic";
}

/** Text color class for P&L values (avoids nested ternaries in UI). */
export function pnlTextClass(pnl: number, destructiveLoss = false): string {
  if (pnl > 0) {
    return "text-emerald-400";
  }
  if (pnl < 0) {
    return destructiveLoss ? "text-destructive" : "text-red-400";
  }
  return "text-muted-foreground";
}

export function pnlBadgeVariant(
  pnl: number
): "default" | "destructive" | "secondary" {
  if (pnl > 0) {
    return "default";
  }
  if (pnl < 0) {
    return "destructive";
  }
  return "secondary";
}

export function anxietyTone(level: number): "ok" | "warn" | "danger" {
  if (level >= 7) {
    return "danger";
  }
  if (level >= 4) {
    return "warn";
  }
  return "ok";
}

/** Local calendar day key YYYY-MM-DD */
export function toDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayKeyToDate(dayKey: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dateToDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Value for `<input type="datetime-local" />` from an ISO timestamp (local tz). */
export function toDatetimeLocalValue(isoOrDate: string | Date = new Date()): string {
  const d =
    typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) {
    return toDatetimeLocalValue(new Date());
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

/**
 * Parse datetime-local form value into ISO string.
 * Returns null when empty or invalid.
 */
export function fromDatetimeLocalValue(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString();
}
