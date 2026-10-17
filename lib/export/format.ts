import type { ListingResult } from "@/lib/ai/output-schema";
import type { ProductInput } from "@/lib/validation/product-input";

/** RFC 4180 escaping: quotes doubled, fields containing , " or newlines quoted. */
export function csvEscape(value: string): string {
  const text = value ?? "";
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function listingRows(listing: ListingResult): Array<[string, string]> {
  return [
    ["Title", listing.title],
    ["Short description", listing.shortDescription],
    ["Full description", listing.fullDescription],
    ["Key features", listing.bulletPoints.join("\n")],
    ["SEO keywords", listing.seoKeywords.join(", ")],
    ["Tags", listing.tags.join(", ")],
    ["Alternative titles", listing.alternativeTitles.join("\n")],
    ["Meta description", listing.metaDescription],
    ["Language", listing.language],
    ["Marketplace", listing.platform],
    ["Warnings", listing.warnings.join("\n")],
  ];
}

export function toText(listing: ListingResult, meta?: { productName?: string }): string {
  const lines: string[] = [];
  if (meta?.productName) lines.push(`Product: ${meta.productName}`, "");
  for (const [label, value] of listingRows(listing)) {
    if (!value) continue;
    lines.push(`${label.toUpperCase()}`, value, "");
  }
  lines.push("Generated with Seller AI — review before publishing.");
  return lines.join("\n");
}

export function toCsv(listing: ListingResult): string {
  const rows: Array<[string, string]> = [["Field", "Value"], ...listingRows(listing)];
  return rows.map(([field, value]) => `${csvEscape(field)},${csvEscape(value)}`).join("\r\n");
}

export function toJson(listing: ListingResult, input?: ProductInput): string {
  return JSON.stringify({ generatedAt: new Date().toISOString(), product: input ?? null, listing }, null, 2);
}

function slug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 60) || "seller-ai-listing";
}

export function exportFileName(base: string, extension: "txt" | "csv" | "json"): string {
  return `${slug(base)}.${extension}`;
}

export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
