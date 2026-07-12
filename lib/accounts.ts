/** Seeded Lucid eval accounts for the personal journal. */

export const ACCOUNT_IDS = ["lucid_a", "lucid_b"] as const;

export type AccountId = (typeof ACCOUNT_IDS)[number];

export interface TradingAccount {
  dailyLossBudget: number | null;
  id: AccountId;
  label: string;
  phase: "eval" | "funded";
  shortLabel: string;
  startingBalance: number;
}

export const TRADING_ACCOUNTS: readonly TradingAccount[] = [
  {
    dailyLossBudget: 1000,
    id: "lucid_a",
    label: "Lucid A · $50,900",
    phase: "eval",
    shortLabel: "Lucid A",
    startingBalance: 50_900,
  },
  {
    dailyLossBudget: 1000,
    id: "lucid_b",
    label: "Lucid B · $50,000",
    phase: "eval",
    shortLabel: "Lucid B",
    startingBalance: 50_000,
  },
] as const;

export const DEFAULT_ACCOUNT_ID: AccountId = "lucid_a";

export function isAccountId(value: unknown): value is AccountId {
  return value === "lucid_a" || value === "lucid_b";
}

export function getAccount(id: AccountId | null | undefined): TradingAccount {
  const found = TRADING_ACCOUNTS.find((a) => a.id === id);
  return found ?? TRADING_ACCOUNTS[0];
}

export function accountLabel(id: AccountId | null | undefined): string {
  if (!id) {
    return "Unassigned";
  }
  return getAccount(id).shortLabel;
}

export function parseAccountId(
  value: string | null | undefined
): AccountId | null {
  if (!value) {
    return null;
  }
  return isAccountId(value) ? value : null;
}
