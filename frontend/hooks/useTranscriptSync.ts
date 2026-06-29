"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { TranscriptLine } from "@/lib/types";

interface UseTranscriptSyncOptions {
  lines: TranscriptLine[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useTranscriptSync({ lines }: UseTranscriptSyncOptions) {
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTo, setSeekTo] = useState<number | null>(null);

  const activeLineIndex = lines.findIndex(
    (line, i) =>
      currentTime >= line.timestamp_start &&
      (i === lines.length - 1 || currentTime < lines[i + 1].timestamp_start)
  );

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleLineClick = useCallback((timestampStart: number) => {
    setSeekTo(timestampStart);
    setCurrentTime(timestampStart);
  }, []);

  const handleSeekComplete = useCallback(() => {
    setSeekTo(null);
  }, []);

  return {
    currentTime,
    seekTo,
    activeLineIndex,
    handleTimeUpdate,
    handleLineClick,
    handleSeekComplete,
  };
}
