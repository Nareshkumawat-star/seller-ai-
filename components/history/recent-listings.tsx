"use client";

import * as React from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { readHistory, type SavedListing } from "@/lib/storage/history";
import { Badge, EmptyState } from "@/components/ui/primitives";

export function RecentListings({ limit = 3 }: { limit?: number }) {
  const [items, setItems] = React.useState<SavedListing[] | null>(null);

  React.useEffect(() => {
    setItems(readHistory());
  }, []);

  if (items === null) {
    return (
      <div className="space-y-2" aria-busy="true">
        <div className="skeleton h-14 rounded-lg" />
        <div className="skeleton h-14 rounded-lg" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-7 w-7" aria-hidden />}
        title="No saved listings yet"
        description="Generate a listing and save it to see it here. Saved listings live in this browser only."
        action={
          <Link href="/create" className="text-sm font-medium text-primary underline-offset-2 hover:underline">
            Create your first listing
          </Link>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.slice(0, limit).map((item) => (
        <li key={item.id}>
          <Link
            href={`/create?listing=${item.id}`}
            className="flex items-center justify-between gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-surface-muted/70"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(item.updatedAt).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <Badge tone="neutral">{item.listing.platform}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
