"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward,
} from "lucide-react";
import { formatTimestamp } from "@/lib/utils";

interface MediaPlayerProps {
  duration: number;
  onTimeUpdate: (time: number) => void;
  seekTo: number | null;
  onSeekComplete: () => void;
}

const RATES = [0.75, 1, 1.25, 1.5, 2];

export function MediaPlayer({ duration, onTimeUpdate, seekTo, onSeekComplete }: MediaPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [rate, setRate] = useState(1);
  // simulate playback when no real audio
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAudio = false; // set true when a real audio file is wired up

  const totalDuration = duration || 3600;

  const clearSim = () => {
    if (simRef.current) { clearInterval(simRef.current); simRef.current = null; }
  };

  const playSimulated = useCallback(() => {
    clearSim();
    simRef.current = setInterval(() => {
      setCurrentTime((t) => {
        const next = Math.min(t + 0.25 * rate, totalDuration);
        onTimeUpdate(next);
        if (next >= totalDuration) {
          clearSim();
          setIsPlaying(false);
        }
        return next;
      });
    }, 250);
  }, [rate, totalDuration, onTimeUpdate]);

  const pauseSim = useCallback(() => clearSim(), []);

  const toggle = () => {
    if (hasAudio && audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
    } else {
      if (isPlaying) pauseSim();
      else playSimulated();
    }
    setIsPlaying((p) => !p);
  };

  const seek = (t: number) => {
    const clamped = Math.max(0, Math.min(t, totalDuration));
    setCurrentTime(clamped);
    onTimeUpdate(clamped);
    if (audioRef.current) audioRef.current.currentTime = clamped;
    if (isPlaying && !hasAudio) playSimulated();
  };

  // respond to external seekTo
  useEffect(() => {
    if (seekTo !== null) {
      seek(seekTo);
      onSeekComplete();
    }
  }, [seekTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      if (e.code === "ArrowLeft") seek(currentTime - 5);
      if (e.code === "ArrowRight") seek(currentTime + 5);
      if (e.code === "KeyM") { setIsMuted((m) => !m); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }); // intentionally no deps — uses current values

  useEffect(() => () => clearSim(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex flex-col gap-2 bg-[#1A1A2E] px-4 py-3">
      <audio ref={audioRef} src="/sample-audio.mp3" preload="metadata" />

      {/* Seek bar */}
      <div className="flex items-center gap-3">
        <span className="w-10 shrink-0 text-right font-mono text-xs text-gray-400">
          {formatTimestamp(currentTime)}
        </span>
        <div className="relative flex-1 group">
          <input
            type="range"
            min={0}
            max={totalDuration}
            step={0.5}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            className="w-full cursor-pointer appearance-none rounded-full bg-gray-600 h-1.5 accent-brand-500 group-hover:h-2 transition-all"
            style={{
              background: `linear-gradient(to right, #7C3AED ${progress}%, #4B5563 ${progress}%)`,
            }}
          />
        </div>
        <span className="w-10 shrink-0 font-mono text-xs text-gray-400">
          {formatTimestamp(totalDuration)}
        </span>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => seek(currentTime - 5)}
            aria-label="Skip back 5 seconds"
            className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={toggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 pl-0.5" />}
          </button>

          <button
            onClick={() => seek(currentTime + 5)}
            aria-label="Skip forward 5 seconds"
            className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Volume */}
          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={() => setIsMuted((m) => !m)}
              aria-label={isMuted ? "Unmute" : "Mute"}
              className="text-gray-400 hover:text-white"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setIsMuted(false);
                if (audioRef.current) audioRef.current.volume = Number(e.target.value);
              }}
              aria-label="Volume"
              className="w-20 cursor-pointer accent-brand-500"
            />
          </div>

          {/* Playback rate */}
          <select
            value={rate}
            onChange={(e) => {
              const r = Number(e.target.value);
              setRate(r);
              if (audioRef.current) audioRef.current.playbackRate = r;
              if (isPlaying && !hasAudio) playSimulated();
            }}
            aria-label="Playback speed"
            className="rounded bg-white/10 px-2 py-1 text-xs text-gray-300 hover:bg-white/20"
          >
            {RATES.map((r) => (
              <option key={r} value={r}>{r}x</option>
            ))}
          </select>
        </div>
      </div>

      {!hasAudio && (
        <p className="text-center text-[10px] text-gray-500">
          Simulated playback — add /public/sample-audio.mp3 for real audio
        </p>
      )}
    </div>
  );
}
