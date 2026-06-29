import { PageShell } from "@/components/layout/PageShell";
import { Zap } from "lucide-react";

export default function ActionItemsPage() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          <Zap className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Action Items
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          A unified view of every action item across all your meetings is coming
          soon. For now, find action items inside each meeting.
        </p>
      </div>
    </PageShell>
  );
}
