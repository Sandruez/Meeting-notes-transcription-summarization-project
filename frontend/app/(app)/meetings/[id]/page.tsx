"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Check, X, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeeting, useUpdateMeetingTitle } from "@/hooks/useMeeting";
import { useTranscriptSync } from "@/hooks/useTranscriptSync";
import { MediaPlayer } from "@/components/player/MediaPlayer";
import { TranscriptPanel } from "@/components/transcript/TranscriptPanel";
import { SummaryPanel } from "@/components/summary/SummaryPanel";
import { ActionItemList } from "@/components/summary/ActionItemList";
import { KeyTopics } from "@/components/summary/KeyTopics";
import { AvatarStack } from "@/components/meetings/AvatarStack";
import { DeleteMeetingDialog } from "@/components/meetings/DeleteMeetingDialog";
import { formatMeetingDate, formatDuration } from "@/lib/utils";

const TABS = ["Summary", "Action Items", "Key Topics", "Notes"] as const;
type Tab = (typeof TABS)[number];

function InlineEditTitle({ title, meetingId }: { title: string; meetingId: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(title);
  const update = useUpdateMeetingTitle(meetingId);

  useEffect(() => { setVal(title); }, [title]);

  const save = () => {
    const t = val.trim();
    if (t && t !== title) update.mutate(t);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setVal(title); setEditing(false); }
          }}
          className="h-8 text-lg font-semibold"
          autoFocus
        />
        <button onClick={save} className="text-brand-500" aria-label="Save"><Check className="h-4 w-4" /></button>
        <button onClick={() => { setVal(title); setEditing(false); }} className="text-muted-foreground" aria-label="Cancel"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="group flex items-center gap-2 text-left">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: meeting, isLoading, isError } = useMeeting(id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Summary");
  const containerRef = useRef<HTMLDivElement>(null);

  const lines = meeting?.transcript?.lines ?? [];
  const { seekTo, activeLineIndex, handleTimeUpdate, handleLineClick, handleSeekComplete } =
    useTranscriptSync({ lines, containerRef });

  const exportMarkdown = () => {
    if (!meeting) return;
    const transcript_text = meeting.transcript?.lines
      .map((l) => `[${formatTimestamp(l.timestamp_start)}] ${l.speaker_name}: ${l.text}`)
      .join("\n") ?? "";
    const md = [
      `# ${meeting.title}`,
      `Date: ${formatMeetingDate(meeting.date)} | Duration: ${formatDuration(meeting.duration_seconds)}`,
      `Participants: ${meeting.participants.map((p) => p.name).join(", ")}`,
      "",
      "## Summary",
      meeting.summary?.overview ?? "Not generated",
      "",
      "## Key Topics",
      (meeting.summary?.key_topics ?? []).map((t) => `- ${t}`).join("\n"),
      "",
      "## Action Items",
      meeting.action_items.map((a) => `- [${a.completed ? "x" : " "}] ${a.task}${a.owner ? ` (${a.owner})` : ""}`).join("\n"),
      "",
      "## Transcript",
      transcript_text,
    ].join("\n");

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meeting.title.replace(/[^a-z0-9]/gi, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col">
        <div className="border-b border-surface-border p-4">
          <Skeleton className="h-7 w-64" /><Skeleton className="mt-2 h-4 w-48" />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-[3] space-y-4 border-r border-surface-border p-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
          <div className="flex-[2] space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !meeting) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-semibold">Meeting not found</p>
        <Link href="/meetings"><Button variant="outline">← Back to Meetings</Button></Link>
      </div>
    );
  }

  const completedCount = meeting.action_items.filter((a) => a.completed).length;
  const totalCount = meeting.action_items.length;

  return (
    <>
      <div className="flex h-[calc(100vh-64px)] flex-col">
        {/* Page header */}
        <div className="shrink-0 border-b border-surface-border bg-white px-4 py-3 dark:border-sidebar-hover dark:bg-sidebar-bg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Link href="/meetings" className="mt-1 shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 dark:hover:bg-sidebar-hover">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <InlineEditTitle title={meeting.title} meetingId={meeting.id} />
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatMeetingDate(meeting.date)}</span>
                  <span>·</span>
                  <span>{formatDuration(meeting.duration_seconds)}</span>
                  <span>·</span>
                  <AvatarStack participants={meeting.participants} size="sm" max={5} />
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportMarkdown}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDeleteOpen(true)} className="text-red-500 hover:border-red-300 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Two-panel body */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Player + Transcript */}
          <div className="flex flex-[3] min-w-0 flex-col border-r border-surface-border dark:border-sidebar-hover">
            <div className="shrink-0">
              <MediaPlayer
                duration={meeting.duration_seconds}
                onTimeUpdate={handleTimeUpdate}
                seekTo={seekTo}
                onSeekComplete={handleSeekComplete}
              />
            </div>
            <div ref={containerRef} className="flex-1 overflow-hidden">
              <TranscriptPanel lines={lines} activeLineIndex={activeLineIndex} onLineClick={handleLineClick} />
            </div>
          </div>

          {/* RIGHT: Tabs */}
          <div className="flex flex-[2] min-w-0 flex-col">
            <div className="shrink-0 flex overflow-x-auto border-b border-surface-border dark:border-sidebar-hover">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "border-brand-500 text-brand-600 dark:text-brand-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                  {tab === "Action Items" && totalCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                      {completedCount}/{totalCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeTab === "Summary" && (
                <SummaryPanel meetingId={meeting.id} summary={meeting.summary} status={meeting.status} onChapterSeek={handleLineClick} />
              )}
              {activeTab === "Action Items" && (
                <ActionItemList meetingId={meeting.id} items={meeting.action_items} participants={meeting.participants} />
              )}
              {activeTab === "Key Topics" && <KeyTopics summary={meeting.summary} />}
              {activeTab === "Notes" && (
                <div className="p-4 text-sm text-muted-foreground">Notes feature coming soon.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <DeleteMeetingDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        meetingId={meeting.id}
        meetingTitle={meeting.title}
        onDeleted={() => router.push("/meetings")}
      />
    </>
  );
}

function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
