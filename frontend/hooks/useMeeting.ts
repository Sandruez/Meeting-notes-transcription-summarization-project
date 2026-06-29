"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { meetingsApi } from "@/lib/api";
import type { MeetingDetail } from "@/lib/types";
import { toast } from "sonner";

export function useMeeting(id: string) {
  return useQuery<MeetingDetail>({
    queryKey: ["meeting", id],
    queryFn: async () => {
      const { data } = await meetingsApi.get(id);
      return data;
    },
    enabled: !!id,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateMeetingTitle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => meetingsApi.update(id, { title }),
    onSuccess: ({ data }) => {
      qc.setQueryData(["meeting", id], data);
      qc.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Title updated");
    },
    onError: () => toast.error("Failed to update title"),
  });
}
