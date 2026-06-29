"use client";

import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, X, Bookmark, BookmarkCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, formatTimestamp, speakerColor, getInitials } from "@/lib/utils";
import type { TranscriptLine } from "@/lib/types";
import api from "@/lib/api";

interface TranscriptPanelProps {
  lines: TranscriptLine[];
  activeLineIndex: number;
  onLineClick: (timestamp: number) => void;
  meetingId: string;
}

function useTranscriptSearch(lines: TranscriptLine[]) {
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return lines
      .map((line, index) => ({ index, hit: line.text.toLowerCase().includes(q) }))
      .filter((m) => m.hit)
      .map((m) => m.index);
  }, [lines, query]);

  const navigate = (dir: 1 | -1) => {
    if (!matches.length) return;
    setMatchIndex((i) => (i + dir + matches.length) % matches.length);
  };

  return { query, setQuery, matches, matchIndex, navigate };
}

function highlightText(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-500/30 dark:text-yellow-100">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function HighlightButton({ meetingId, lineId }: { meetingId: string; lineId: string }) {
  const [highlighted, setHighlighted] = useState(false);

  const highlight = useMutation({
    mutationFn: () =>
      api.post(`/api/meetings/${meetingId}/highlights`, { transcript_line_id: lineId }),
    onSuccess: () => {
      setHighlighted(true);
      toast.success("Line highlighted");
    },
    onError: () => toast.error("Failed to highlight"),
  });

  return (
    <button
      onClick={(e) => { e.stopPropagation(); highlight.mutate(); }}
      className={cn(
        "shrink-0 rounded p-1 transition-all",
        highlighted
          ? "text-brand-500"
          : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-brand-500"
      )}
      aria-label="Highlight this line"
      title="Highlight"
    >
      {highlighted
        ? <BookmarkCheck className="h-3.5 w-3.5" />
        : <Bookmark className="h-3.5 w-3.5" />
      }
    </button>
  );
}

export function TranscriptPanel({ lines, activeLineIndex, onLineClick, meetingId }: TranscriptPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const { query, setQuery, matches, matchIndex, navigate } = useTranscriptSearch(lines);

  useEffect(() => {
    if (activeLineIndex < 0 || query) return;
    const el = lineRefs.current.get(activeLineIndex);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeLineIndex, query]);

  useEffect(() => {
    if (!matches.length) return;
    const el = lineRefs.current.get(matches[matchIndex]);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [matches, matchIndex]);

  const speakerMap = useMemo(() => {
    const seen = new Map<string, number>();
    lines.forEach((l) => { if (!seen.has(l.speaker_id)) seen.set(l.speaker_id, seen.size); });
    return seen;
  }, [lines]);

  const setLineRef = useCallback((el: HTMLDivElement | null, index: number) => {
    if (el) lineRefs.current.set(index, el);
    else lineRefs.current.delete(index);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="shrink-0 border-b border-surface-border p-3 dark:border-sidebar-hover">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transcript..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
                if (e.key === "Enter") navigate(e.shiftKey ? -1 : 1);
              }}
              className="pl-9 pr-4 text-sm"
              aria-label="Search transcript"
            />
          </div>
          {query && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {matches.length === 0 ? "No matches" : `${matchIndex + 1} of ${matches.length}`}
              </span>
              <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-sidebar-hover text-muted-foreground">↑</button>
              <button onClick={() => navigate(1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-sidebar-hover text-muted-foreground">↓</button>
              <button onClick={() => setQuery("")} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-sidebar-hover text-muted-foreground" aria-label="Clear search">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lines */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {lines.map((line, index) => {
          const isActive = index === activeLineIndex;
          const isSearchMatch = !!query && matches.includes(index);
          const colorIdx = speakerMap.get(line.speaker_id) ?? 0;
          const color = speakerColor(line.speaker_id, colorIdx);

          return (
            <div
              key={line.id}
              ref={(el) => setLineRef(el, index)}
              onClick={() => onLineClick(line.timestamp_start)}
              className={cn(
                "group flex gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors",
                isActive
                  ? "border-l-2 border-brand-500 bg-brand-50/60 dark:bg-brand-500/10 pl-2.5"
                  : "hover:bg-gray-50 dark:hover:bg-sidebar-hover",
                isSearchMatch && !isActive && "bg-yellow-50/60 dark:bg-yellow-500/5"
              )}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onLineClick(line.timestamp_start); }}
              aria-label={`${line.speaker_name} at ${formatTimestamp(line.timestamp_start)}: ${line.text}`}
            >
              <div
                className="flex h-7 w-7 shrink-0 mt-0.5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
                title={line.speaker_name}
              >
                {getInitials(line.speaker_name)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-semibold" style={{ color }}>{line.speaker_name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onLineClick(line.timestamp_start); }}
                    className="font-mono text-[11px] text-muted-foreground hover:text-brand-500 transition-colors"
                    aria-label={`Seek to ${formatTimestamp(line.timestamp_start)}`}
                  >
                    {formatTimestamp(line.timestamp_start)}
                  </button>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                  {query ? highlightText(line.text, query) : line.text}
                </p>
              </div>

              <HighlightButton meetingId={meetingId} lineId={line.id} />
            </div>
          );
        })}

        {lines.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No transcript available for this meeting.
          </div>
        )}
      </div>
    </div>
  );
}
