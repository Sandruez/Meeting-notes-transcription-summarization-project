import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-surface-border bg-white dark:border-sidebar-hover dark:bg-sidebar-hover">
      <div className="h-[3px] w-full bg-gray-100 dark:bg-sidebar-active" />
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex -space-x-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-sidebar-bg" />
            ))}
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

export function MeetingListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
