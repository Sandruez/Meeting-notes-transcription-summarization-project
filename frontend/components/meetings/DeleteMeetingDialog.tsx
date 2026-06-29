"use client";

import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteMeeting } from "@/hooks/useMeetings";

interface DeleteMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  meetingTitle: string;
  /** Called after a successful delete (e.g. to navigate away from detail page). */
  onDeleted?: () => void;
}

export function DeleteMeetingDialog({
  open,
  onOpenChange,
  meetingId,
  meetingTitle,
  onDeleted,
}: DeleteMeetingDialogProps) {
  const deleteMeeting = useDeleteMeeting();

  const handleDelete = async () => {
    try {
      await deleteMeeting.mutateAsync(meetingId);
      onOpenChange(false);
      onDeleted?.();
    } catch {
      // error toast handled in the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle>Delete Meeting?</DialogTitle>
          <DialogDescription>
            This will permanently delete{" "}
            <span className="font-medium text-foreground">
              &ldquo;{meetingTitle}&rdquo;
            </span>{" "}
            along with its transcript, summary, and action items. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMeeting.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMeeting.isPending}
          >
            {deleteMeeting.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
