"use client";

import * as React from "react";
import Link from "next/link";
import { Download, FolderOpen, PenLine, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { downloadFile, exportFileName, toText } from "@/lib/export/format";
import {
  clearHistory,
  deleteListing,
  readHistory,
  renameListing,
  type SavedListing,
} from "@/lib/storage/history";
import { getMarketplace } from "@/lib/config/marketplaces";

export function ListingsView() {
  const [items, setItems] = React.useState<SavedListing[] | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => setItems(readHistory()), []);

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 2500);
  };

  const handleRename = (item: SavedListing) => {
    const next = window.prompt("Rename listing", item.name);
    if (next === null) return;
    setItems(renameListing(item.id, next));
    flash("Renamed.");
  };

  const handleDelete = (item: SavedListing) => {
    if (!window.confirm(`Delete “${item.name}” from this browser? This cannot be undone.`)) return;
    setItems(deleteListing(item.id));
    flash("Deleted.");
  };

  const handleExport = (item: SavedListing) => {
    try {
      downloadFile(
        toText(item.listing, { productName: item.input.name }),
        exportFileName(item.name, "txt"),
        "text/plain",
      );
      flash("Exported TXT.");
    } catch {
      flash("Export failed. Try again.");
    }
  };

  const handleClearAll = () => {
    if (!window.confirm("Delete all locally saved listings? This cannot be undone.")) return;
    clearHistory();
    setItems([]);
    flash("All local listings cleared.");
  };

  if (items === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="skeleton h-20 rounded-card" />
        <div className="skeleton h-20 rounded-card" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">My Listings</h2>
          <p className="text-sm text-muted-foreground">
            Stored in this browser only. Clearing browser data removes them permanently.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/create">
            <Button size="sm">
              <PenLine className="h-3.5 w-3.5" aria-hidden />
              New listing
            </Button>
          </Link>
          {items.length > 0 ? (
            <Button size="sm" variant="outline" onClick={handleClearAll}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Clear all
            </Button>
          ) : null}
        </div>
      </div>

      <p aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
        {message}
      </p>

      <div className="rounded-card border border-border bg-surface-muted/50 px-4 py-3 text-xs text-muted-foreground">
        Browser storage is not a secure vault. Anyone using this browser profile can read these drafts, so avoid saving
        confidential supplier or pricing information.
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-8 w-8" aria-hidden />}
          title="Nothing saved yet"
          description="Generate a listing and choose “Save to My Listings”. Drafts stay on this device."
          action={
            <Link href="/create">
              <Button variant="outline" size="sm">Create a listing</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <Badge tone="neutral">{getMarketplace(item.listing.platform).label}</Badge>
                    <Badge tone="neutral">{item.listing.language}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {new Date(item.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.listing.title}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Link href={`/create?listing=${item.id}`}>
                    <Button size="sm" variant="secondary">Open</Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => handleRename(item)} aria-label={`Rename ${item.name}`}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleExport(item)} aria-label={`Export ${item.name}`}>
                    <Download className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => handleDelete(item)}
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
