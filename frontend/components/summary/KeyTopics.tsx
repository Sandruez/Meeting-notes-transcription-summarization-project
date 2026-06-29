import { MessageSquare } from "lucide-react";
import type { SummaryDetail } from "@/lib/types";

export function KeyTopics({ summary }: { summary: SummaryDetail | null }) {
  if (!summary || summary.key_topics.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No key topics available.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 p-4">
      {summary.key_topics.map((topic) => (
        <span
          key={topic}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {topic}
        </span>
      ))}
    </div>
  );
}
