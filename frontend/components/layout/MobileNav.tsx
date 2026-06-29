"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Zap, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppUI } from "./app-ui-context";

const items = [
  { label: "Meetings", href: "/meetings", icon: Home },
  { label: "Actions", href: "/action-items", icon: Zap },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { openSearch } = useAppUI();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-surface-border bg-white dark:bg-sidebar-bg dark:border-sidebar-hover md:hidden">
      <Link
        href="/meetings"
        className={cn(
          "flex flex-col items-center gap-1 px-3 py-1 text-xs",
          pathname.startsWith("/meetings")
            ? "text-brand-500"
            : "text-gray-500 dark:text-sidebar-text"
        )}
      >
        <Home className="h-5 w-5" />
        Meetings
      </Link>

      <button
        onClick={openSearch}
        aria-label="Search"
        className="flex flex-col items-center gap-1 px-3 py-1 text-xs text-gray-500 dark:text-sidebar-text"
      >
        <Search className="h-5 w-5" />
        Search
      </button>

      {items.slice(1).map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 text-xs",
              isActive
                ? "text-brand-500"
                : "text-gray-500 dark:text-sidebar-text"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
