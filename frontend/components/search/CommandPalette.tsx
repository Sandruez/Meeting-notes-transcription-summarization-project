"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileText, Calendar } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { searchApi } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { formatRelativeDate } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);

  const { data: results } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const { data } = await searchApi.search(debouncedQuery, 12);
      return data;
    },
    enabled: debouncedQuery.length >= 2,
  });

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const titleMatches = results?.filter((r) => r.match_type === "title") ?? [];
  const transcriptMatches = results?.filter((r) => r.match_type === "transcript") ?? [];

  const navigate = (meetingId: string) => {
    router.push(`/meetings/${meetingId}`);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search across all meetings and transcripts..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!query && (
          <CommandEmpty>Type to search meetings and transcripts…</CommandEmpty>
        )}
        {query && !results?.length && debouncedQuery === query && (
          <CommandEmpty>No results for &ldquo;{query}&rdquo;</CommandEmpty>
        )}

        {titleMatches.length > 0 && (
          <CommandGroup heading="Meetings">
            {titleMatches.map((r, i) => (
              <CommandItem key={`title-${i}`} onSelect={() => navigate(r.meeting_id)}>
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.meeting_title}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeDate(r.meeting_date)}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {titleMatches.length > 0 && transcriptMatches.length > 0 && <CommandSeparator />}

        {transcriptMatches.length > 0 && (
          <CommandGroup heading="Transcript Matches">
            {transcriptMatches.slice(0, 6).map((r, i) => (
              <CommandItem key={`transcript-${i}`} onSelect={() => navigate(r.meeting_id)}>
                <FileText className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{r.meeting_title}</p>
                  <p className="text-sm line-clamp-1">{r.context}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
