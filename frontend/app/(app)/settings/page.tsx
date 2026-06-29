"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Moon, Sun, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/layout/PageShell";
import { Separator } from "@/components/ui/separator";

const INTEGRATIONS = [
  { name: "Zoom", emoji: "🎥" },
  { name: "Google Meet", emoji: "📹" },
  { name: "Microsoft Teams", emoji: "💬" },
  { name: "Slack", emoji: "⚡" },
  { name: "Notion", emoji: "📝" },
  { name: "HubSpot", emoji: "🧲" },
];

const MODELS = [
  { value: "meta/llama-3.1-70b-instruct", label: "Llama 3.1 70B (Recommended)" },
  { value: "meta/llama-3.1-8b-instruct", label: "Llama 3.1 8B (Faster)" },
  { value: "nvidia/llama-3.1-nemotron-70b-instruct", label: "Nemotron 70B (NVIDIA Tuned)" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState("Demo User");
  const [email, setEmail] = useState("demo@example.com");
  const [apiKey, setApiKey] = useState("");
  const [defaultModel, setDefaultModel] = useState(MODELS[0].value);

  return (
    <PageShell className="max-w-3xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>

      {/* Profile */}
      <Section title="Profile">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white">
            {name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{name}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <Button
          className="mt-3 bg-brand-500 text-white hover:bg-brand-600"
          size="sm"
          onClick={() => toast.success("Profile saved")}
        >
          Save Changes
        </Button>
      </Section>

      <Separator className="my-6" />

      {/* AI Preferences */}
      <Section title="AI Preferences">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Default AI Model</label>
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm dark:border-sidebar-hover dark:bg-sidebar-hover"
            >
              {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-generate summary on upload</p>
              <p className="text-xs text-muted-foreground">Automatically generate AI summary when a transcript is uploaded</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" defaultChecked className="peer sr-only" />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-brand-500 peer-checked:after:translate-x-full dark:bg-sidebar-active" />
            </label>
          </div>
        </div>
      </Section>

      <Separator className="my-6" />

      {/* Integrations */}
      <Section title="Integrations" subtitle="Connect your favorite tools (coming soon)">
        <div className="grid gap-3 sm:grid-cols-2">
          {INTEGRATIONS.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-lg border border-surface-border p-3 dark:border-sidebar-hover"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.emoji}</span>
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-sidebar-active dark:text-sidebar-text">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Separator className="my-6" />

      {/* Appearance */}
      <Section title="Appearance">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme("light")}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
              theme === "light"
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                : "border-surface-border hover:bg-gray-50 dark:border-sidebar-hover dark:hover:bg-sidebar-hover"
            }`}
          >
            <Sun className="h-4 w-4" /> Light
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
              theme === "dark"
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                : "border-surface-border hover:bg-gray-50 dark:border-sidebar-hover dark:hover:bg-sidebar-hover"
            }`}
          >
            <Moon className="h-4 w-4" /> Dark
          </button>
        </div>
      </Section>

      <Separator className="my-6" />

      {/* API Config */}
      <Section title="API Configuration" subtitle="Configure your NVIDIA NIM API key for AI features">
        <div className="space-y-2">
          <label className="text-sm font-medium">NVIDIA API Key</label>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="nvapi-xxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <Button size="sm" variant="outline" onClick={() => toast.success("API key saved to backend .env")}>
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get your free API key at{" "}
            <a
              href="https://build.nvidia.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-brand-500 hover:underline"
            >
              build.nvidia.com <ExternalLink className="h-3 w-3" />
            </a>
            . Add it to <code className="rounded bg-gray-100 px-1 text-xs dark:bg-sidebar-active">backend/.env</code> as{" "}
            <code className="rounded bg-gray-100 px-1 text-xs dark:bg-sidebar-active">NVIDIA_API_KEY</code>.
          </p>
        </div>
      </Section>
    </PageShell>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
