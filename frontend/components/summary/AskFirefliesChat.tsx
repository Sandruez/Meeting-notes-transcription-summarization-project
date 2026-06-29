"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Copy, Check, Trash2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { aiApi } from "@/lib/api";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "What were the main decisions made?",
  "Who is responsible for each action item?",
  "What were the key concerns raised?",
  "Summarise the next steps agreed upon.",
];

interface CopyButtonProps {
  text: string;
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-foreground"
      aria-label="Copy message"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

interface AskFirefliesChatProps {
  meetingId: string;
}

export function AskFirefliesChat({ meetingId }: AskFirefliesChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (question: string) => {
    if (!question.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: question.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setStreaming(true);

    // Placeholder assistant message that gets filled via streaming
    setMessages([...history, { role: "assistant", content: "" }]);

    try {
      abortRef.current = new AbortController();
      let accumulated = "";

      for await (const chunk of aiApi.askQuestion(
        meetingId,
        question.trim(),
        messages.map((m) => ({ role: m.role, content: m.content }))
      )) {
        // Unescape newlines sent by the SSE stream
        accumulated += chunk.replace(/\\n/g, "\n");
        setMessages([...history, { role: "assistant", content: accumulated }]);
      }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name !== "AbortError") {
        toast.error("AI is unavailable, please try again");
        setMessages(history); // remove empty assistant bubble
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const clear = () => {
    if (streaming) abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setStreaming(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-4 py-2 dark:border-sidebar-hover">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-medium">Ask Fireflies</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              Ask anything about this meeting
            </p>
            <div className="grid gap-2">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-lg border border-surface-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-600 dark:border-sidebar-hover dark:hover:bg-sidebar-hover"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div className={cn("group relative max-w-[85%]", msg.role === "user" && "flex flex-col items-end")}>
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-800 dark:bg-sidebar-active dark:text-gray-200"
                )}
              >
                {msg.content || (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                  </span>
                )}
              </div>
              {msg.role === "assistant" && msg.content && (
                <div className="mt-0.5 flex justify-start">
                  <CopyButton text={msg.content} />
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-sidebar-active dark:text-sidebar-text">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-surface-border p-3 dark:border-sidebar-hover">
        <div className="flex gap-2">
          <Textarea
            placeholder="Ask a question about this meeting…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={2}
            className="min-h-0 resize-none text-sm"
            disabled={streaming}
          />
          <Button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            className="shrink-0 self-end bg-brand-500 text-white hover:bg-brand-600"
            size="sm"
            aria-label="Send"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Shift+Enter for new line · answers grounded in this transcript only
        </p>
      </div>
    </div>
  );
}
