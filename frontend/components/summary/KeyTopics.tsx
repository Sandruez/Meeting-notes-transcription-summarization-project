"use client";

import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import type { SummaryDetail } from "@/lib/types";

export function KeyTopics({ summary }: { summary: SummaryDetail | null }) {
  const router = useRouter();

  if (!summary || summary.key_topics.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No key topics available.
      </div>
    );
  }

  const handleTopicClick = (topic: string) => {
    router.push(`/meetings?search=${encodeURIComponent(topic)}`);
  };

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-muted-foreground">
        Click a topic to search all meetings for it.
      </p>
      <div className="flex flex-wrap gap-2">
        {summary.key_topics.map((topic) => (
          <button
            key={topic}
            onClick={() => handleTopicClick(topic)}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100 hover:text-brand-800 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
            title={`Search meetings for "${topic}"`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {topic}
          </button>
        ))}
      </div>
    </div>
  );
}
