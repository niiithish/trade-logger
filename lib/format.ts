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
export function toDatetimeLocalValue(
  isoOrDate: string | Date = new Date()
): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
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

const DATETIME_LOCAL_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Parse a datetime-local wall-clock string into ISO UTC.
 *
 * IMPORTANT: Never use `new Date("YYYY-MM-DDTHH:mm")` on the server — Node/Vercel
 * treat that as *server local* (UTC on Vercel), which shifts the calendar day for
 * users ahead of UTC (e.g. IST). Always pass the browser's `getTimezoneOffset()`.
 *
 * @param offsetMinutes - `Date#getTimezoneOffset()` from the client
 *   (minutes to add to local to get UTC; IST = -330).
 */
export function fromDatetimeLocalValue(
  raw: string,
  offsetMinutes: number = 0
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const match = DATETIME_LOCAL_RE.exec(trimmed);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] ? Number(match[6]) : 0;
  if (
    ![year, month, day, hour, minute, second].every((n) => Number.isFinite(n))
  ) {
    return null;
  }
  // Wall-clock components as if UTC, then apply client offset → real UTC.
  // UTC = local + offset  (offset = UTC - local in minutes).
  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, second) +
    offsetMinutes * 60_000;
  const result = new Date(utcMs);
  if (Number.isNaN(result.getTime())) {
    return null;
  }
  return result.toISOString();
}

/**
 * Fix a timestamp that was stored by treating a local wall-clock as UTC
 * (the Vercel datetime-local bug). Reinterprets the UTC Y-M-D H:M as local
 * wall-clock in the given offset.
 */
export function reinterpretUtcWallClockAsLocal(
  iso: string,
  offsetMinutes: number
): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const wall = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
  return fromDatetimeLocalValue(wall, offsetMinutes);
}
