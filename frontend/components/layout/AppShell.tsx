"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { AppUIContext } from "./app-ui-context";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";
import { CommandPalette } from "@/components/search/CommandPalette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const openCreateMeeting = useCallback(() => setCreateOpen(true), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);

  // Global Cmd+K / Ctrl+K to open the command palette.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <AppUIContext.Provider value={{ openCreateMeeting, openSearch }}>
      <div className="flex h-screen overflow-hidden bg-surface-bg dark:bg-sidebar-bg">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
        </div>
        <MobileNav />
      </div>

      <CreateMeetingModal open={createOpen} onOpenChange={setCreateOpen} />
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </AppUIContext.Provider>
  );
}
