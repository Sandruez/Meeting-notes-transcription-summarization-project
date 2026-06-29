import { cn, getInitials, speakerColor } from "@/lib/utils";
import type { Participant } from "@/lib/types";

interface AvatarStackProps {
  participants: Participant[];
  max?: number;
  size?: "sm" | "md";
}

export function AvatarStack({
  participants,
  max = 4,
  size = "md",
}: AvatarStackProps) {
  const shown = participants.slice(0, max);
  const rest = participants.length - shown.length;
  const dim = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";

  return (
    <div className="flex items-center -space-x-2">
      {shown.map((p, i) => (
        <div
          key={`${p.name}-${i}`}
          title={p.name}
          className={cn(
            "flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-sidebar-bg",
            dim
          )}
          style={{ backgroundColor: speakerColor(p.name, i) }}
        >
          {getInitials(p.name)}
        </div>
      ))}
      {rest > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600 ring-2 ring-white dark:bg-sidebar-active dark:text-sidebar-text dark:ring-sidebar-bg",
            dim
          )}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}
