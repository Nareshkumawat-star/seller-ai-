import { z } from "zod";

export const listingResultSchema = z.object({
  title: z.string().trim().min(1, "Title is empty.").max(300),
  shortDescription: z.string().trim().min(1, "Short description is empty.").max(1200),
  fullDescription: z.string().trim().min(1, "Full description is empty.").max(12_000),
  bulletPoints: z.array(z.string().trim().min(1).max(400)).min(1).max(12),
  seoKeywords: z.array(z.string().trim().min(1).max(120)).min(1).max(30),
  tags: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
  alternativeTitles: z.array(z.string().trim().min(1).max(300)).min(1).max(8),
  metaDescription: z.string().trim().min(1).max(400),
  language: z.enum(["en", "hi", "bilingual"]),
  platform: z.enum(["generic", "shopify", "etsy", "ebay"]),
  warnings: z.array(z.string().trim().max(400)).max(12).default([]),
});

export type ListingResult = z.infer<typeof listingResultSchema>;

export class ListingParseError extends Error {
  code: "malformed_json" | "schema_mismatch";
  constructor(code: "malformed_json" | "schema_mismatch", message: string) {
    super(message);
    this.name = "ListingParseError";
    this.code = code;
  }
}

/** Pull the first JSON object out of a model response, tolerating code fences and chatter. */
export function extractJsonObject(raw: string): unknown {
  const text = raw.trim();
  const candidates: string[] = [];

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  candidates.push(text);

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) candidates.push(text.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next candidate
    }
  }
  throw new ListingParseError("malformed_json", "The model did not return valid JSON.");
}

export type ParseOptions = {
  language?: "en" | "hi" | "bilingual";
  platform?: "generic" | "shopify" | "etsy" | "ebay";
};

/**
 * Validate a raw model response. Values the model echoed back for language/platform are
 * corrected to the user's request (with a warning) instead of failing the whole result.
 */
export function parseListingOutput(raw: string, options: ParseOptions = {}): ListingResult {
  const json = extractJsonObject(raw);

  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new ListingParseError("malformed_json", "The model returned JSON that is not an object.");
  }

  const record: Record<string, unknown> = { ...(json as Record<string, unknown>) };
  const warnings: string[] = [];

  if (options.language) {
    if (record.language !== options.language) {
      warnings.push("The model reported a different language; the result was aligned to your selection.");
      record.language = options.language;
    }
  }
  if (options.platform) {
    if (record.platform !== options.platform) {
      warnings.push("The model reported a different marketplace; the result was aligned to your selection.");
      record.platform = options.platform;
    }
  }

  record.warnings = mergeWarnings(record.warnings, warnings);
  for (const key of ["bulletPoints", "seoKeywords", "tags", "alternativeTitles"] as const) {
    record[key] = normalizeStringArray(record[key]);
  }

  const parsed = listingResultSchema.safeParse(record);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "output")))];
    throw new ListingParseError(
      "schema_mismatch",
      `The model response was missing or had invalid fields: ${fields.join(", ")}.`,
    );
  }

  const result = parsed.data;
  if (result.tags.length > 30) result.tags = result.tags.slice(0, 30);
  return result;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function mergeWarnings(value: unknown, extra: string[]): string[] {
  const base = Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
  return [...new Set([...base, ...extra])].slice(0, 12);
}
