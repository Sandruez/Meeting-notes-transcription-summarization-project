import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-6xl font-bold text-brand-500">404</div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/meetings">
        <Button className="bg-brand-500 text-white hover:bg-brand-600">← Back to Meetings</Button>
      </Link>
    </div>
  );
}
