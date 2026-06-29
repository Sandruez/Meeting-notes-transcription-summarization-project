"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AlertCircle, Video } from "lucide-react";
import { useMeetings } from "@/hooks/useMeetings";
import { MeetingCard } from "@/components/meetings/MeetingCard";
import { MeetingFilters } from "@/components/meetings/MeetingFilters";
import { MeetingListSkeleton } from "@/components/meetings/MeetingListSkeleton";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { useAppUI } from "@/components/layout/app-ui-context";

function MeetingsList() {
  const searchParams = useSearchParams();
  const search = searchParams.get("search") ?? undefined;
  const sortRaw = searchParams.get("sort") ?? "date_desc";
  const [sort_by, order] = (
    sortRaw.includes("_")
      ? sortRaw.split("_")
      : ["date", "desc"]
  ) as ["date" | "title", "asc" | "desc"];

  const { data, isLoading, isError, refetch } = useMeetings({
    search,
    sort_by,
    order,
  });

  if (isLoading) return <MeetingListSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            Failed to load meetings
          </p>
          <p className="text-sm text-muted-foreground">
            Could not reach the API at{" "}
            <code className="rounded bg-gray-100 px-1 text-xs dark:bg-sidebar-active">
              {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}
            </code>
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const meetings = data?.meetings ?? [];
  const total = data?.total ?? 0;

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          <Video className="h-8 w-8" />
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {search ? "No meetings match your search" : "No meetings yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search
              ? "Try a different search term or clear the filters."
              : "Create your first meeting to get started."}
          </p>
        </div>
        {search && (
          <Button
            variant="outline"
            onClick={() => window.history.replaceState(null, "", "/meetings")}
          >
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        {search
          ? `${total} meeting${total === 1 ? "" : "s"} match "${search}"`
          : `${total} meeting${total === 1 ? "" : "s"}`}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {meetings.map((meeting) => (
          <MeetingCard key={meeting.id} meeting={meeting} />
        ))}
      </div>
    </>
  );
}

export default function MeetingsPage() {
  const { openCreateMeeting } = useAppUI();

  return (
    <PageShell>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex-1">
          <Suspense>
            <MeetingFilters />
          </Suspense>
        </div>
        <Button
          onClick={openCreateMeeting}
          className="hidden shrink-0 bg-brand-500 text-white hover:bg-brand-600 sm:flex"
        >
          New Meeting
        </Button>
      </div>

      <Suspense fallback={<MeetingListSkeleton />}>
        <MeetingsList />
      </Suspense>
    </PageShell>
  );
}
