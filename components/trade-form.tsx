"use client";

import {
  CheckIcon,
  ClipboardPasteIcon,
  ImagePlusIcon,
  Loader2Icon,
  MicIcon,
  SquareIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type DragEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { createTradeAction, updateTradeAction } from "@/app/actions/trades";
import { useAccountFilter } from "@/components/account-filter";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ConfluenceChecklistFields } from "@/components/confluence-checklist";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DialogClose } from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { type AccountId, TRADING_ACCOUNTS } from "@/lib/accounts";
import { fileToChartDataUrl } from "@/lib/chart-image";
import { beginFormReset } from "@/lib/confirm-flow";
import {
  type ConfluenceChecklist,
  serializeConfluenceChecklist,
  validateConfluenceChecklist,
} from "@/lib/confluence";
import {
  DEFAULT_TRADE_FORM,
  defaultTradeDateValue,
  isChartStepComplete,
  isManagementStepComplete,
  isResultStepComplete,
  isTradeFormDirty,
  type TradeFormSnapshot,
  tradeFormSnapshotFromTrade,
} from "@/lib/trade-form-state";
import {
  AFTER_TP1_OPTIONS,
  type AfterTp1Stop,
  type Direction,
  EXIT_OUTCOME_OPTIONS,
  type ExitOutcome,
  isMistakeTag,
  type ManagementStyle,
  MISTAKE_TAG_OPTIONS,
  type MistakeTag,
} from "@/lib/trade-management";
import type { ChartImageMode, Ticker, Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const { result } = reader;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to encode recording."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read recording."));
    reader.readAsDataURL(blob);
  });
}

function firstSliderValue(value: number | readonly number[]): number {
  if (typeof value === "number") {
    return value;
  }
  return value[0] ?? 3;
}

type TradeStepId =
  | "contract"
  | "result"
  | "management"
  | "chart"
  | "hri"
  | "notes";
type ChartSlot = "entry" | "exit";
type ClearTarget = ChartSlot | "voice";

const tradeSteps = [
  { id: "contract", label: "Account", title: "Account & contract" },
  { id: "result", label: "Result", title: "Result" },
  { id: "management", label: "Exit", title: "Exit management" },
  { id: "chart", label: "Chart", title: "Chart" },
  { id: "hri", label: "HRI", title: "Heart Rate Index" },
  { id: "notes", label: "Notes", title: "Notes" },
] as const satisfies { id: TradeStepId; label: string; title: string }[];

const tickerOptions = [
  { description: "Micro Nasdaq-100", value: "MNQ" as const },
  { description: "Micro S&P 500", value: "MES" as const },
] as const;

const directionOptions = [
  { description: "Bought / bullish", label: "Long", value: "long" as const },
  { description: "Sold / bearish", label: "Short", value: "short" as const },
] as const;

const chartModeOptions = [
  {
    description: "One screenshot for the whole trade",
    label: "One image",
    value: "single" as const,
  },
  {
    description: "Separate captures for entry and exit",
    label: "Entry + Exit",
    value: "entry_exit" as const,
  },
] as const;

function ChartImageDropzone({
  active,
  emptyHint,
  image,
  isDragging,
  label,
  onActivate,
  onDragLeave,
  onDragOver,
  onDrop,
  onPick,
  onRemove,
}: {
  active?: boolean;
  emptyHint?: string;
  image: string | null;
  isDragging: boolean;
  label: string;
  onActivate?: () => void;
  onDragLeave: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onPick: () => void;
  onRemove: () => void;
}) {
  return (
    <Card
      className={cn(
        "border-dashed transition-colors",
        active && "ring-2 ring-strong/25",
        isDragging && "border-strong bg-selected ring-2 ring-strong/20"
      )}
      onClick={onActivate}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      size="sm"
    >
      <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex w-full items-center justify-between gap-2">
          <p className="font-medium text-sm text-strong">{label}</p>
          {active ? <Badge variant="secondary">Paste target</Badge> : null}
        </div>
        {image ? (
          <>
            <img
              alt={label}
              className="max-h-40 w-full rounded-lg object-contain ring-1 ring-border"
              height={160}
              src={image}
              width={480}
            />
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onPick();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <ImagePlusIcon data-icon="inline-start" />
                Replace
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                size="sm"
                type="button"
                variant="destructive"
              >
                <Trash2Icon data-icon="inline-start" />
                Remove
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex size-11 items-center justify-center rounded-full bg-selected">
              <ImagePlusIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm text-strong">
                Drop, paste, or pick
              </p>
              <p className="text-muted-foreground text-xs">
                {emptyHint ?? "PNG, JPEG, or WebP · max 4MB"}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onPick();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <ImagePlusIcon data-icon="inline-start" />
                Choose file
              </Button>
              <Badge variant="outline">
                <ClipboardPasteIcon data-icon="inline-start" />
                Paste
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StepHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 space-y-1">
      <h3 className="font-medium text-base text-strong tracking-tight">
        {title}
      </h3>
      {description ? (
        <p className="text-muted-foreground text-sm">{description}</p>
      ) : null}
    </div>
  );
}

/**
 * Compact selectable chip. Use a plain <label> — not FieldLabel —
 * so FieldLabel's has-data-checked:bg-primary/* wash never appears.
 */
function OptionChip({
  description,
  label,
  selected,
  titleClassName,
  value,
}: {
  description?: string;
  label: string;
  selected: boolean;
  titleClassName?: string;
  value: string;
}) {
  return (
    // RadioGroupItem is the control nested in the label (Base UI radio).
    // biome-ignore lint/a11y/noLabelWithoutControl: RadioGroupItem is nested
    <label
      className={cn(
        "relative flex cursor-pointer flex-col items-start gap-0 rounded-md border bg-transparent px-2.5 py-1.5 transition-colors",
        selected
          ? "border-strong text-strong"
          : "border-border text-muted-foreground hover:border-strong/50 hover:text-foreground"
      )}
      data-selected={selected ? "true" : "false"}
    >
      <RadioGroupItem
        className="pointer-events-none absolute size-px overflow-hidden opacity-0"
        value={value}
      />
      <span
        className={cn(
          "font-medium text-sm tracking-tight",
          selected ? "text-strong" : "text-inherit",
          titleClassName
        )}
      >
        {label}
      </span>
      {description ? (
        <span className="text-[10px] text-muted-foreground leading-snug">
          {description}
        </span>
      ) : null}
    </label>
  );
}

function clearTargetTitle(target: ClearTarget | null): string {
  if (target === "entry") {
    return "Remove entry chart?";
  }
  if (target === "exit") {
    return "Remove exit chart?";
  }
  return "Clear voice note?";
}

function clearTargetDescription(target: ClearTarget | null): string {
  if (target === "entry") {
    return "This removes the entry (or single) chart image from the unsaved trade form.";
  }
  if (target === "exit") {
    return "This removes the exit chart image from the unsaved trade form.";
  }
  return "This removes the recorded voice note from the unsaved trade form.";
}

function clearTargetConfirmLabel(target: ClearTarget | null): string {
  if (target === "entry" || target === "exit") {
    return "Remove image";
  }
  return "Clear voice";
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: multi-step form shell
export function TradeForm({
  initialTrade,
  mode = "create",
  onSaved,
}: {
  initialTrade?: Trade;
  mode?: "create" | "edit";
  onSaved?: () => void;
}) {
  const router = useRouter();
  const { preferredAccountId } = useAccountFilter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickSlotRef = useRef<ChartSlot>("entry");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const initialSnapshot = useMemo(() => {
    if (initialTrade) {
      return tradeFormSnapshotFromTrade(initialTrade);
    }
    return {
      ...DEFAULT_TRADE_FORM,
      accountId: preferredAccountId,
      tradeDate: defaultTradeDateValue(),
    };
  }, [initialTrade, preferredAccountId]);

  const [accountId, setAccountId] = useState<AccountId>(
    initialSnapshot.accountId
  );
  const [ticker, setTicker] = useState<Ticker>(initialSnapshot.ticker);
  const [direction, setDirection] = useState<Direction>(
    initialSnapshot.direction
  );
  const [tradeDate, setTradeDate] = useState(
    initialSnapshot.tradeDate || defaultTradeDateValue()
  );
  const [pnl, setPnl] = useState(initialSnapshot.pnl);
  const [positionSize, setPositionSize] = useState(
    initialSnapshot.positionSize
  );
  const [managementStyle, setManagementStyle] = useState<ManagementStyle>(
    initialSnapshot.managementStyle
  );
  const [exitOutcome, setExitOutcome] = useState<ExitOutcome>(
    initialSnapshot.exitOutcome
  );
  const [afterTp1Stop, setAfterTp1Stop] = useState<AfterTp1Stop | null>(
    initialSnapshot.afterTp1Stop
  );
  const [tp1Contracts, setTp1Contracts] = useState(
    initialSnapshot.tp1Contracts
  );
  const [plannedR, setPlannedR] = useState(initialSnapshot.plannedR);
  const [realizedR, setRealizedR] = useState(initialSnapshot.realizedR);
  const [mistakeTags, setMistakeTags] = useState<MistakeTag[]>(
    initialSnapshot.mistakeTags
  );
  const [confluenceChecklist, setConfluenceChecklist] =
    useState<ConfluenceChecklist>(initialSnapshot.confluenceChecklist);
  const [anxietyLevel, setAnxietyLevel] = useState(
    initialSnapshot.anxietyLevel
  );
  const [chartMode, setChartMode] = useState<ChartImageMode>(
    initialSnapshot.chartMode
  );
  const [chartImage, setChartImage] = useState<string | null>(
    initialSnapshot.chartImage
  );
  const [exitImage, setExitImage] = useState<string | null>(
    initialSnapshot.exitImage
  );
  const [pasteSlot, setPasteSlot] = useState<ChartSlot>("entry");
  const [draggingSlot, setDraggingSlot] = useState<ChartSlot | null>(null);
  const [notesText, setNotesText] = useState(initialSnapshot.notesText);
  const [voiceNote, setVoiceNote] = useState<string | null>(
    mode === "edit" ? (initialTrade?.voiceNote ?? null) : null
  );
  const [voiceNoteMime, setVoiceNoteMime] = useState<string | null>(
    mode === "edit" ? (initialTrade?.voiceNoteMime ?? null) : null
  );
  const [isRecording, setIsRecording] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [clearTarget, setClearTarget] = useState<ClearTarget | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const snapshot: TradeFormSnapshot = useMemo(
    () => ({
      accountId,
      afterTp1Stop,
      anxietyLevel,
      chartImage,
      chartMode,
      confluenceChecklist,
      tradeDate,
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
    }),
    [
      accountId,
      afterTp1Stop,
      anxietyLevel,
      chartImage,
      chartMode,
      confluenceChecklist,
      tradeDate,
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
    ]
  );

  const dirtyBaseline = mode === "edit" ? initialSnapshot : DEFAULT_TRADE_FORM;
  const dirty = isTradeFormDirty(snapshot, dirtyBaseline);
  const chartReady = isChartStepComplete(snapshot);
  const resultReady = isResultStepComplete(snapshot);
  const managementReady = isManagementStepComplete(snapshot);

  const checklist = useMemo(() => {
    const hasNotes = notesText.trim().length > 0 || Boolean(voiceNote);
    return [
      { done: true, id: "account", label: "Account" },
      { done: resultReady, id: "result", label: "Result" },
      { done: managementReady, id: "management", label: "Exit" },
      {
        done: chartReady,
        id: "chart",
        label: chartMode === "entry_exit" ? "Charts" : "Chart",
      },
      { done: hasNotes, id: "notes", label: "Notes" },
    ];
  }, [
    resultReady,
    managementReady,
    chartReady,
    chartMode,
    notesText,
    voiceNote,
  ]);

  const readyCount = checklist.filter((c) => c.done).length;
  const missingItems = checklist.filter((item) => !item.done);
  const readyToSave = missingItems.length === 0;
  const currentStep = tradeSteps[currentStepIndex] ?? tradeSteps[0];
  const currentStepId = currentStep.id;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === tradeSteps.length - 1;
  const confluenceReady =
    validateConfluenceChecklist(confluenceChecklist) === null;
  const saveLabel = mode === "edit" ? "Save changes" : "Save trade";
  const currentStepReady =
    currentStepId === "contract" ||
    (currentStepId === "result" && resultReady) ||
    (currentStepId === "management" && managementReady) ||
    (currentStepId === "hri" && confluenceReady) ||
    (currentStepId === "chart" && chartReady) ||
    (currentStepId === "notes" &&
      (notesText.trim().length > 0 || Boolean(voiceNote)));

  const setImageForSlot = useCallback(
    async (slot: ChartSlot, file: File) => {
      try {
        const dataUrl = await fileToChartDataUrl(file);
        if (slot === "exit") {
          setExitImage(dataUrl);
          setPasteSlot("exit");
          toast.success("Exit chart attached");
        } else {
          setChartImage(dataUrl);
          setPasteSlot("entry");
          toast.success(
            chartMode === "entry_exit"
              ? "Entry chart attached"
              : "Chart image attached"
          );
        }
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not attach image.";
        setError(message);
        toast.error(message);
      }
    },
    [chartMode]
  );

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }
      for (const item of items) {
        if (!item.type.startsWith("image/")) {
          continue;
        }
        event.preventDefault();
        const file = item.getAsFile();
        if (!file) {
          return;
        }
        const slot =
          chartMode === "entry_exit" && pasteSlot === "exit" ? "exit" : "entry";
        setImageForSlot(slot, file).catch(() => {
          // handled inside
        });
        return;
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [chartMode, pasteSlot, setImageForSlot]);

  useEffect(() => {
    if (!dirty) {
      return;
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobToDataUrl(blob)
          .then((dataUrl) => {
            setVoiceNote(dataUrl);
            setVoiceNoteMime(mimeType);
            setIsRecording(false);
            toast.success("Voice note recorded");
          })
          .catch(() => {
            setIsRecording(false);
            toast.error("Failed to encode recording.");
          });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setError(null);
    } catch {
      const message = "Microphone permission is required for voice notes.";
      setError(message);
      toast.error(message);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }

  function clearVoice() {
    setVoiceNote(null);
    setVoiceNoteMime(null);
  }

  function clearChartSlot(slot: ChartSlot) {
    if (slot === "exit") {
      setExitImage(null);
    } else {
      setChartImage(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onSelectChartMode(next: ChartImageMode) {
    setChartMode(next);
    setError(null);
    if (next === "single") {
      setExitImage(null);
      setPasteSlot("entry");
    } else {
      setPasteSlot(chartImage && !exitImage ? "exit" : "entry");
    }
  }

  function resetForm() {
    setAccountId(preferredAccountId);
    setTicker(DEFAULT_TRADE_FORM.ticker);
    setDirection(DEFAULT_TRADE_FORM.direction);
    setTradeDate(defaultTradeDateValue());
    setPnl(DEFAULT_TRADE_FORM.pnl);
    setPositionSize(DEFAULT_TRADE_FORM.positionSize);
    setManagementStyle(DEFAULT_TRADE_FORM.managementStyle);
    setExitOutcome(DEFAULT_TRADE_FORM.exitOutcome);
    setAfterTp1Stop(DEFAULT_TRADE_FORM.afterTp1Stop);
    setTp1Contracts(DEFAULT_TRADE_FORM.tp1Contracts);
    setPlannedR(DEFAULT_TRADE_FORM.plannedR);
    setRealizedR(DEFAULT_TRADE_FORM.realizedR);
    setMistakeTags([]);
    setConfluenceChecklist(DEFAULT_TRADE_FORM.confluenceChecklist);
    setAnxietyLevel(DEFAULT_TRADE_FORM.anxietyLevel);
    setChartMode(DEFAULT_TRADE_FORM.chartMode);
    setChartImage(DEFAULT_TRADE_FORM.chartImage);
    setExitImage(DEFAULT_TRADE_FORM.exitImage);
    setPasteSlot("entry");
    setDraggingSlot(null);
    setNotesText(DEFAULT_TRADE_FORM.notesText);
    clearVoice();
    setError(null);
    setCurrentStepIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onConfirmClearAttachment() {
    if (clearTarget === "entry" || clearTarget === "exit") {
      clearChartSlot(clearTarget);
      toast.message(
        clearTarget === "exit" ? "Exit chart removed" : "Chart removed"
      );
    }
    if (clearTarget === "voice") {
      clearVoice();
      toast.message("Voice note removed");
    }
    setClearTarget(null);
  }

  function requestReset() {
    beginFormReset({
      dirty,
      openConfirm: () => setResetConfirmOpen(true),
      reset: resetForm,
    });
  }

  function onConfirmReset() {
    if (mode === "edit" && initialTrade) {
      const snap = tradeFormSnapshotFromTrade(initialTrade);
      setAccountId(snap.accountId);
      setTicker(snap.ticker);
      setDirection(snap.direction);
      setTradeDate(snap.tradeDate || defaultTradeDateValue());
      setPnl(snap.pnl);
      setPositionSize(snap.positionSize);
      setManagementStyle(snap.managementStyle);
      setExitOutcome(snap.exitOutcome);
      setAfterTp1Stop(snap.afterTp1Stop);
      setTp1Contracts(snap.tp1Contracts);
      setPlannedR(snap.plannedR);
      setRealizedR(snap.realizedR);
      setMistakeTags(snap.mistakeTags);
      setConfluenceChecklist(snap.confluenceChecklist);
      setAnxietyLevel(snap.anxietyLevel);
      setChartMode(snap.chartMode);
      setChartImage(snap.chartImage);
      setExitImage(snap.exitImage);
      setNotesText(snap.notesText);
      setVoiceNote(initialTrade.voiceNote);
      setVoiceNoteMime(initialTrade.voiceNoteMime);
      setCurrentStepIndex(0);
      setError(null);
    } else {
      resetForm();
    }
    setResetConfirmOpen(false);
    toast.message("Form cleared");
  }

  function goNext() {
    setError(null);
    if (!currentStepReady) {
      if (currentStepId === "hri") {
        const checklistError = validateConfluenceChecklist(confluenceChecklist);
        setError(
          checklistError ??
            "Complete the confluence checklist before continuing."
        );
        return;
      }
      let missingLabel = currentStep.label.toLowerCase();
      if (currentStepId === "result") {
        missingLabel = "direction, P&L, and position size";
      } else if (currentStepId === "management") {
        missingLabel = "exit outcome";
      } else if (currentStepId === "chart" && chartMode === "entry_exit") {
        missingLabel = "entry and exit charts";
      }
      setError(`Complete ${missingLabel} before continuing.`);
      return;
    }
    setCurrentStepIndex((stepIndex) =>
      Math.min(stepIndex + 1, tradeSteps.length - 1)
    );
  }

  function goBack() {
    setError(null);
    setCurrentStepIndex((stepIndex) => Math.max(stepIndex - 1, 0));
  }

  function toggleMistakeTag(tag: MistakeTag) {
    setMistakeTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function buildFormData(): FormData {
    const formData = new FormData();
    formData.set("accountId", accountId);
    formData.set("ticker", ticker);
    formData.set("direction", direction);
    formData.set("tradeDate", tradeDate);
    // Critical: server is UTC; offset lets us keep the user's local calendar day.
    formData.set(
      "timezoneOffsetMinutes",
      String(new Date().getTimezoneOffset())
    );
    formData.set("pnl", pnl);
    formData.set("positionSize", positionSize);
    formData.set("managementStyle", managementStyle);
    formData.set("exitOutcome", exitOutcome);
    if (managementStyle === "partials") {
      if (afterTp1Stop) {
        formData.set("afterTp1Stop", afterTp1Stop);
      }
      if (tp1Contracts.trim()) {
        formData.set("tp1Contracts", tp1Contracts);
      }
    }
    if (plannedR.trim()) {
      formData.set("plannedR", plannedR);
    }
    if (realizedR.trim()) {
      formData.set("realizedR", realizedR);
    }
    formData.set(
      "mistakeTags",
      JSON.stringify(mistakeTags.filter(isMistakeTag))
    );
    formData.set(
      "confluenceChecklist",
      serializeConfluenceChecklist(confluenceChecklist)
    );
    formData.set("anxietyLevel", String(anxietyLevel));
    formData.set("chartMode", chartMode);
    formData.set("chartImage", chartImage ?? "");
    if (chartMode === "entry_exit" && exitImage) {
      formData.set("exitImage", exitImage);
    }
    formData.set("notesText", notesText);
    if (voiceNote) {
      formData.set("voiceNote", voiceNote);
    }
    if (voiceNoteMime) {
      formData.set("voiceNoteMime", voiceNoteMime);
    }
    return formData;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isChartStepComplete(snapshot)) {
      setError(
        chartMode === "entry_exit"
          ? "Entry and exit chart images are required."
          : "A chart image is required."
      );
      return;
    }
    if (!(notesText.trim() || voiceNote)) {
      setError("Add a text note or record a voice note.");
      return;
    }
    if (!managementReady) {
      setError("Select an exit outcome.");
      return;
    }

    const formData = buildFormData();
    setPending(true);
    try {
      const result =
        mode === "edit" && initialTrade
          ? await updateTradeAction(initialTrade.id, formData)
          : await createTradeAction(formData);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(mode === "edit" ? "Trade updated" : "Trade logged");
      if (mode === "create") {
        resetForm();
      }
      onSaved?.();
      router.push(`/trades/${result.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: step switch
  function renderStep() {
    if (currentStepId === "contract") {
      return (
        <div className="space-y-4">
          <div>
            <p className="mb-2 font-medium text-muted-foreground text-xs">
              Account
            </p>
            <RadioGroup
              className="grid grid-cols-2 gap-2"
              onValueChange={(value) => {
                if (value === "lucid_a" || value === "lucid_b") {
                  setAccountId(value);
                }
              }}
              value={accountId}
            >
              {TRADING_ACCOUNTS.map((account) => (
                <OptionChip
                  description={`$${account.startingBalance.toLocaleString()}`}
                  key={account.id}
                  label={account.shortLabel}
                  selected={accountId === account.id}
                  value={account.id}
                />
              ))}
            </RadioGroup>
          </div>
          <div>
            <p className="mb-2 font-medium text-muted-foreground text-xs">
              Contract
            </p>
            <RadioGroup
              className="grid grid-cols-2 gap-2"
              onValueChange={(value) => {
                if (value === "MNQ" || value === "MES") {
                  setTicker(value);
                }
              }}
              value={ticker}
            >
              {tickerOptions.map((option) => (
                <OptionChip
                  description={option.description}
                  key={option.value}
                  label={option.value}
                  selected={ticker === option.value}
                  titleClassName="font-mono text-sm"
                  value={option.value}
                />
              ))}
            </RadioGroup>
          </div>
        </div>
      );
    }

    if (currentStepId === "result") {
      return (
        <div>
          <StepHeader
            description="When it happened, direction, net dollars, and size."
            title="Result"
          />
          <div className="grid gap-4">
            <Field>
              <FieldLabel htmlFor="tradeDate">Trade date & time</FieldLabel>
              <Input
                className="h-11 tabular-nums"
                id="tradeDate"
                name="tradeDate"
                onChange={(e) => setTradeDate(e.target.value)}
                required
                type="datetime-local"
                value={tradeDate}
              />
              <FieldDescription>
                Backfill a missed day by picking that date (e.g. July 14).
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Direction</FieldLabel>
              <RadioGroup
                className="grid grid-cols-2 gap-2"
                onValueChange={(value) => {
                  if (value === "long" || value === "short") {
                    setDirection(value);
                  }
                }}
                value={direction}
              >
                {directionOptions.map((option) => (
                  <OptionChip
                    key={option.value}
                    label={option.label}
                    selected={direction === option.value}
                    value={option.value}
                  />
                ))}
              </RadioGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="pnl">P&L ($)</FieldLabel>
              <Input
                autoFocus
                className="h-11 font-mono text-base tabular-nums"
                id="pnl"
                inputMode="decimal"
                name="pnl"
                onChange={(e) => setPnl(e.target.value)}
                placeholder="125.50 or -80"
                required
                step="0.01"
                type="number"
                value={pnl}
              />
              <FieldDescription>
                Net realized dollars for the whole trade (one number).
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="positionSize">Position size</FieldLabel>
              <Input
                className="h-11 tabular-nums"
                id="positionSize"
                inputMode="numeric"
                min="1"
                name="positionSize"
                onChange={(e) => setPositionSize(e.target.value)}
                placeholder="Contracts"
                required
                step="1"
                type="number"
                value={positionSize}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="plannedR">Planned R (opt.)</FieldLabel>
                <Input
                  className="h-11 tabular-nums"
                  id="plannedR"
                  inputMode="decimal"
                  onChange={(e) => setPlannedR(e.target.value)}
                  placeholder="2"
                  step="0.1"
                  type="number"
                  value={plannedR}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="realizedR">Realized R (opt.)</FieldLabel>
                <Input
                  className="h-11 tabular-nums"
                  id="realizedR"
                  inputMode="decimal"
                  onChange={(e) => setRealizedR(e.target.value)}
                  placeholder="1.5"
                  step="0.1"
                  type="number"
                  value={realizedR}
                />
              </Field>
            </div>
          </div>
        </div>
      );
    }

    if (currentStepId === "management") {
      return (
        <div>
          <StepHeader
            description="How did the exit play out? Partials expand only when needed."
            title="Exit management"
          />
          <div className="grid gap-5">
            <Field>
              <FieldLabel>Style</FieldLabel>
              <RadioGroup
                className="grid grid-cols-2 gap-3"
                onValueChange={(value) => {
                  if (value === "full" || value === "partials") {
                    setManagementStyle(value);
                    if (value === "full") {
                      setAfterTp1Stop(null);
                      setTp1Contracts("");
                    }
                  }
                }}
                value={managementStyle}
              >
                {(
                  [
                    {
                      description: "Single exit / all-in management",
                      label: "Full",
                      value: "full" as const,
                    },
                    {
                      description: "Scaled out at TP1 / runner",
                      label: "Partials",
                      value: "partials" as const,
                    },
                  ] as const
                ).map((option) => (
                  <OptionChip
                    description={option.description}
                    key={option.value}
                    label={option.label}
                    selected={managementStyle === option.value}
                    value={option.value}
                  />
                ))}
              </RadioGroup>
            </Field>

            <Field>
              <FieldLabel>Outcome</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {EXIT_OUTCOME_OPTIONS.map((option) => {
                  const selected = exitOutcome === option.id;
                  return (
                    <button
                      className={cn(
                        "rounded-full border bg-transparent px-3 py-1.5 text-left text-xs transition-colors",
                        selected
                          ? "border-strong font-medium text-strong"
                          : "border-border text-muted-foreground hover:border-strong/50 hover:text-foreground"
                      )}
                      key={option.id}
                      onClick={() => setExitOutcome(option.id)}
                      title={option.description}
                      type="button"
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {managementStyle === "partials" ? (
              <div className="grid gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
                <Field>
                  <FieldLabel htmlFor="tp1Contracts">
                    TP1 size (contracts, optional)
                  </FieldLabel>
                  <Input
                    className="h-10 tabular-nums"
                    id="tp1Contracts"
                    inputMode="decimal"
                    min="0"
                    onChange={(e) => setTp1Contracts(e.target.value)}
                    placeholder="e.g. 2"
                    step="1"
                    type="number"
                    value={tp1Contracts}
                  />
                </Field>
                <Field>
                  <FieldLabel>After TP1 stop</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {AFTER_TP1_OPTIONS.map((option) => {
                      const selected = afterTp1Stop === option.id;
                      return (
                        <button
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs transition-colors",
                            selected
                              ? "border-strong font-medium text-strong"
                              : "border-border text-muted-foreground hover:border-strong/50 hover:text-foreground"
                          )}
                          key={option.id}
                          onClick={() =>
                            setAfterTp1Stop(selected ? null : option.id)
                          }
                          type="button"
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            ) : null}

            <Field>
              <FieldLabel>Mistake tags (optional)</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {MISTAKE_TAG_OPTIONS.map((option) => {
                  const selected = mistakeTags.includes(option.id);
                  return (
                    <button
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition-colors",
                        selected
                          ? "border-red-500/50 bg-red-500/10 font-medium text-red-300"
                          : "border-border text-muted-foreground hover:border-strong/50 hover:text-foreground"
                      )}
                      key={option.id}
                      onClick={() => toggleMistakeTag(option.id)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        </div>
      );
    }

    if (currentStepId === "chart") {
      return (
        <div>
          <StepHeader
            description="Attach one chart, or separate entry and exit captures."
            title="Chart"
          />
          <RadioGroup
            className="mb-4 grid grid-cols-2 gap-2"
            onValueChange={(value) => {
              if (value === "single" || value === "entry_exit") {
                onSelectChartMode(value);
              }
            }}
            value={chartMode}
          >
            {chartModeOptions.map((option) => (
              <OptionChip
                description={option.description}
                key={option.value}
                label={option.label}
                selected={chartMode === option.value}
                value={option.value}
              />
            ))}
          </RadioGroup>

          {chartMode === "single" ? (
            <ChartImageDropzone
              image={chartImage}
              isDragging={draggingSlot === "entry"}
              label="Chart"
              onDragLeave={() => setDraggingSlot(null)}
              onDragOver={(e) => {
                e.preventDefault();
                setDraggingSlot("entry");
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDraggingSlot(null);
                const [file] = e.dataTransfer.files;
                if (file) {
                  setImageForSlot("entry", file).catch(() => undefined);
                }
              }}
              onPick={() => {
                pickSlotRef.current = "entry";
                fileInputRef.current?.click();
              }}
              onRemove={() => setClearTarget("entry")}
            />
          ) : (
            <div className="grid gap-3">
              <ChartImageDropzone
                active={pasteSlot === "entry"}
                emptyHint="Entry screenshot · PNG/JPEG/WebP · 4MB"
                image={chartImage}
                isDragging={draggingSlot === "entry"}
                label="Entry"
                onActivate={() => setPasteSlot("entry")}
                onDragLeave={() => setDraggingSlot(null)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDraggingSlot("entry");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDraggingSlot(null);
                  setPasteSlot("entry");
                  const [file] = e.dataTransfer.files;
                  if (file) {
                    setImageForSlot("entry", file).catch(() => undefined);
                  }
                }}
                onPick={() => {
                  pickSlotRef.current = "entry";
                  setPasteSlot("entry");
                  fileInputRef.current?.click();
                }}
                onRemove={() => setClearTarget("entry")}
              />
              <ChartImageDropzone
                active={pasteSlot === "exit"}
                emptyHint="Exit screenshot · PNG/JPEG/WebP · 4MB"
                image={exitImage}
                isDragging={draggingSlot === "exit"}
                label="Exit"
                onActivate={() => setPasteSlot("exit")}
                onDragLeave={() => setDraggingSlot(null)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDraggingSlot("exit");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDraggingSlot(null);
                  setPasteSlot("exit");
                  const [file] = e.dataTransfer.files;
                  if (file) {
                    setImageForSlot("exit", file).catch(() => undefined);
                  }
                }}
                onPick={() => {
                  pickSlotRef.current = "exit";
                  setPasteSlot("exit");
                  fileInputRef.current?.click();
                }}
                onRemove={() => setClearTarget("exit")}
              />
              <p className="text-muted-foreground text-xs">
                Click a panel to choose where paste goes (marked Paste target).
              </p>
            </div>
          )}
        </div>
      );
    }

    if (currentStepId === "hri") {
      return (
        <div>
          <StepHeader
            description="Checklist scores setup quality; anxiety is how the size felt."
            title="Heart Rate Index"
          />
          <FieldSet className="gap-5">
            <ConfluenceChecklistFields
              checklist={confluenceChecklist}
              onChange={setConfluenceChecklist}
              ticker={ticker}
            />
            <Field>
              <div className="mb-2 flex items-center justify-between gap-2">
                <FieldLabel className="mb-0">Anxiety</FieldLabel>
                <span
                  className={cn(
                    "font-medium text-sm tabular-nums",
                    anxietyLevel >= 7 ? "text-red-400" : "text-strong"
                  )}
                >
                  {anxietyLevel}/10
                </span>
              </div>
              <Slider
                max={10}
                min={1}
                onValueChange={(value) => {
                  setAnxietyLevel(firstSliderValue(value));
                }}
                step={1}
                value={[anxietyLevel]}
              />
              <FieldDescription className="mt-2">
                Tight chest or glued to the screen → size is too big.
              </FieldDescription>
            </Field>
          </FieldSet>
        </div>
      );
    }

    return (
      <div>
        <StepHeader
          description="Text or voice — at least one is required."
          title="Notes"
        />
        <Tabs defaultValue="text">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
          </TabsList>
          <TabsContent className="mt-3" value="text">
            <Field>
              <Textarea
                autoFocus
                className="min-h-28 resize-none"
                id="notesText"
                name="notesText"
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Plan, execution, what you'd change…"
                rows={5}
                value={notesText}
              />
            </Field>
          </TabsContent>
          <TabsContent className="mt-3" value="voice">
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                {isRecording ? (
                  <Button
                    onClick={stopRecording}
                    type="button"
                    variant="destructive"
                  >
                    <SquareIcon data-icon="inline-start" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      startRecording().catch(() => undefined);
                    }}
                    type="button"
                    variant="outline"
                  >
                    <MicIcon data-icon="inline-start" />
                    {voiceNote ? "Re-record" : "Record"}
                  </Button>
                )}
                {voiceNote && !isRecording ? (
                  <Button
                    onClick={() => setClearTarget("voice")}
                    type="button"
                    variant="ghost"
                  >
                    <Trash2Icon data-icon="inline-start" />
                    Clear
                  </Button>
                ) : null}
                {isRecording ? (
                  <Badge className="animate-pulse" variant="destructive">
                    Recording…
                  </Badge>
                ) : null}
                {voiceNote && !isRecording ? (
                  <Badge variant="secondary">Attached</Badge>
                ) : null}
              </div>
              {voiceNote ? (
                <audio className="w-full" controls src={voiceNote}>
                  <track kind="captions" />
                </audio>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Short debrief after the trade works best.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-3 border-border border-b px-4 py-3">
          <div className="min-w-0">
            <p className="font-medium text-sm text-strong">
              {mode === "edit" ? "Edit trade" : "Log trade"}
            </p>
            <p className="text-muted-foreground text-xs">
              Step {currentStepIndex + 1} of {tradeSteps.length} ·{" "}
              {currentStep.label}
            </p>
          </div>
          {mode === "create" ? (
            <DialogClose
              render={
                <Button
                  aria-label="Close"
                  className="shrink-0"
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                />
              }
            >
              <XIcon />
            </DialogClose>
          ) : null}
        </div>

        <div className="border-border border-b px-4 py-3">
          <div className="flex w-full items-center">
            {tradeSteps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isComplete = index < currentStepIndex;
              const isLast = index === tradeSteps.length - 1;
              return (
                <div
                  className={cn(
                    "flex items-center",
                    isLast ? "shrink-0" : "min-w-0 flex-1"
                  )}
                  key={step.id}
                >
                  <button
                    aria-current={isActive ? "step" : undefined}
                    aria-label={`${step.label}${isComplete ? ", complete" : ""}`}
                    className={cn(
                      "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full font-medium text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      isActive && "bg-primary text-primary-foreground",
                      isComplete &&
                        !isActive &&
                        "bg-strong text-primary-foreground",
                      !(isActive || isComplete) &&
                        "bg-selected text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setCurrentStepIndex(index)}
                    type="button"
                  >
                    {isComplete && !isActive ? (
                      <CheckIcon className="size-3.5" strokeWidth={3} />
                    ) : (
                      index + 1
                    )}
                  </button>
                  {isLast ? null : (
                    <div
                      aria-hidden
                      className={cn(
                        "mx-2 h-px min-w-0 flex-1",
                        index < currentStepIndex ? "bg-strong" : "bg-border"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <input
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            className="sr-only"
            onChange={(e) => {
              const [file] = e.target.files ?? [];
              if (file) {
                setImageForSlot(pickSlotRef.current, file).catch(
                  () => undefined
                );
              }
            }}
            ref={fileInputRef}
            type="file"
          />

          <div className="max-h-[min(28rem,calc(100svh-14rem))] overflow-y-auto px-4 py-4">
            {renderStep()}
            {error ? (
              <Alert className="mt-4" variant="destructive">
                <AlertTitle>Could not continue</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 border-border border-t px-4 py-3">
            <Button
              disabled={pending || isRecording || !dirty}
              onClick={requestReset}
              size="sm"
              type="button"
              variant="ghost"
            >
              Reset
            </Button>
            <div className="flex items-center gap-2">
              <span className="mr-1 hidden text-muted-foreground text-xs sm:inline">
                {readyCount}/{checklist.length} ready
              </span>
              <Button
                disabled={pending || isRecording || isFirstStep}
                onClick={goBack}
                size="sm"
                type="button"
                variant="outline"
              >
                Back
              </Button>
              {isLastStep ? (
                <Button
                  disabled={pending || isRecording || !readyToSave}
                  size="sm"
                  type="submit"
                >
                  {pending ? (
                    <>
                      <Loader2Icon
                        className="animate-spin"
                        data-icon="inline-start"
                      />
                      Saving…
                    </>
                  ) : (
                    saveLabel
                  )}
                </Button>
              ) : (
                <Button
                  disabled={pending || isRecording || !currentStepReady}
                  onClick={goNext}
                  size="sm"
                  type="button"
                >
                  Continue
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      <ConfirmDialog
        cancelLabel="Keep editing"
        confirmLabel="Clear form"
        description="You have unsaved changes. Resetting will discard charts, P&L, notes, and metrics currently entered."
        onConfirm={onConfirmReset}
        onOpenChange={setResetConfirmOpen}
        open={resetConfirmOpen}
        title="Clear this form?"
        variant="destructive"
      />

      <ConfirmDialog
        cancelLabel="Keep it"
        confirmLabel={clearTargetConfirmLabel(clearTarget)}
        description={clearTargetDescription(clearTarget)}
        onConfirm={onConfirmClearAttachment}
        onOpenChange={(open) => {
          if (!open) {
            setClearTarget(null);
          }
        }}
        open={clearTarget !== null}
        title={clearTargetTitle(clearTarget)}
        variant="destructive"
      />
    </>
  );
}
