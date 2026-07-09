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

import { createTradeAction } from "@/app/actions/trades";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
import { beginFormReset } from "@/lib/confirm-flow";
import {
  DEFAULT_TRADE_FORM,
  isTradeFormDirty,
  type TradeFormSnapshot,
} from "@/lib/trade-form-state";
import type { Ticker } from "@/lib/types";
import { cn } from "@/lib/utils";

function fileToPngDataUrl(file: File): Promise<string> {
  if (file.type !== "image/png") {
    return Promise.reject(new Error("Only PNG images are allowed."));
  }
  if (file.size > 4_000_000) {
    return Promise.reject(new Error("PNG must be under 4MB."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const { result } = reader;
      if (typeof result === "string" && result.startsWith("data:image/png")) {
        resolve(result);
      } else {
        reject(new Error("Could not read PNG image."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

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

type TradeStepId = "ticker" | "result" | "chart" | "hri" | "notes";

const tradeSteps = [
  { id: "ticker", label: "Ticker", title: "Contract" },
  { id: "result", label: "Result", title: "Result" },
  { id: "chart", label: "Chart", title: "Chart" },
  { id: "hri", label: "HRI", title: "Heart Rate Index" },
  { id: "notes", label: "Notes", title: "Notes" },
] as const satisfies { id: TradeStepId; label: string; title: string }[];

const tickerOptions = [
  { description: "Micro Nasdaq-100", value: "MNQ" as const },
  { description: "Micro S&P 500", value: "MES" as const },
] as const;

function ChartImageDropzone({
  chartImage,
  isDragging,
  onDragLeave,
  onDragOver,
  onDrop,
  onPick,
  onRemove,
}: {
  chartImage: string | null;
  isDragging: boolean;
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
        isDragging && "border-strong bg-selected ring-2 ring-strong/20"
      )}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      size="sm"
    >
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        {chartImage ? (
          <>
            <img
              alt="Trade chart"
              className="max-h-44 w-full rounded-lg object-contain ring-1 ring-border"
              height={176}
              src={chartImage}
              width={480}
            />
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={onPick}
                size="sm"
                type="button"
                variant="outline"
              >
                <ImagePlusIcon data-icon="inline-start" />
                Replace
              </Button>
              <Button
                onClick={onRemove}
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
                Drop or paste chart
              </p>
              <p className="text-muted-foreground text-xs">
                PNG only · max 4MB
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={onPick}
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

function TradeFormStep({
  anxietyLevel,
  chartImage,
  confluenceScore,
  isDragging,
  isRecording,
  notesText,
  onClearChart,
  onClearVoice,
  onDragLeave,
  onDragOver,
  onDrop,
  onPickChart,
  onSelectTicker,
  onStartRecording,
  onStopRecording,
  pnl,
  positionSize,
  setAnxietyLevel,
  setConfluenceScore,
  setNotesText,
  setPnl,
  setPositionSize,
  step,
  ticker,
  voiceNote,
}: {
  anxietyLevel: number;
  chartImage: string | null;
  confluenceScore: number;
  isDragging: boolean;
  isRecording: boolean;
  notesText: string;
  onClearChart: () => void;
  onClearVoice: () => void;
  onDragLeave: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onPickChart: () => void;
  onSelectTicker: (value: Ticker) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  pnl: string;
  positionSize: string;
  setAnxietyLevel: (value: number) => void;
  setConfluenceScore: (value: number) => void;
  setNotesText: (value: string) => void;
  setPnl: (value: string) => void;
  setPositionSize: (value: string) => void;
  step: TradeStepId;
  ticker: Ticker;
  voiceNote: string | null;
}) {
  if (step === "ticker") {
    return (
      <div>
        <StepHeader
          description="Which micro contract did you trade?"
          title="Contract"
        />
        <RadioGroup
          className="grid grid-cols-2 gap-3"
          onValueChange={(value) => {
            if (value === "MNQ" || value === "MES") {
              onSelectTicker(value);
            }
          }}
          value={ticker}
        >
          {tickerOptions.map((option) => {
            const selected = ticker === option.value;
            return (
              <FieldLabel
                className={cn(
                  "relative flex cursor-pointer flex-col items-start gap-1 rounded-xl border px-4 py-5 transition-colors",
                  selected
                    ? "border-strong bg-selected"
                    : "border-border bg-transparent hover:bg-selected/60"
                )}
                key={option.value}
              >
                <RadioGroupItem className="sr-only" value={option.value} />
                {selected ? (
                  <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-strong text-primary-foreground">
                    <CheckIcon className="size-3" strokeWidth={3} />
                  </span>
                ) : null}
                <span className="font-medium font-mono text-2xl text-strong tracking-tight">
                  {option.value}
                </span>
                <span className="text-muted-foreground text-xs">
                  {option.description}
                </span>
              </FieldLabel>
            );
          })}
        </RadioGroup>
      </div>
    );
  }

  if (step === "result") {
    return (
      <div>
        <StepHeader
          description="Net dollars and how many contracts."
          title="Result"
        />
        <div className="grid gap-4">
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
            <FieldDescription>
              Size until it feels boring (Heart Rate Index).
            </FieldDescription>
          </Field>
        </div>
      </div>
    );
  }

  if (step === "chart") {
    return (
      <div>
        <StepHeader
          description="PNG only — paste, drop, or pick."
          title="Chart"
        />
        <ChartImageDropzone
          chartImage={chartImage}
          isDragging={isDragging}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onPick={onPickChart}
          onRemove={onClearChart}
        />
      </div>
    );
  }

  if (step === "hri") {
    return (
      <div>
        <StepHeader
          description="Setup quality and how you felt in the trade."
          title="Heart Rate Index"
        />
        <FieldSet className="gap-5">
          <Field>
            <div className="mb-2 flex items-center justify-between gap-2">
              <FieldLabel className="mb-0">Confluence</FieldLabel>
              <span className="font-medium text-sm text-strong tabular-nums">
                {confluenceScore}/5
              </span>
            </div>
            <Slider
              max={5}
              min={1}
              onValueChange={(value) => {
                setConfluenceScore(firstSliderValue(value));
              }}
              step={1}
              value={[confluenceScore]}
            />
            <FieldDescription className="mt-2">
              1 weak · 5 A+ setup
            </FieldDescription>
          </Field>

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
                  onClick={onStopRecording}
                  type="button"
                  variant="destructive"
                >
                  <SquareIcon data-icon="inline-start" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={onStartRecording}
                  type="button"
                  variant="outline"
                >
                  <MicIcon data-icon="inline-start" />
                  {voiceNote ? "Re-record" : "Record"}
                </Button>
              )}
              {voiceNote && !isRecording ? (
                <Button onClick={onClearVoice} type="button" variant="ghost">
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
              <audio className="w-full" controls src={voiceNote} />
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

export function TradeForm({ onSaved }: { onSaved?: () => void }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [ticker, setTicker] = useState<Ticker>(DEFAULT_TRADE_FORM.ticker);
  const [pnl, setPnl] = useState(DEFAULT_TRADE_FORM.pnl);
  const [positionSize, setPositionSize] = useState(
    DEFAULT_TRADE_FORM.positionSize
  );
  const [confluenceScore, setConfluenceScore] = useState(
    DEFAULT_TRADE_FORM.confluenceScore
  );
  const [anxietyLevel, setAnxietyLevel] = useState(
    DEFAULT_TRADE_FORM.anxietyLevel
  );
  const [chartImage, setChartImage] = useState<string | null>(
    DEFAULT_TRADE_FORM.chartImage
  );
  const [notesText, setNotesText] = useState(DEFAULT_TRADE_FORM.notesText);
  const [voiceNote, setVoiceNote] = useState<string | null>(
    DEFAULT_TRADE_FORM.voiceNote
  );
  const [voiceNoteMime, setVoiceNoteMime] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [clearTarget, setClearTarget] = useState<"chart" | "voice" | null>(
    null
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const snapshot: TradeFormSnapshot = useMemo(
    () => ({
      anxietyLevel,
      chartImage,
      confluenceScore,
      notesText,
      pnl,
      positionSize,
      ticker,
      voiceNote,
    }),
    [
      ticker,
      pnl,
      positionSize,
      confluenceScore,
      anxietyLevel,
      chartImage,
      notesText,
      voiceNote,
    ]
  );

  const dirty = isTradeFormDirty(snapshot);

  const checklist = useMemo(() => {
    const hasPnl = pnl.trim().length > 0;
    const hasSize = positionSize.trim().length > 0;
    const hasChart = Boolean(chartImage);
    const hasNotes = notesText.trim().length > 0 || Boolean(voiceNote);
    return [
      { done: true, id: "ticker", label: "Ticker" },
      { done: hasPnl, id: "pnl", label: "P&L" },
      { done: hasSize, id: "size", label: "Size" },
      { done: hasChart, id: "chart", label: "Chart" },
      { done: hasNotes, id: "notes", label: "Notes" },
    ];
  }, [pnl, positionSize, chartImage, notesText, voiceNote]);

  const readyCount = checklist.filter((c) => c.done).length;
  const missingItems = checklist.filter((item) => !item.done);
  const readyToSave = missingItems.length === 0;
  const currentStep = tradeSteps[currentStepIndex] ?? tradeSteps[0];
  const currentStepId = currentStep.id;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === tradeSteps.length - 1;
  const currentStepReady =
    currentStepId === "ticker" ||
    currentStepId === "hri" ||
    (currentStepId === "result" &&
      pnl.trim().length > 0 &&
      positionSize.trim().length > 0) ||
    (currentStepId === "chart" && Boolean(chartImage)) ||
    (currentStepId === "notes" &&
      (notesText.trim().length > 0 || Boolean(voiceNote)));

  const setImageFromFile = useCallback(async (file: File) => {
    try {
      const dataUrl = await fileToPngDataUrl(file);
      setChartImage(dataUrl);
      setError(null);
      toast.success("Chart image attached");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not attach image.";
      setError(message);
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      for (const item of items) {
        if (item.type === "image/png") {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            setImageFromFile(file).catch(() => {
              // Errors are handled inside setImageFromFile.
            });
          }
          return;
        }
      }
    }

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [setImageFromFile]);

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

  function clearChart() {
    setChartImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function resetForm() {
    setTicker(DEFAULT_TRADE_FORM.ticker);
    setPnl(DEFAULT_TRADE_FORM.pnl);
    setPositionSize(DEFAULT_TRADE_FORM.positionSize);
    setConfluenceScore(DEFAULT_TRADE_FORM.confluenceScore);
    setAnxietyLevel(DEFAULT_TRADE_FORM.anxietyLevel);
    setChartImage(DEFAULT_TRADE_FORM.chartImage);
    setNotesText(DEFAULT_TRADE_FORM.notesText);
    clearVoice();
    setError(null);
    setCurrentStepIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onConfirmClearAttachment() {
    if (clearTarget === "chart") {
      clearChart();
      toast.message("Chart removed");
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
    resetForm();
    setResetConfirmOpen(false);
    toast.message("Form cleared");
  }

  function goNext() {
    setError(null);
    if (!currentStepReady) {
      const missingLabel =
        currentStepId === "result"
          ? "P&L and position size"
          : currentStep.label.toLowerCase();
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

  function onSelectTicker(value: Ticker) {
    setTicker(value);
    setError(null);
    setCurrentStepIndex(1);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!chartImage) {
      setError("A PNG chart image is required.");
      return;
    }
    if (!(notesText.trim() || voiceNote)) {
      setError("Add a text note or record a voice note.");
      return;
    }

    const formData = new FormData();
    formData.set("ticker", ticker);
    formData.set("pnl", pnl);
    formData.set("positionSize", positionSize);
    formData.set("confluenceScore", String(confluenceScore));
    formData.set("anxietyLevel", String(anxietyLevel));
    formData.set("chartImage", chartImage);
    formData.set("notesText", notesText);
    if (voiceNote) {
      formData.set("voiceNote", voiceNote);
    }
    if (voiceNoteMime) {
      formData.set("voiceNoteMime", voiceNoteMime);
    }

    setPending(true);
    try {
      const result = await createTradeAction(formData);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Trade logged");
      resetForm();
      onSaved?.();
      router.push(`/trades/${result.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-3 border-border border-b px-4 py-3">
          <div className="min-w-0">
            <p className="font-medium text-sm text-strong">Log trade</p>
            <p className="text-muted-foreground text-xs">
              Step {currentStepIndex + 1} of {tradeSteps.length} ·{" "}
              {currentStep.label}
            </p>
          </div>
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
            accept="image/png"
            className="sr-only"
            onChange={(e) => {
              const [file] = e.target.files ?? [];
              if (file) {
                setImageFromFile(file).catch(() => {
                  // Errors are handled inside setImageFromFile.
                });
              }
            }}
            ref={fileInputRef}
            type="file"
          />

          <div className="max-h-[min(26rem,calc(100svh-14rem))] overflow-y-auto px-4 py-4">
            <TradeFormStep
              anxietyLevel={anxietyLevel}
              chartImage={chartImage}
              confluenceScore={confluenceScore}
              isDragging={isDragging}
              isRecording={isRecording}
              notesText={notesText}
              onClearChart={() => setClearTarget("chart")}
              onClearVoice={() => setClearTarget("voice")}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const [file] = e.dataTransfer.files;
                if (file) {
                  setImageFromFile(file).catch(() => {
                    // Errors are handled inside setImageFromFile.
                  });
                }
              }}
              onPickChart={() => fileInputRef.current?.click()}
              onSelectTicker={onSelectTicker}
              onStartRecording={() => {
                startRecording().catch(() => {
                  // Errors are handled inside startRecording.
                });
              }}
              onStopRecording={stopRecording}
              pnl={pnl}
              positionSize={positionSize}
              setAnxietyLevel={setAnxietyLevel}
              setConfluenceScore={setConfluenceScore}
              setNotesText={setNotesText}
              setPnl={setPnl}
              setPositionSize={setPositionSize}
              step={currentStepId}
              ticker={ticker}
              voiceNote={voiceNote}
            />

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
                    "Save trade"
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
        description="You have unsaved changes. Resetting will discard the chart, P&L, notes, and metrics currently entered."
        onConfirm={onConfirmReset}
        onOpenChange={setResetConfirmOpen}
        open={resetConfirmOpen}
        title="Clear this form?"
        variant="destructive"
      />

      <ConfirmDialog
        cancelLabel="Keep it"
        confirmLabel={clearTarget === "chart" ? "Remove chart" : "Clear voice"}
        description={
          clearTarget === "chart"
            ? "This removes the attached chart image from the unsaved trade form."
            : "This removes the recorded voice note from the unsaved trade form."
        }
        onConfirm={onConfirmClearAttachment}
        onOpenChange={(open) => {
          if (!open) {
            setClearTarget(null);
          }
        }}
        open={clearTarget !== null}
        title={
          clearTarget === "chart" ? "Remove chart image?" : "Clear voice note?"
        }
        variant="destructive"
      />
    </>
  );
}
