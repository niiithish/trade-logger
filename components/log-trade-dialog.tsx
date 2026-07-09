"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { TradeForm } from "@/components/trade-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LogTradeDialogContextValue {
  openDialog: () => void;
}

const LogTradeDialogContext = createContext<LogTradeDialogContextValue | null>(
  null
);

export function useLogTradeDialog() {
  const context = useContext(LogTradeDialogContext);
  if (!context) {
    throw new Error("useLogTradeDialog must be used within LogTradeProvider.");
  }
  return context;
}

export function LogTradeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(
    () => ({
      openDialog: () => setOpen(true),
    }),
    []
  );

  return (
    <LogTradeDialogContext.Provider value={value}>
      {children}
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent
          className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-md"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Log trade</DialogTitle>
            <DialogDescription>
              Step through ticker, result, chart, HRI, and notes.
            </DialogDescription>
          </DialogHeader>
          <TradeForm
            onSaved={() => {
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </LogTradeDialogContext.Provider>
  );
}

export function LogTradeButton({
  children = "Log trade",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { openDialog } = useLogTradeDialog();

  return (
    <Button onClick={openDialog} type="button" {...props}>
      {children}
    </Button>
  );
}
