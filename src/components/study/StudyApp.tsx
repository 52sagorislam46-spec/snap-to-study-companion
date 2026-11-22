import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AudioLines,
  BookOpenCheck,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  ImagePlus,
  Lightbulb,
  LoaderCircle,
  NotebookPen,
  Sparkles,
  Trash2,
  Volume2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { generateStudyPack, speakStudyText } from "@/lib/study.functions";
import type {
  QuestionKind,
  StudyPack,
  StudyPriority,
  StudyQuestion,
  StudyRequest,
  SuggestionImage,
} from "@/lib/study.types";
import { isWithinSuggestionImageLimit, MAX_SUGGESTION_IMAGES } from "@/lib/study.validation";

const IMAGE_LIMIT_BYTES = 360_000;
const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type ResultTab = "topics" | "questions" | "plan";

const timingOptions: Array<{ value: StudyRequest["examTiming"]; label: string }> = [
  { value: "today", label: "আজ" },
  { value: "tomorrow", label: "আগামীকাল" },
  { value: "few-days", label: "২–৩ দিন" },
  { value: "week", label: "১ সপ্তাহ" },
];

const questionKinds: Array<{ value: QuestionKind; label: string; detail: string }> = [
  { value: "short", label: "সংক্ষিপ্ত", detail: "ছোট প্রশ্ন" },
  { value: "medium", label: "মাঝারি", detail: "বর্ণনামূলক" },
  { value: "long", label: "বড়", detail: "রচনামূলক" },
];

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("ছবিটি পড়া যায়নি। অন্য ছবি বেছে নিন।"));
    };
    reader.onerror = () => reject(new Error("ছবিটি পড়া যায়নি। অন্য ছবি বেছে নিন।"));
    reader.readAsDataURL(blob);
  });
}

function makeJpeg(blob: Blob, width: number, height: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("ছবিটি প্রস্তুত করা যায়নি। আবার চেষ্টা করুন।"));
      return;
    }

    createImageBitmap(blob)
      .then((bitmap) => {
        context.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(new Error("ছবিটি প্রস্তুত করা যায়নি। আবার চেষ্টা করুন।"));
          },
          "image/jpeg",
          quality,
        );
      })
      .catch(() => reject(new Error("ছবিটি খোলা যায়নি। অন্য ছবি বেছে নিন.")));
  });
}

async function prepareImage(file: File): Promise<SuggestionImage> {
  let uploadBlob: Blob = file;
  let mimeType: SuggestionImage["mimeType"] = file.type as SuggestionImage["mimeType"];

  if (file.size > IMAGE_LIMIT_BYTES) {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, 1_500 / Math.max(bitmap.width, bitmap.height));
    let scale = ratio;
    let quality = 0.82;
    const baseWidth = bitmap.width;
    const baseHeight = bitmap.height;
    bitmap.close();

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const preview = await makeJpeg(file, Math.max(1, Math.round(baseWidth * scale)), Math.max(1, Math.round(baseHeight * scale)), quality);
      uploadBlob = preview;
      mimeType = "image/jpeg";
      if (preview.size <= IMAGE_LIMIT_BYTES) break;
      if (quality > 0.58) quality -= 0.12;
      else scale *= 0.82;
    }
  }

  if (uploadBlob.size > IMAGE_LIMIT_BYTES) {
    throw new Error("একটি ছবি খুব বড় হয়েছে। ছোট ছবি বেছে নিন।");
  }

  const dataUrl = await readAsDataUrl(uploadBlob);
  const separator = dataUrl.indexOf(",");
  const data = separator >= 0 ? dataUrl.slice(separator + 1) : "";
  if (!data) throw new Error("ছবিটি পড়া যায়নি। অন্য ছবি বেছে নিন।");
  return { mimeType, data };
}

function friendlyError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "এখন কাজটি করা যায়নি। আবার চেষ্টা করুন।";
}

function priorityLabel(priority: StudyPriority): string {
  if (priority === "high") return "আগে পড়ুন";
  if (priority === "medium") return "এরপর পড়ুন";
  return "সময় থাকলে";
}

function priorityClass(priority: StudyPriority): string {
  if (priority === "high") return "bg-primary/10 text-primary";
  if (priority === "medium") return "bg-accent text-accent-foreground";
  return "bg-muted text-muted-foreground";
}

function QuestionRow({
  question,
  number,
  audioUrl,
  audioRef,
  isSpeaking,
  onSpeak,
}: {
  question: StudyQuestion;
  number: number;
  audioUrl: string | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isSpeaking: boolean;
  onSpeak: () => void;
}) {
  return (
    <article className="rounded-md border border-border bg-card px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {number.toLocaleString("bn-BD")}
          </span>
          <span className="text-xs font-medium text-muted-foreground">{question.topic}</span>
        </div>
        <Badge className={`rounded-sm border-0 ${priorityClass(question.priority)}`}>
          {priorityLabel(question.priority)}
        </Badge>
      </div>

      <h4 className="mt-3 text-base font-semibold leading-7 text-foreground">{question.question}</h4>
      <div className="mt-3 border-s-2 border-primary/25 ps-3">
        <p className="mb-1 text-xs font-bold text-primary">উত্তর</p>
        <p className="whitespace-pre-line text-sm leading-7 text-foreground/90">{question.answer}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onSpeak}
          disabled={isSpeaking}
          aria-label="উত্তরটি কণ্ঠে শুনুন"
        >
          {isSpeaking ? <LoaderCircle className="animate-spin" /> : <Volume2 />}
          {isSpeaking ? "অডিও তৈরি হচ্ছে" : audioUrl ? "আবার শুনুন" : "শুনুন"}
        </Button>
        {audioUrl ? (
          <audio ref={audioRef} controls src={audioUrl} className="h-9 w-full max-w-sm" aria-label="উত্তরের অডিও" />
        ) : null}
      </div>
    </article>
  );
}

export function StudyApp() {
  const generate = useServerFn(generateStudyPack);
  const speak = useServerFn(speakStudyText);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlsRef = useRef(new Set<string>());
  const audioUrlRef = useRef<string | null>(null);
  const [mode, setMode] = useState<"images" | "no-images">("images");
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [subject, setSubject] = useState("");
  const [examLevel, setExamLevel] = useState("");
  const [examTiming, setExamTiming] = useState<StudyRequest["examTiming"]>("tomorrow");
  const [focusNotes, setFocusNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pack, setPack] = useState<StudyPack | null>(null);
  const [recognizedText, setRecognizedText] = useState("");
  const [resultTab, setResultTab] = useState<ResultTab>("topics");
  const [questionKind, setQuestionKind] = useState<QuestionKind>("short");
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [audioState, setAudioState] = useState<{ id: string; url: string } | null>(null);

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    },
    [],
  );

  function addImages(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const incoming = Array.from(input.files ?? []);
    input.value = "";
    if (incoming.length === 0) return;

    const accepted = incoming.filter((file) => acceptedImageTypes.includes(file.type));
    if (accepted.length !== incoming.length) {
      setErrorMessage("JPG, PNG বা WebP ছবিই দেওয়া যাবে।");
      return;
    }

    const available = MAX_SUGGESTION_IMAGES - selectedImages.length;
    const additions = accepted.slice(0, Math.max(0, available));
    if (!isWithinSuggestionImageLimit(selectedImages.length + accepted.length)) {
      setErrorMessage(`একসাথে সর্বোচ্চ ${MAX_SUGGESTION_IMAGES.toLocaleString("bn-BD")}টি ছবি দেওয়া যাবে।`);
    } else {
      setErrorMessage("");
    }

    const newImages = additions.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);
      return { id: crypto.randomUUID(), file, previewUrl };
    });
    setSelectedImages((current) => [...current, ...newImages]);
  }

  function removeImage(id: string) {
    setSelectedImages((current) => {
      const removed = current.find((image) => image.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
        previewUrlsRef.current.delete(removed.previewUrl);
      }
      return current.filter((image) => image.id !== id);
    });
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!subject.trim()) {
      setErrorMessage("বিষয়ের নাম লিখুন।");
      return;
    }
    if (mode === "images" && selectedImages.length === 0) {
      setErrorMessage("সাজেশনের ছবি দিন, অথবা ‘সাজেশন নেই’ বেছে নিন।");
      return;
    }

    setBusy(true);
    try {
      const images =
        mode === "images"
          ? await Promise.all(selectedImages.map((image) => prepareImage(image.file)))
          : [];
      const result = await generate({
        data: {
          subject: subject.trim(),
          examLevel: examLevel.trim(),
          examTiming,
          focusNotes: focusNotes.trim(),
          images,
        },
      });
      setPack(result.pack);
      setRecognizedText(result.recognizedText);
      setResultTab("topics");
      setQuestionKind("short");
      setAudioState(null);
    } catch (error) {
      setErrorMessage(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleSpeak(id: string, text: string) {
    setErrorMessage("");
    if (audioState?.id === id && audioRef.current) {
      void audioRef.current.play().catch(() => undefined);
      return;
    }

    setSpeakingId(id);
    try {
      const result = await speak({ data: { text } });
      const binary = atob(result.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(new Blob([bytes], { type: result.mimeType }));
      audioUrlRef.current = url;
      setAudioState({ id, url });
    } catch (error) {
      setErrorMessage(friendlyError(error));
    } finally {
      setSpeakingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/80 bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BookOpenCheck aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold leading-tight">পরীক্ষাসাথী</p>
              <p className="mt-1 text-xs text-muted-foreground">শেষ মুহূর্তের পড়া, গুছিয়ে</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground sm:flex">
            <Clock3 className="size-4" aria-hidden="true" />
            <span>{timingOptions.find((item) => item.value === examTiming)?.label ?? "আগামীকাল"}র প্রস্তুতি</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-sm border-primary/30 bg-primary/5 text-primary">
              <Sparkles className="me-1 size-3" aria-hidden="true" />
              প্রস্তুতি শুরু
            </Badge>
            <span className="text-sm text-muted-foreground">{subject.trim() || "বিষয় বেছে নিন"}</span>
          </div>
          <h1 className="max-w-3xl text-2xl font-bold leading-tight sm:text-3xl">আজ কী পড়বেন, আগে ঠিক করি।</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            সাজেশন থাকলে ছবি দিন, না থাকলে বিষয় লিখুন।
          </p>
        </div>

        {errorMessage ? (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span className="mt-0.5 size-2 shrink-0 rounded-full bg-destructive" aria-hidden="true" />
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(300px,0.76fr)_minmax(0,1.24fr)] lg:gap-10">
          <aside>
            <Card className="rounded-lg border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/70 px-5 py-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <NotebookPen className="size-4 text-primary" aria-hidden="true" />
                  পরীক্ষার তথ্য
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 py-5">
                <form onSubmit={handleGenerate} className="space-y-5">
                  <Tabs value={mode} onValueChange={(value) => setMode(value === "no-images" ? "no-images" : "images")}>
                    <TabsList className="grid h-auto w-full grid-cols-2 rounded-md bg-muted p-1">
                      <TabsTrigger value="images" className="min-h-10 gap-2 rounded-sm px-2 text-xs sm:text-sm">
                        <ImagePlus className="size-4" aria-hidden="true" /> ছবি আছে
                      </TabsTrigger>
                      <TabsTrigger value="no-images" className="min-h-10 gap-2 rounded-sm px-2 text-xs sm:text-sm">
                        <FileText className="size-4" aria-hidden="true" /> সাজেশন নেই
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="images" className="mt-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">সাজেশনের ছবি</p>
                          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG বা WebP</p>
                        </div>
                        <span className="shrink-0 rounded-sm bg-muted px-2 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
                          {selectedImages.length.toLocaleString("bn-BD")} / {MAX_SUGGESTION_IMAGES.toLocaleString("bn-BD")}
                        </span>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="sr-only"
                        aria-label="সাজেশনের ছবি বেছে নিন"
                        onChange={addImages}
                      />
                      <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center">
                        <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-card text-primary shadow-sm">
                          <ImagePlus className="size-5" aria-hidden="true" />
                        </div>
                        <p className="mt-3 text-sm font-semibold">একসাথে একাধিক ছবি বেছে নিন</p>
                        <p className="mt-1 text-xs text-muted-foreground">সর্বোচ্চ ২০টি</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={selectedImages.length >= MAX_SUGGESTION_IMAGES}
                        >
                          <ImagePlus aria-hidden="true" />
                          ছবি বাছুন
                        </Button>
                      </div>

                      {selectedImages.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {selectedImages.map((image, index) => (
                            <div key={image.id} className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
                              <img
                                src={image.previewUrl}
                                alt={`সাজেশনের ছবি ${index + 1}`}
                                className="size-full object-cover"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                className="absolute end-1 top-1 size-7 opacity-100 shadow-sm sm:opacity-0 sm:group-hover:opacity-100"
                                onClick={() => removeImage(image.id)}
                                aria-label={`${index + 1} নম্বর ছবি সরান`}
                                title="ছবি সরান"
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </TabsContent>

                    <TabsContent value="no-images" className="mt-4 rounded-md border border-border bg-muted/30 p-4">
                      <div className="flex gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-card text-primary shadow-sm">
                          <FileText className="size-4" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">সাজেশন ছাড়াই প্রস্তুতি</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">বিষয় ও শ্রেণি লিখলেই প্রশ্ন তৈরি হবে।</p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="space-y-2">
                    <label htmlFor="subject" className="text-sm font-semibold">বিষয়</label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(event) => setSubject(event.currentTarget.value)}
                      placeholder="যেমন: বাংলা, জীববিজ্ঞান"
                      autoComplete="off"
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="exam-level" className="text-sm font-semibold">
                      শ্রেণি বা পরীক্ষার নাম <span className="font-normal text-muted-foreground">(ঐচ্ছিক)</span>
                    </label>
                    <Input
                      id="exam-level"
                      value={examLevel}
                      onChange={(event) => setExamLevel(event.currentTarget.value)}
                      placeholder="যেমন: নবম শ্রেণি / HSC"
                      autoComplete="off"
                      maxLength={100}
                    />
                  </div>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold">পরীক্ষা কবে?</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {timingOptions.map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={examTiming === option.value ? "secondary" : "outline"}
                          size="sm"
                          className="justify-start"
                          onClick={() => setExamTiming(option.value)}
                          aria-pressed={examTiming === option.value}
                        >
                          {examTiming === option.value ? <Check aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="space-y-2">
                    <label htmlFor="focus-notes" className="text-sm font-semibold">
                      অধ্যায় বা বাড়তি নোট <span className="font-normal text-muted-foreground">(ঐচ্ছিক)</span>
                    </label>
                    <Textarea
                      id="focus-notes"
                      value={focusNotes}
                      onChange={(event) => setFocusNotes(event.currentTarget.value)}
                      placeholder="যে অধ্যায়ে বেশি জোর দিতে চান"
                      rows={3}
                      maxLength={4_000}
                    />
                  </div>

                  <Button type="submit" className="h-11 w-full rounded-md" disabled={busy}>
                    {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                    {busy ? "প্রশ্ন তৈরি হচ্ছে…" : "প্রস্তুতি তৈরি করুন"}
                    {!busy ? <ChevronRight className="ms-auto" aria-hidden="true" /> : null}
                  </Button>
                  <p className="text-center text-xs leading-5 text-muted-foreground">
                    প্রশ্নগুলো প্রস্তুতির সহায়তা—পরীক্ষার প্রশ্ন বা পাসের নিশ্চয়তা নয়।
                  </p>
                </form>
              </CardContent>
            </Card>
          </aside>

          <section aria-live="polite" className="min-w-0">
            {pack ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-sm border-primary/30 bg-primary/5 text-primary">
                        <Check className="me-1 size-3" aria-hidden="true" />
                        প্রস্তুত
                      </Badge>
                      {recognizedText ? (
                        <span className="text-xs text-muted-foreground">ছবির সাজেশন থেকে</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">সাধারণ বিষয়ভিত্তিক প্রস্তুতি</span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold leading-snug sm:text-2xl">{pack.title}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{pack.summary}</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setPack(null)}>
                    <NotebookPen aria-hidden="true" />
                    নতুন প্রস্তুতি
                  </Button>
                </div>

                <Tabs
                  value={resultTab}
                  onValueChange={(value) => {
                    if (value === "topics" || value === "questions" || value === "plan") setResultTab(value);
                  }}
                >
                  <TabsList className="grid h-auto w-full grid-cols-3 rounded-md bg-muted p-1">
                    <TabsTrigger value="topics" className="min-h-10 gap-2 rounded-sm px-2 text-xs sm:text-sm">
                      <NotebookPen className="size-4" aria-hidden="true" /> বিষয়
                    </TabsTrigger>
                    <TabsTrigger value="questions" className="min-h-10 gap-2 rounded-sm px-2 text-xs sm:text-sm">
                      <FileText className="size-4" aria-hidden="true" /> প্রশ্ন–উত্তর
                    </TabsTrigger>
                    <TabsTrigger value="plan" className="min-h-10 gap-2 rounded-sm px-2 text-xs sm:text-sm">
                      <Clock3 className="size-4" aria-hidden="true" /> পড়ার সময়
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="topics" className="mt-5">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <BookOpenCheck className="size-4" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="font-semibold">আগে যেগুলো পড়বেন</h3>
                        <p className="text-xs text-muted-foreground">গুরুত্ব অনুযায়ী সাজানো</p>
                      </div>
                    </div>
                    <ol className="divide-y divide-border border-y border-border">
                      {pack.topics.map((topic, index) => (
                        <li key={`${topic.name}-${index}`} className="flex items-start gap-3 py-4">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                            {(index + 1).toLocaleString("bn-BD")}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold">{topic.name}</h4>
                              <Badge className={`rounded-sm border-0 ${priorityClass(topic.priority)}`}>
                                {priorityLabel(topic.priority)}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{topic.reason}</p>
                          </div>
                          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </li>
                      ))}
                    </ol>
                    {recognizedText ? (
                      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                        ছবির লেখা পড়ে বিষয়গুলো মিলিয়ে সাজানো হয়েছে। ঝাপসা লেখা থাকলে মূল ছবির সঙ্গে মিলিয়ে নিন।
                      </p>
                    ) : null}
                  </TabsContent>

                  <TabsContent value="questions" className="mt-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">প্রশ্ন ও উত্তর</h3>
                        <p className="mt-1 text-xs text-muted-foreground">প্রতিটি উত্তরের পাশে কণ্ঠে শোনার সুবিধা</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {questionKinds.map((kind) => (
                          <Button
                            key={kind.value}
                            type="button"
                            size="sm"
                            variant={questionKind === kind.value ? "secondary" : "outline"}
                            onClick={() => setQuestionKind(kind.value)}
                            aria-pressed={questionKind === kind.value}
                          >
                            {kind.label}
                            <span className="text-xs text-muted-foreground">
                              {pack.questions[kind.value].length.toLocaleString("bn-BD")}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                      <AudioLines className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      {questionKinds.find((kind) => kind.value === questionKind)?.detail ?? "প্রশ্ন"} — উত্তরসহ
                    </div>

                    <div className="space-y-3">
                      {pack.questions[questionKind].map((question, index) => {
                        const id = `${questionKind}-${index}`;
                        return (
                          <QuestionRow
                            key={id}
                            question={question}
                            number={index + 1}
                            audioUrl={audioState?.id === id ? audioState.url : null}
                            audioRef={audioRef}
                            isSpeaking={speakingId === id}
                            onSpeak={() => void handleSpeak(id, question.answer)}
                          />
                        );
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="plan" className="mt-5 space-y-5">
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                          <Clock3 className="size-4" aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="font-semibold">এখন থেকে পরীক্ষার আগে</h3>
                          <p className="text-xs text-muted-foreground">প্রথমে জরুরি বিষয়, শেষে ঝালাই</p>
                        </div>
                      </div>
                      <ol className="space-y-3">
                        {pack.studyPlan.map((step, index) => (
                          <li key={`${step.time}-${index}`} className="flex gap-3">
                            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                              {(index + 1).toLocaleString("bn-BD")}
                            </span>
                            <div className="min-w-0 flex-1 border-b border-border pb-3">
                              <p className="text-sm font-semibold">{step.time}</p>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.task}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="border-t border-border pt-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Lightbulb className="size-4 text-accent-foreground" aria-hidden="true" />
                        <h3 className="font-semibold">শেষ মুহূর্তের কথা</h3>
                      </div>
                      <ul className="space-y-2">
                        {pack.lastMinuteTips.map((tip, index) => (
                          <li key={`${tip.slice(0, 18)}-${index}`} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                            <Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="flex min-h-96 flex-col justify-center border-y border-border py-10 lg:min-h-[34rem] lg:px-8">
                <div className="flex size-12 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  <BookOpenCheck className="size-6" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-xl font-bold">আপনার প্রস্তুতির খাতা</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  বিষয়ের নাম দিয়ে শুরু করুন। তৈরি হলে সাজানো বিষয়, তিন ধরনের প্রশ্ন–উত্তর ও পড়ার পরিকল্পনা এখানে আসবে।
                </p>
                <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2"><ImagePlus className="size-4 text-primary" aria-hidden="true" /> ছবি থেকে সাজেশন</span>
                  <span className="inline-flex items-center gap-2"><FileText className="size-4 text-primary" aria-hidden="true" /> উত্তরসহ প্রশ্ন</span>
                  <span className="inline-flex items-center gap-2"><Volume2 className="size-4 text-primary" aria-hidden="true" /> বাংলা কণ্ঠ</span>
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-10 flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>নিজের বই ও শিক্ষকের নির্দেশনার সঙ্গে উত্তর মিলিয়ে নিন।</p>
          <p className="inline-flex items-center gap-1"><Sparkles className="size-3" aria-hidden="true" /> মনোযোগ দিন সবচেয়ে জরুরি অধ্যায়ে</p>
        </footer>
      </main>
    </div>
  );
}