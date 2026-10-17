"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  Clipboard,
  Copy,
  Download,
  FileJson,
  FileText,
  RotateCcw,
  Table,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Separator, Textarea } from "@/components/ui/primitives";
import { copyText } from "@/lib/clipboard";
import { getMarketplace } from "@/lib/config/marketplaces";
import { downloadFile, exportFileName, toCsv, toJson, toText } from "@/lib/export/format";
import type { ListingResult } from "@/lib/ai/output-schema";
import type { ProductInput } from "@/lib/validation/product-input";
import { cn } from "@/lib/utils";

type TabId = "overview" | "description" | "seo" | "alternatives";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "description", label: "Description" },
  { id: "seo", label: "SEO & tags" },
  { id: "alternatives", label: "Alternatives" },
];

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [state, setState] = React.useState<"idle" | "copied" | "failed">("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleCopy = async () => {
    const ok = await copyText(value);
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1800);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      aria-label={`${label} to clipboard`}
      className="h-7 px-2 text-xs"
    >
      {state === "copied" ? (
        <Check className="h-3.5 w-3.5 text-success" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}</span>
    </Button>
  );
}

function ResultField({
  label,
  value,
  children,
  onReset,
  hint,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
  onReset?: () => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          {hint ? <p className="text-[11px] text-muted-foreground/80">{hint}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onReset ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onReset}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset
            </Button>
          ) : null}
          <CopyButton value={value} />
        </div>
      </div>
      {children}
    </div>
  );
}

export type ListingEditorProps = {
  listing: ListingResult;
  original: ListingResult;
  input: ProductInput;
  onChange: (next: ListingResult) => void;
  onResetAll: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
  model?: string;
};

export function ListingEditor({
  listing,
  original,
  input,
  onChange,
  onResetAll,
  onRegenerate,
  regenerating,
  model,
}: ListingEditorProps) {
  const [tab, setTab] = React.useState<TabId>("overview");
  const [exportState, setExportState] = React.useState<string | null>(null);
  const [saveState, setSaveState] = React.useState<string | null>(null);
  const market = getMarketplace(listing.platform);
  const titleOver = listing.title.length > market.titleMaxChars;
  const edited = JSON.stringify(listing) !== JSON.stringify(original);

  const patch = (partial: Partial<ListingResult>) => onChange({ ...listing, ...partial });
  const linesToArray = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean);
  const commaToArray = (text: string) =>
    text.split(",").map((item) => item.trim()).filter(Boolean);

  const flash = (setter: (value: string | null) => void, message: string) => {
    setter(message);
    setTimeout(() => setter(null), 2200);
  };

  const handleExport = (kind: "txt" | "csv" | "json") => {
    try {
      const name = `${input.name || "listing"}`;
      if (kind === "txt") {
        downloadFile(toText(listing, { productName: input.name }), exportFileName(name, "txt"), "text/plain");
      } else if (kind === "csv") {
        downloadFile(toCsv(listing), exportFileName(name, "csv"), "text/csv");
      } else {
        downloadFile(toJson(listing, input), exportFileName(name, "json"), "application/json");
      }
      flash(setExportState, "Exported");
    } catch {
      flash(setExportState, "Export failed");
    }
  };

  const handleCopyAll = async () => {
    const ok = await copyText(toText(listing, { productName: input.name }));
    flash(setSaveState, ok ? "Full listing copied" : "Copy failed — select the text manually");
  };

  return (
    <Card className="flex h-full min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <Badge tone="accent">{market.label}</Badge>
        <Badge tone="neutral">{listing.language === "hi" ? "हिन्दी" : listing.language === "bilingual" ? "EN + हिन्दी" : "English"}</Badge>
        {model ? <span className="hidden truncate text-xs text-muted-foreground sm:inline">{model}</span> : null}
        {edited ? <Badge tone="warning">Edited</Badge> : null}
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => void handleCopyAll()}>
            <Clipboard className="h-3.5 w-3.5" aria-hidden />
            Copy all
          </Button>
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={regenerating}>
            <RotateCcw className={cn("h-3.5 w-3.5", regenerating && "animate-spin")} aria-hidden />
            {regenerating ? "Regenerating…" : "Regenerate"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2" role="tablist" aria-label="Listing sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === item.id ? "bg-accent-soft text-primary" : "text-muted-foreground hover:bg-surface-muted",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {listing.warnings.length > 0 ? (
        <div className="border-b border-border bg-warning/5 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-warning">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Review before publishing
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
            {listing.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="scroll-slim flex-1 overflow-y-auto p-4">
        {tab === "overview" ? (
          <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" className="space-y-5">
            <ResultField
              label="Product title"
              value={listing.title}
              hint={`${listing.title.length}/${market.titleMaxChars} characters`}
              onReset={listing.title !== original.title ? () => patch({ title: original.title }) : undefined}
            >
              <Input
                value={listing.title}
                onChange={(event) => patch({ title: event.target.value })}
                aria-label="Product title"
                aria-invalid={titleOver}
              />
              {titleOver ? (
                <p className="text-xs text-warning">
                  Longer than the {market.titleMaxChars}-character template guideline — trim it before publishing.
                </p>
              ) : null}
            </ResultField>

            <ResultField
              label="Short description"
              value={listing.shortDescription}
              onReset={
                listing.shortDescription !== original.shortDescription
                  ? () => patch({ shortDescription: original.shortDescription })
                  : undefined
              }
            >
              <Textarea
                value={listing.shortDescription}
                onChange={(event) => patch({ shortDescription: event.target.value })}
                aria-label="Short description"
                rows={4}
              />
            </ResultField>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Words" value={String(listing.fullDescription.split(/\s+/).filter(Boolean).length)} />
              <Stat label="Features" value={String(listing.bulletPoints.length)} />
              <Stat label="Keywords" value={String(listing.seoKeywords.length)} />
              <Stat label="Tags" value={String(listing.tags.length)} />
            </div>
          </div>
        ) : null}

        {tab === "description" ? (
          <div id="panel-description" role="tabpanel" aria-labelledby="tab-description" className="space-y-5">
            <ResultField
              label="Full description"
              value={listing.fullDescription}
              hint="Plain text; never rendered as HTML"
              onReset={
                listing.fullDescription !== original.fullDescription
                  ? () => patch({ fullDescription: original.fullDescription })
                  : undefined
              }
            >
              <Textarea
                value={listing.fullDescription}
                onChange={(event) => patch({ fullDescription: event.target.value })}
                aria-label="Full description"
                rows={12}
              />
            </ResultField>

            <ResultField
              label="Key features"
              value={listing.bulletPoints.join("\n")}
              hint="One per line"
              onReset={
                listing.bulletPoints.join() !== original.bulletPoints.join()
                  ? () => patch({ bulletPoints: original.bulletPoints })
                  : undefined
              }
            >
              <Textarea
                value={listing.bulletPoints.join("\n")}
                onChange={(event) => patch({ bulletPoints: linesToArray(event.target.value) })}
                aria-label="Key features, one per line"
                rows={6}
              />
            </ResultField>
          </div>
        ) : null}

        {tab === "seo" ? (
          <div id="panel-seo" role="tabpanel" aria-labelledby="tab-seo" className="space-y-5">
            <ResultField
              label="SEO keywords"
              value={listing.seoKeywords.join(", ")}
              hint="Comma separated"
              onReset={
                listing.seoKeywords.join() !== original.seoKeywords.join()
                  ? () => patch({ seoKeywords: original.seoKeywords })
                  : undefined
              }
            >
              <Textarea
                value={listing.seoKeywords.join(", ")}
                onChange={(event) => patch({ seoKeywords: commaToArray(event.target.value) })}
                aria-label="SEO keywords, comma separated"
                rows={3}
              />
            </ResultField>

            <ResultField
              label="Tags"
              value={listing.tags.join(", ")}
              hint={`Comma separated · ${market.maxTags} max recommended`}
              onReset={
                listing.tags.join() !== original.tags.join() ? () => patch({ tags: original.tags }) : undefined
              }
            >
              <Textarea
                value={listing.tags.join(", ")}
                onChange={(event) => patch({ tags: commaToArray(event.target.value) })}
                aria-label="Tags, comma separated"
                rows={3}
              />
            </ResultField>

            <ResultField
              label="Meta description"
              value={listing.metaDescription}
              hint={`${listing.metaDescription.length} characters`}
              onReset={
                listing.metaDescription !== original.metaDescription
                  ? () => patch({ metaDescription: original.metaDescription })
                  : undefined
              }
            >
              <Textarea
                value={listing.metaDescription}
                onChange={(event) => patch({ metaDescription: event.target.value })}
                aria-label="Meta description"
                rows={3}
              />
            </ResultField>
          </div>
        ) : null}

        {tab === "alternatives" ? (
          <div id="panel-alternatives" role="tabpanel" aria-labelledby="tab-alternatives" className="space-y-5">
            <ResultField
              label="Alternative titles"
              value={listing.alternativeTitles.join("\n")}
              hint="One per line"
              onReset={
                listing.alternativeTitles.join() !== original.alternativeTitles.join()
                  ? () => patch({ alternativeTitles: original.alternativeTitles })
                  : undefined
              }
            >
              <Textarea
                value={listing.alternativeTitles.join("\n")}
                onChange={(event) => patch({ alternativeTitles: linesToArray(event.target.value) })}
                aria-label="Alternative titles, one per line"
                rows={5}
              />
            </ResultField>

            <p className="text-xs text-muted-foreground">
              Marketplace rules are configurable guidance, not live policy. Verify title and tag limits in{" "}
              {market.label} before publishing.
            </p>
          </div>
        ) : null}
      </div>

      <Separator />
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <Button variant="outline" size="sm" onClick={() => handleExport("txt")}>
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Export TXT
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
          <Table className="h-3.5 w-3.5" aria-hidden />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
          <FileJson className="h-3.5 w-3.5" aria-hidden />
          Export JSON
        </Button>
        <Button variant="ghost" size="sm" onClick={onResetAll} disabled={!edited}>
          <Download className="h-3.5 w-3.5 rotate-180" aria-hidden />
          Reset all edits
        </Button>
        <span aria-live="polite" className="text-xs text-muted-foreground">
          {saveState ?? exportState ?? ""}
        </span>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted/50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
