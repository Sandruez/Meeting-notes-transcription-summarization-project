"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  MoreVertical,
  Clock,
  ListChecks,
  MessageSquare,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { AvatarStack } from "./AvatarStack";
import { DeleteMeetingDialog } from "./DeleteMeetingDialog";
import { formatMeetingDate, formatDuration } from "@/lib/utils";
import type { MeetingListItem } from "@/lib/types";

function StatusBadge({ status }: { status: MeetingListItem["status"] }) {
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Ready
    </span>
  );
}

export function MeetingCard({ meeting }: { meeting: MeetingListItem }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-xl border border-surface-border bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cardHover dark:border-sidebar-hover dark:bg-sidebar-hover">
        {/* Accent strip */}
        <div className="h-[3px] w-full bg-gradient-to-r from-brand-500 to-brand-400" />

        {/* Stretched link (covers the whole card for navigation) */}
        <Link
          href={`/meetings/${meeting.id}`}
          aria-label={`Open meeting: ${meeting.title}`}
          className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />

        <div className="flex flex-1 flex-col gap-3 p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-base font-semibold text-gray-900 dark:text-white">
              {meeting.title}
            </h3>
            <div className="relative z-10 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Meeting options"
                  className="rounded-md p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-sidebar-active dark:hover:text-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/meetings/${meeting.id}`)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-red-600 data-[highlighted]:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Date */}
          <p className="text-sm text-muted-foreground">
            {formatMeetingDate(meeting.date)}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-sidebar-active dark:text-sidebar-text">
              <Clock className="h-3 w-3" />
              {formatDuration(meeting.duration_seconds)}
            </span>
            <StatusBadge status={meeting.status} />
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between pt-2">
            <AvatarStack participants={meeting.participants} />
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ListChecks className="h-3.5 w-3.5" />
                {meeting.action_items_count} task
                {meeting.action_items_count === 1 ? "" : "s"}
              </span>
              {meeting.has_summary && (
                <span className="inline-flex items-center gap-1 text-brand-500">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Summary
                </span>
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
      />
    </>
  );
}
