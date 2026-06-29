"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actionItemsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ActionItem, Participant } from "@/lib/types";

interface ActionItemListProps {
  meetingId: string;
  items: ActionItem[];
  participants: Participant[];
}

function ActionItemRow({
  item,
  meetingId,
}: {
  item: ActionItem;
  meetingId: string;
  participants: Participant[];
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.task);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const toggle = useMutation({
    mutationFn: () =>
      actionItemsApi.update(meetingId, item.id, { completed: !item.completed }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["meeting", meetingId] });
      qc.setQueryData(["meeting", meetingId], (old: { action_items: ActionItem[] } | undefined) =>
        old
          ? {
              ...old,
              action_items: old.action_items.map((a) =>
                a.id === item.id ? { ...a, completed: !a.completed } : a
              ),
            }
          : old
      );
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
      toast.error("Failed to update action item");
    },
  });

  const save = useMutation({
    mutationFn: () => actionItemsApi.update(meetingId, item.id, { task: editText }),
    onSuccess: () => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
    },
    onError: () => toast.error("Failed to update action item"),
  });

  return (
    <>
      <div
        className={cn(
          "group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-sidebar-hover",
          item.completed && "opacity-60"
        )}
      >
        <button
          onClick={() => toggle.mutate()}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
            item.completed
              ? "border-brand-500 bg-brand-500 text-white"
              : "border-gray-300 hover:border-brand-400 dark:border-gray-600"
          )}
          aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
        >
          {item.completed && <Check className="h-3 w-3" />}
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex gap-2">
              <Input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save.mutate();
                  if (e.key === "Escape") setEditing(false);
                }}
                className="text-sm h-8"
                autoFocus
              />
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending} className="h-8">
                Save
              </Button>
            </div>
          ) : (
            <p className={cn("text-sm", item.completed && "line-through text-muted-foreground")}>
              {item.task}
            </p>
          )}

          <div className="mt-1 flex flex-wrap gap-2">
            {item.owner && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" /> {item.owner}
              </span>
            )}
            {item.due_date_hint && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" /> {item.due_date_hint}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => setEditing(true)}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Edit action item"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="rounded p-1 text-muted-foreground hover:text-red-500"
            aria-label="Delete action item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Inline delete uses the meeting delete dialog structure — simplified */}
      {deleteOpen && (
        <ActionItemDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          meetingId={meetingId}
          itemId={item.id}
          task={item.task}
          onDeleted={() => qc.invalidateQueries({ queryKey: ["meeting", meetingId] })}
        />
      )}
    </>
  );
}

function ActionItemDeleteDialog({
  open,
  onOpenChange,
  meetingId,
  itemId,
  task,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meetingId: string;
  itemId: string;
  task: string;
  onDeleted: () => void;
}) {
  const del = useMutation({
    mutationFn: () => actionItemsApi.delete(meetingId, itemId),
    onSuccess: () => {
      onDeleted();
      onOpenChange(false);
      toast.success("Action item deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-sidebar-hover">
        <p className="font-semibold">Delete action item?</p>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{task}</p>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            className="bg-red-500 text-white hover:bg-red-600"
            onClick={() => del.mutate()}
            disabled={del.isPending}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddActionItem({ meetingId, participants }: { meetingId: string; participants: Participant[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState("");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");

  const add = useMutation({
    mutationFn: () =>
      actionItemsApi.create(meetingId, {
        task,
        owner: owner || undefined,
        due_date_hint: due || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
      setTask(""); setOwner(""); setDue(""); setOpen(false);
      toast.success("Action item added");
    },
    onError: () => toast.error("Failed to add action item"),
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-surface-border p-3 text-sm text-muted-foreground transition-colors hover:border-brand-400 hover:text-brand-500 dark:border-sidebar-hover"
      >
        <Plus className="h-4 w-4" /> Add Action Item
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-brand-200 bg-brand-50/40 p-3 dark:border-brand-500/20 dark:bg-brand-500/5">
      <Input
        placeholder="Describe the action item..."
        value={task}
        onChange={(e) => setTask(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && task.trim()) add.mutate(); if (e.key === "Escape") setOpen(false); }}
        autoFocus
        className="text-sm"
      />
      <div className="flex gap-2">
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="flex-1 rounded-lg border border-surface-border bg-white px-2 py-1.5 text-xs dark:border-sidebar-hover dark:bg-sidebar-hover"
        >
          <option value="">No owner</option>
          {participants.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
        <Input placeholder="Due date hint" value={due} onChange={(e) => setDue(e.target.value)} className="flex-1 text-xs h-8" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => add.mutate()} disabled={!task.trim() || add.isPending} className="bg-brand-500 text-white hover:bg-brand-600 h-8 text-xs">
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-8 text-xs">Cancel</Button>
      </div>
    </div>
  );
}

export function ActionItemList({ meetingId, items, participants }: ActionItemListProps) {
  const active = items.filter((a) => !a.completed);
  const completed = items.filter((a) => a.completed);
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <div className="p-3 space-y-1">
      {active.length === 0 && completed.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No action items. Add one or let AI extract them.
        </p>
      )}

      {active.map((item) => (
        <ActionItemRow key={item.id} item={item} meetingId={meetingId} participants={participants} />
      ))}

      <AddActionItem meetingId={meetingId} participants={participants} />

      {completed.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showCompleted ? "Hide" : "Show"} Completed ({completed.length})
          </button>
          {showCompleted && completed.map((item) => (
            <ActionItemRow key={item.id} item={item} meetingId={meetingId} participants={participants} />
          ))}
        </div>
      )}
    </div>
  );
}
