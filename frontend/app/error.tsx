"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-5xl">⚡</div>
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred. Try refreshing the page or going back to meetings.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>Try again</Button>
        <Link href="/meetings"><Button className="bg-brand-500 text-white hover:bg-brand-600">Back to Meetings</Button></Link>
      </div>
    </div>
  );
}
