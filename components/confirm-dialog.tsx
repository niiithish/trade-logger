"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { settleConfirm } from "@/lib/confirm-flow";

export interface ConfirmDialogProps {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  loading?: boolean;
  /** Called only when the user clicks the confirm action (via settleConfirm) */
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
  /** Destructive styling for delete / wipe actions */
  variant?: "default" | "destructive";
}

/**
 * Accessible confirmation modal for destructive or data-loss actions.
 * Built on the app Dialog primitive (Esc / overlay close = cancel).
 * All decisions route through settleConfirm so cancel/dismiss never run onConfirm.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const busy = loading || pending;

  async function handleConfirm() {
    setPending(true);
    try {
      await settleConfirm("confirm", onConfirm);
    } finally {
      setPending(false);
    }
  }

  function handleAbort(decision: "cancel" | "dismiss") {
    if (busy) {
      return;
    }
    // Explicitly settle as non-confirm so onConfirm is never invoked.
    void settleConfirm(decision, onConfirm);
    onOpenChange(false);
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        if (busy) {
          return;
        }
        if (!next) {
          // Overlay click / Esc — same gate as Cancel.
          void settleConfirm("dismiss", onConfirm);
        }
        onOpenChange(next);
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-0 bg-transparent">
          <Button
            disabled={busy}
            onClick={() => handleAbort("cancel")}
            type="button"
            variant="outline"
          >
            {cancelLabel}
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              void handleConfirm();
            }}
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
          >
            {busy ? (
              <>
                <Loader2Icon
                  className="animate-spin"
                  data-icon="inline-start"
                />
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
