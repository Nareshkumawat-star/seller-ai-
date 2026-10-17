import type { ListingResult } from "@/lib/ai/output-schema";

export type DetectedScript = "devanagari" | "latin" | "mixed" | "empty";

const DEVANAGARI = /[\u0900-\u097F]/;
const LATIN_LETTER = /[A-Za-z]/;

const TEXT_FIELDS = [
  "title",
  "shortDescription",
  "fullDescription",
  "metaDescription",
] as const;

/** Sample the words the user actually reads, not just the title. */
export function detectScript(text: string): DetectedScript {
  const sample = text.trim();
  if (!sample) return "empty";
  const hasDevanagari = DEVANAGARI.test(sample);
  const hasLatin = LATIN_LETTER.test(sample);
  if (hasDevanagari && hasLatin) return "mixed";
  if (hasDevanagari) return "devanagari";
  return "latin";
}

function joined(parts: string[]): string {
  return parts.join(" \n ");
}

/** Rendered text of a listing: the prose fields plus bullets and tags. */
export function listingText(listing: ListingResult): string {
  return joined([
    ...TEXT_FIELDS.map((field) => listing[field]),
    ...listing.bulletPoints,
    ...listing.alternativeTitles,
  ]);
}

export type LanguageVerification = {
  requested: "en" | "hi" | "bilingual";
  detected: DetectedScript;
  /** True when the output plausibly matches the requested language. */
  ok: boolean;
  /** Set only when the output cannot be trusted to match the request. */
  warning?: string;
};

/**
 * The model echoing `language: "hi"` is not evidence that it wrote Hindi.
 * Check the actual characters before the UI labels the result Hindi.
 */
export function verifyLanguage(
  listing: ListingResult,
  requested: "en" | "hi" | "bilingual",
): LanguageVerification {
  const detected = detectScript(listingText(listing));

  if (requested === "en") {
    if (detected === "devanagari") {
      return {
        requested,
        detected,
        ok: false,
        warning:
          "English was requested, but the model returned Devanagari-only text. Regenerate or switch to a stronger model.",
      };
    }
    return { requested, detected, ok: true };
  }

  // Hindi and bilingual both require Devanagari content.
  if (detected === "devanagari" || detected === "mixed") {
    return { requested, detected, ok: true };
  }

  return {
    requested,
    detected,
    ok: false,
    warning:
      requested === "hi"
        ? "Hindi was requested, but the model returned Latin script instead of Devanagari. Regenerate, or use a model that writes Hindi reliably."
        : "Bilingual output was requested, but no Devanagari text was returned. Regenerate, or add the Hindi version manually.",
  };
}

export function withLanguageWarning(
  listing: ListingResult,
  verification: LanguageVerification,
): ListingResult {
  if (verification.ok || !verification.warning) return listing;
  return { ...listing, warnings: [...new Set([...listing.warnings, verification.warning])].slice(0, 12) };
}

export function strictLanguageRetryInstruction(requested: "en" | "hi" | "bilingual"): string {
  return requested === "hi"
    ? "Your previous answer was not in Hindi. Reply again with the same JSON shape, but every human-readable value (title, shortDescription, fullDescription, bulletPoints, metaDescription, alternativeTitles, warnings) written in Hindi using Devanagari script. Do not use Latin letters for Hindi words. Keep JSON keys in English."
    : "Your previous answer did not include Hindi. Reply again with the same JSON shape, with each description field containing the English version followed by the Hindi version in Devanagari script.";
}
