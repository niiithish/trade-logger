"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type AccountId,
  DEFAULT_ACCOUNT_ID,
  isAccountId,
  TRADING_ACCOUNTS,
} from "@/lib/accounts";
import type { AccountFilter } from "@/lib/types";

const STORAGE_KEY = "trade-logger:account-filter";

interface AccountFilterContextValue {
  account: AccountFilter;
  /** Account to prefill on log form (never "all"). */
  preferredAccountId: AccountId;
  setAccount: (account: AccountFilter) => void;
}

const AccountFilterContext = createContext<AccountFilterContextValue | null>(
  null
);

function readStoredAccount(): AccountFilter {
  if (typeof window === "undefined") {
    return "all";
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "all" || isAccountId(raw)) {
      return raw;
    }
  } catch {
    // ignore storage failures
  }
  return "all";
}

export function AccountFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [account, setAccountState] = useState<AccountFilter>("all");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAccountState(readStoredAccount());
    setHydrated(true);
  }, []);

  const setAccount = useCallback((next: AccountFilter) => {
    setAccountState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<AccountFilterContextValue>(
    () => ({
      account: hydrated ? account : "all",
      preferredAccountId:
        account === "all" || !isAccountId(account)
          ? DEFAULT_ACCOUNT_ID
          : account,
      setAccount,
    }),
    [account, hydrated, setAccount]
  );

  return (
    <AccountFilterContext.Provider value={value}>
      {children}
    </AccountFilterContext.Provider>
  );
}

export function useAccountFilter(): AccountFilterContextValue {
  const ctx = useContext(AccountFilterContext);
  if (!ctx) {
    throw new Error(
      "useAccountFilter must be used within AccountFilterProvider"
    );
  }
  return ctx;
}

/** Header control: All | Lucid A | Lucid B */
export function AccountSwitcher({ className }: { className?: string }) {
  const { account, setAccount } = useAccountFilter();

  return (
    <Select
      onValueChange={(v) => {
        if (v === "all" || isAccountId(v)) {
          setAccount(v);
        }
      }}
      value={account}
    >
      <SelectTrigger
        className={className ?? "h-8 w-[8.75rem] shrink-0"}
        size="sm"
      >
        <SelectValue placeholder="Account" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="all">All accounts</SelectItem>
        {TRADING_ACCOUNTS.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.shortLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
