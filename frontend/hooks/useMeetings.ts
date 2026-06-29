"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { meetingsApi } from "@/lib/api";
import type { MeetingsResponse } from "@/lib/types";
import { toast } from "sonner";

export interface UseMeetingsParams {
  search?: string;
  sort_by?: "date" | "title";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export function useMeetings(params?: UseMeetingsParams) {
  return useQuery<MeetingsResponse>({
    queryKey: ["meetings", params],
    queryFn: async () => {
      const { data } = await meetingsApi.list(params);
      return data;
    },
  });
}

/** Optimistic delete — removes from every cached meetings list immediately. */
export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => meetingsApi.delete(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["meetings"] });
      const previous = queryClient.getQueriesData<MeetingsResponse>({
        queryKey: ["meetings"],
      });
      queryClient.setQueriesData<MeetingsResponse>(
        { queryKey: ["meetings"] },
        (old) =>
          old
            ? {
                meetings: old.meetings.filter((m) => m.id !== id),
                total: Math.max(0, old.total - 1),
              }
            : old
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      context?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error("Failed to delete meeting");
    },
    onSuccess: () => {
      toast.success("Meeting deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}
