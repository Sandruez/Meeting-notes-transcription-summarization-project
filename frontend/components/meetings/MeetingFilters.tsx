"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, SortAsc } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCallback, useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";

const SORT_OPTIONS = [
  { value: "date_desc", label: "Most Recent" },
  { value: "date_asc", label: "Oldest First" },
  { value: "title_asc", label: "Title A–Z" },
];

export function MeetingFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const sort = searchParams.get("sort") ?? "date_desc";
  const debouncedSearch = useDebounce(search, 300);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      });
      router.replace(`/meetings?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    updateParams({ search: debouncedSearch || null });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = !!search || sort !== "date_desc";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search meetings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4"
          aria-label="Search meetings"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Sort dropdown — native select for simplicity & base-ui compat */}
      <div className="flex items-center gap-2">
        <SortAsc className="h-4 w-4 shrink-0 text-muted-foreground" />
        <select
          value={sort}
          onChange={(e) => updateParams({ sort: e.target.value })}
          aria-label="Sort meetings"
          className="rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-sidebar-hover dark:bg-sidebar-hover dark:text-white"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearch("");
            updateParams({ search: null, sort: null });
          }}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
