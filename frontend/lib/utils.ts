import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "47 min" or "1h 22m" */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0 min";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} min`;
}

/** "1:23" or "1:02:03" — for player/transcript timestamps. */
export function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/** "Mon, Jul 14 · 2:30 PM" */
export function formatMeetingDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "EEE, MMM d · h:mm a");
}

/** "Today", "Yesterday", or "3 days ago" */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return formatDistanceToNow(d, { addSuffix: true });
}

/** Initials from a name: "Sarah Chen" -> "SC" */
export function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// A stable palette for speaker avatars (index = speaker order).
export const SPEAKER_COLORS = [
  "#7C3AED", // brand purple
  "#2563EB", // blue
  "#059669", // emerald
  "#DC2626", // red
  "#D97706", // amber
  "#DB2777", // pink
  "#0891B2", // cyan
  "#65A30D", // lime
];

/** Deterministic color for a speaker id/name. */
export function speakerColor(key: string, index?: number): string {
  if (typeof index === "number") {
    return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
  }
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return SPEAKER_COLORS[hash % SPEAKER_COLORS.length];
}
