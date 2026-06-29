import { PageShell } from "@/components/layout/PageShell";
import { Calendar } from "lucide-react";

export default function CalendarPage() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          <Calendar className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Calendar
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Calendar integration (Google Meet, Zoom, Outlook) is coming soon.
        </p>
      </div>
    </PageShell>
  );
}
