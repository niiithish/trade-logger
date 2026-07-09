"use client";

import {
  ClipboardPasteIcon,
  ImagePlusIcon,
  Loader2Icon,
  MicIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { createTradeAction } from "@/app/actions/trades";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Ticker } from "@/lib/types";

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

export function TradeForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [ticker, setTicker] = useState<Ticker>("MNQ");
  const [pnl, setPnl] = useState("");
  const [positionSize, setPositionSize] = useState("");
  const [confluenceScore, setConfluenceScore] = useState(3);
  const [anxietyLevel, setAnxietyLevel] = useState(3);
  const [chartImage, setChartImage] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [voiceNoteMime, setVoiceNoteMime] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function resetForm() {
    setTicker("MNQ");
    setPnl("");
    setPositionSize("");
    setConfluenceScore(3);
    setAnxietyLevel(3);
    setChartImage(null);
    setNotesText("");
    clearVoice();
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      router.push(`/trades/${result.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log trade</CardTitle>
        <CardDescription>
          Every field is required. Notes can be text, voice, or both.
        </CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit}>
        <CardContent>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Trade basics</FieldLegend>
              <FieldDescription>
                Futures prop journal — MNQ or MES only.
              </FieldDescription>

              <Field>
                <FieldLabel>Ticker</FieldLabel>
                <RadioGroup
                  className="grid grid-cols-2 gap-2"
                  onValueChange={(value) => {
                    if (value === "MNQ" || value === "MES") {
                      setTicker(value);
                    }
                  }}
                  value={ticker}
                >
                  {(["MNQ", "MES"] as const).map((option) => (
                    <FieldLabel
                      className="flex items-center gap-2 rounded-lg border border-input px-3 py-2 has-data-checked:border-primary has-data-checked:bg-primary/5"
                      key={option}
                    >
                      <RadioGroupItem value={option} />
                      <span className="font-medium">{option}</span>
                    </FieldLabel>
                  ))}
                </RadioGroup>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="pnl">P&L ($)</FieldLabel>
                  <Input
                    id="pnl"
                    inputMode="decimal"
                    name="pnl"
                    onChange={(e) => setPnl(e.target.value)}
                    placeholder="e.g. 125.50 or -80"
                    required
                    step="0.01"
                    type="number"
                    value={pnl}
                  />
                  <FieldDescription>
                    Net profit or loss for the trade.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="positionSize">Position size</FieldLabel>
                  <Input
                    id="positionSize"
                    inputMode="numeric"
                    min="1"
                    name="positionSize"
                    onChange={(e) => setPositionSize(e.target.value)}
                    placeholder="Contracts / size"
                    required
                    step="1"
                    type="number"
                    value={positionSize}
                  />
                  <FieldDescription>
                    From Dodgy&apos;s Heart Rate Index — size until it feels
                    boring.
                  </FieldDescription>
                </Field>
              </div>
            </FieldSet>

            <FieldSeparator>Heart Rate Index</FieldSeparator>

            <FieldSet>
              <FieldLegend variant="label">Emotional metrics</FieldLegend>
              <FieldDescription>
                Track confluence and anxiety so red days from panic show up.
              </FieldDescription>

              <Field>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Confluence score</FieldLabel>
                  <Badge variant="secondary">{confluenceScore} / 5</Badge>
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
                <FieldDescription>
                  How clean was the setup? 1 weak → 5 A+
                </FieldDescription>
              </Field>

              <Field>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Anxiety level</FieldLabel>
                  <Badge
                    variant={anxietyLevel >= 7 ? "destructive" : "secondary"}
                  >
                    {anxietyLevel} / 10
                  </Badge>
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
                <FieldDescription>
                  Chest tight / can&apos;t leave the screen? Size is too big.
                </FieldDescription>
              </Field>
            </FieldSet>

            <FieldSeparator>Evidence</FieldSeparator>

            <FieldSet>
              <FieldLegend variant="label">Chart image (PNG)</FieldLegend>
              <Field>
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

                <Card
                  className={
                    isDragging
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-dashed"
                  }
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
                  size="sm"
                >
                  <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                    {chartImage ? (
                      <>
                        <img
                          alt="Trade chart"
                          className="max-h-56 w-full rounded-lg object-contain"
                          height={224}
                          src={chartImage}
                          width={512}
                        />
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <ImagePlusIcon data-icon="inline-start" />
                            Replace
                          </Button>
                          <Button
                            onClick={() => {
                              setChartImage(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                              }
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
                        <Badge variant="outline">
                          <ClipboardPasteIcon data-icon="inline-start" />
                          Paste PNG anywhere
                        </Badge>
                        <CardDescription>
                          Drop a PNG here, paste from clipboard, or pick from
                          downloads.
                        </CardDescription>
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          type="button"
                          variant="outline"
                        >
                          <ImagePlusIcon data-icon="inline-start" />
                          Choose PNG
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
                {chartImage ? null : (
                  <FieldDescription>
                    Required — PNG only (upload, drag-drop, or Ctrl/Cmd+V).
                  </FieldDescription>
                )}
              </Field>
            </FieldSet>

            <FieldSeparator>Notes</FieldSeparator>

            <FieldSet>
              <FieldLegend variant="label">Text or voice note</FieldLegend>
              <FieldDescription>
                At least one is required. Both is fine.
              </FieldDescription>

              <Tabs defaultValue="text">
                <TabsList className="w-full">
                  <TabsTrigger className="flex-1" value="text">
                    Text
                  </TabsTrigger>
                  <TabsTrigger className="flex-1" value="voice">
                    Voice
                  </TabsTrigger>
                </TabsList>

                <TabsContent className="mt-3" value="text">
                  <Field>
                    <FieldLabel htmlFor="notesText">Trade notes</FieldLabel>
                    <Textarea
                      id="notesText"
                      name="notesText"
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="What was the plan? Did you follow it? What would you change?"
                      rows={4}
                      value={notesText}
                    />
                  </Field>
                </TabsContent>

                <TabsContent className="mt-3" value="voice">
                  <Field>
                    <FieldLabel>Voice note</FieldLabel>
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
                            startRecording().catch(() => {
                              // Errors are handled inside startRecording.
                            });
                          }}
                          type="button"
                          variant="outline"
                        >
                          <MicIcon data-icon="inline-start" />
                          {voiceNote ? "Re-record" : "Start recording"}
                        </Button>
                      )}
                      {voiceNote && !isRecording ? (
                        <Button
                          onClick={clearVoice}
                          type="button"
                          variant="ghost"
                        >
                          <Trash2Icon data-icon="inline-start" />
                          Clear
                        </Button>
                      ) : null}
                      {isRecording ? (
                        <Badge variant="destructive">Recording…</Badge>
                      ) : null}
                      {voiceNote && !isRecording ? (
                        <Badge variant="secondary">Voice attached</Badge>
                      ) : null}
                    </div>
                    {voiceNote ? (
                      <audio className="mt-2 w-full" controls src={voiceNote} />
                    ) : null}
                  </Field>
                </TabsContent>
              </Tabs>
            </FieldSet>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Could not save trade</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button
            disabled={pending || isRecording}
            onClick={resetForm}
            type="button"
            variant="outline"
          >
            Reset
          </Button>
          <Button disabled={pending || isRecording} type="submit">
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
        </CardFooter>
      </form>
    </Card>
  );
}
