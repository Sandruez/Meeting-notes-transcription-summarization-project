"use client";

import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Plus, Check, Loader2, Upload, ChevronRight, ChevronLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { meetingsApi } from "@/lib/api";
import type { Participant, MeetingStatusResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CreateMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 1 | 2 | 3;

const STEP_LABELS = ["Basic Info", "Transcript", "Processing"];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-center gap-2 pb-4">
      {STEP_LABELS.map((label, i) => {
        const step = (i + 1) as Step;
        const done = current > step;
        const active = current === step;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                done
                  ? "bg-brand-500 text-white"
                  : active
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-400 dark:bg-sidebar-active dark:text-sidebar-text"
              )}
            >
              {done ? <Check className="h-4 w-4" /> : step}
            </div>
            <span
              className={cn(
                "hidden text-xs sm:inline",
                active ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <div className="h-px w-6 bg-gray-200 dark:bg-sidebar-active" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ParticipantInput({
  value,
  onChange,
}: {
  value: Participant[];
  onChange: (p: Participant[]) => void;
}) {
  const [inputVal, setInputVal] = useState("");

  const add = () => {
    const name = inputVal.trim();
    if (!name || value.some((p) => p.name.toLowerCase() === name.toLowerCase()))
      return;
    onChange([...value, { name }]);
    setInputVal("");
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Add participant name..."
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={!inputVal.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((p, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
            >
              {p.name}
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-1 rounded-full hover:text-brand-900"
                aria-label={`Remove ${p.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function CreateMeetingModal({ open, onOpenChange }: CreateMeetingModalProps) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>(1);

  // Step 1 state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Step 2 state
  const [transcriptTab, setTranscriptTab] = useState<"paste" | "upload" | "skip">("paste");
  const [transcriptText, setTranscriptText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 3 state
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<"idle" | "creating" | "polling" | "done" | "error">("idle");
  const [, setPollStatus] = useState<MeetingStatusResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    setStep(1);
    setTitle("");
    setDate(new Date().toISOString().slice(0, 16));
    setParticipants([]);
    setTranscriptTab("paste");
    setTranscriptText("");
    setUploadedFile(null);
    setCreatedId(null);
    setProcessingStatus("idle");
    setPollStatus(null);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  // Step 1 → 2
  const toStep2 = () => {
    if (!title.trim()) return toast.error("Meeting title is required");
    if (participants.length === 0) return toast.error("Add at least one participant");
    setStep(2);
  };

  // Step 2 → 3 (submit)
  const submit = async () => {
    setStep(3);
    setProcessingStatus("creating");

    let transcript: string | undefined;
    let fileType: string | undefined;

    if (transcriptTab === "paste" && transcriptText.trim()) {
      transcript = transcriptText.trim();
      fileType = "txt";
    } else if (transcriptTab === "upload" && uploadedFile) {
      transcript = await uploadedFile.text();
      fileType = uploadedFile.name.split(".").pop() ?? "txt";
    }

    try {
      const { data: meeting } = await meetingsApi.create({
        title: title.trim(),
        date: new Date(date).toISOString(),
        participants,
        transcript_text: transcript,
        transcript_file_type: fileType as "txt" | "vtt" | "json" | undefined,
      });

      setCreatedId(meeting.id);
      qc.invalidateQueries({ queryKey: ["meetings"] });

      if (transcript) {
        setProcessingStatus("polling");
        pollRef.current = setInterval(async () => {
          try {
            const { data: s } = await meetingsApi.getStatus(meeting.id);
            setPollStatus(s);
            if (s.status === "ready" || s.status === "error") {
              clearInterval(pollRef.current!);
              setProcessingStatus(s.status === "ready" ? "done" : "error");
              qc.invalidateQueries({ queryKey: ["meetings"] });
            }
          } catch {
            /* keep polling */
          }
        }, 2000);
      } else {
        setProcessingStatus("done");
      }
    } catch (err: unknown) {
      setProcessingStatus("error");
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to create meeting";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Meeting</DialogTitle>
        </DialogHeader>

        <StepIndicator current={step} />

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title *</label>
              <Input
                placeholder="e.g. Q3 Product Review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && toStep2()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date & Time *</label>
              <Input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Participants * <span className="text-muted-foreground font-normal">(press Enter to add)</span>
              </label>
              <ParticipantInput value={participants} onChange={setParticipants} />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={toStep2} className="bg-brand-500 text-white hover:bg-brand-600">
                Next: Add Transcript <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex rounded-lg border border-surface-border dark:border-sidebar-hover overflow-hidden">
              {(["paste", "upload", "skip"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTranscriptTab(tab)}
                  className={cn(
                    "flex-1 py-2 text-xs font-medium capitalize transition-colors",
                    transcriptTab === tab
                      ? "bg-brand-500 text-white"
                      : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-sidebar-hover"
                  )}
                >
                  {tab === "paste" ? "Paste Text" : tab === "upload" ? "Upload File" : "Skip"}
                </button>
              ))}
            </div>

            {transcriptTab === "paste" && (
              <textarea
                className="w-full rounded-lg border border-surface-border bg-white p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-sidebar-hover dark:bg-sidebar-hover"
                rows={10}
                placeholder={"[00:00:05] Speaker Name: Hello everyone...\n[00:00:18] Jane Doe: Thanks for joining!"}
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
              />
            )}

            {transcriptTab === "upload" && (
              <div
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-surface-border py-10 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/30 dark:border-sidebar-hover dark:hover:bg-sidebar-hover"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                {uploadedFile ? (
                  <div>
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium">Click to upload transcript</p>
                    <p className="text-xs text-muted-foreground">Accepts .txt, .vtt, .json</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.vtt,.json"
                  className="hidden"
                  onChange={(e) => setUploadedFile(e.target.files?.[0] ?? null)}
                />
              </div>
            )}

            {transcriptTab === "skip" && (
              <p className="rounded-lg bg-gray-50 p-4 text-sm text-muted-foreground dark:bg-sidebar-hover">
                The meeting will be created without a transcript. You can add one later.
              </p>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={submit} className="bg-brand-500 text-white hover:bg-brand-600">
                Create Meeting <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div className="space-y-6 py-4">
            {processingStatus === "creating" && (
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                <p className="font-medium">Creating meeting...</p>
              </div>
            )}

            {(processingStatus === "polling" || processingStatus === "done" || processingStatus === "error") && (
              <div className="space-y-3">
                <ProcessingStep done label="Meeting created" />
                <ProcessingStep
                  done={processingStatus === "done" || processingStatus === "error"}
                  spinning={processingStatus === "polling"}
                  label="Parsing transcript..."
                />
                <ProcessingStep
                  done={processingStatus === "done"}
                  spinning={processingStatus === "polling"}
                  error={processingStatus === "error"}
                  label="Generating AI summary..."
                />
                <ProcessingStep
                  done={processingStatus === "done"}
                  spinning={processingStatus === "polling"}
                  error={processingStatus === "error"}
                  label="Extracting action items..."
                />
              </div>
            )}

            {processingStatus === "done" && (
              <div className="flex flex-col items-center gap-3 pt-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Check className="h-6 w-6" />
                </div>
                <p className="font-medium text-emerald-700 dark:text-emerald-400">Ready!</p>
                <a
                  href={`/meetings/${createdId}`}
                  onClick={() => handleClose(false)}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                >
                  View Meeting →
                </a>
              </div>
            )}

            {processingStatus === "error" && (
              <div className="flex flex-col items-center gap-3 pt-2 text-center">
                <p className="text-sm text-red-600">AI processing failed. The meeting was created but may lack a summary.</p>
                <Button variant="outline" onClick={() => handleClose(false)}>
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProcessingStep({
  done,
  spinning,
  error,
  label,
}: {
  done?: boolean;
  spinning?: boolean;
  error?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {done ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="h-3 w-3" />
        </span>
      ) : spinning ? (
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      ) : error ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-50 text-red-500">✕</span>
      ) : (
        <span className="h-5 w-5 rounded-full border-2 border-gray-200 dark:border-sidebar-active" />
      )}
      <span className={cn(done ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}
