"use client";

import { usePathname } from "next/navigation";
import { Plus, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppUI } from "./app-ui-context";

const pageTitles: Record<string, string> = {
  "/meetings": "Meetings",
  "/settings": "Settings",
  "/action-items": "Action Items",
  "/calendar": "Calendar",
};

function titleForPath(pathname: string): string {
  if (pathname.startsWith("/meetings/")) return "Meeting Details";
  return pageTitles[pathname] ?? "Meetings";
}

export function Navbar() {
  const pathname = usePathname();
  const { openCreateMeeting, openSearch } = useAppUI();
  const title = titleForPath(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-surface-border bg-white px-4 dark:border-sidebar-hover dark:bg-sidebar-bg md:px-6">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white md:text-xl">
        {title}
      </h1>

      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={openSearch}
          aria-label="Search"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-sidebar-text dark:hover:bg-sidebar-hover md:hidden"
        >
          <Search className="h-5 w-5" />
        </button>

        <Button
          onClick={openCreateMeeting}
          className="bg-brand-500 text-white hover:bg-brand-600"
        >
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">New Meeting</span>
        </Button>

        <button
          aria-label="Notifications"
          className="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-sidebar-text dark:hover:bg-sidebar-hover sm:block"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
          U
        </div>
      </div>
    </header>
  );
}
