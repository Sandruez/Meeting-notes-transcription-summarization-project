import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

/** Constrains page content to a comfortable max width with consistent padding. */
export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8", className)}>
      {children}
    </div>
  );
}
