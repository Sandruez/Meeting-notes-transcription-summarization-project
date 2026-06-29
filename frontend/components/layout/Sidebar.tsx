"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Zap, Calendar, Settings, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppUI } from "./app-ui-context";

const navItems = [
  { label: "Meetings", href: "/meetings", icon: Home },
  { label: "Action Items", href: "/action-items", icon: Zap },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { openSearch } = useAppUI();

  return (
    <aside
      className={cn(
        "hidden h-screen shrink-0 flex-col bg-sidebar-bg text-sidebar-text transition-all duration-200 md:flex",
        "md:w-[68px] lg:w-60" // icon-only on tablet, full on desktop
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-4 lg:px-5">
        <Flame className="h-7 w-7 shrink-0 text-brand-500" />
        <span className="hidden text-xl font-bold text-white lg:inline">
          Fireflies
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 pt-2">
        {/* Search opens the command palette */}
        <button
          onClick={openSearch}
          aria-label="Search"
          title="Search (⌘K)"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-text transition-colors hover:bg-sidebar-hover hover:text-sidebar-textActive"
        >
          <Search className="h-5 w-5 shrink-0" />
          <span className="hidden lg:inline">Search</span>
          <kbd className="ml-auto hidden rounded bg-sidebar-active px-1.5 py-0.5 text-[10px] text-sidebar-text lg:inline">
            ⌘K
          </kbd>
        </button>

        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-active text-sidebar-textActive"
                  : "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-textActive"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-hover p-3 lg:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
            U
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium text-white">Demo User</p>
            <p className="text-xs text-sidebar-text">Free Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
