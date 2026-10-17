import { describe, expect, it } from "vitest";
import {
  detectScript,
  listingText,
  strictLanguageRetryInstruction,
  verifyLanguage,
  withLanguageWarning,
} from "@/lib/ai/language-check";
import { parseListingOutput, type ListingResult } from "@/lib/ai/output-schema";

const englishListing: ListingResult = parseListingOutput(
  JSON.stringify({
    title: "Handwoven Cotton Throw Blanket",
    shortDescription: "A breathable handwoven throw.",
    fullDescription: "Woven on a pit loom with natural indigo cotton.",
    bulletPoints: ["Breathable cotton"],
    seoKeywords: ["cotton throw"],
    tags: ["cotton"],
    alternativeTitles: ["Cotton Throw"],
    metaDescription: "Handwoven cotton throw, breathable and machine washable.",
    language: "hi",
    platform: "shopify",
    warnings: [],
  }),
  { language: "hi", platform: "shopify" },
);

const hindiListing: ListingResult = {
  ...englishListing,
  title: "हस्तनिर्मित सूती कंबल",
  shortDescription: "हस्तनिर्मित सूती कंबल, आरामदायक और साँस लेने योग्य।",
  fullDescription: "पारंपरिक करघे पर बुना गया सूती कंबल। नीले रंग की प्राकृतिक रंजक।",
};

describe("detectScript", () => {
  it("classifies Devanagari, Latin, mixed and empty text", () => {
    expect(detectScript("हस्तनिर्मित सूती कंबल")).toBe("devanagari");
    expect(detectScript("Handwoven cotton throw")).toBe("latin");
    expect(detectScript("Cotton कंबल")).toBe("mixed");
    expect(detectScript("   ")).toBe("empty");
  });

  it("samples the rendered listing text, not just the title", () => {
    expect(listingText(englishListing)).toContain(englishListing.fullDescription);
    expect(listingText(englishListing)).toContain(englishListing.bulletPoints[0]);
  });
});

describe("verifyLanguage", () => {
  it("flags Hindi requests answered in Latin script", () => {
    const result = verifyLanguage(englishListing, "hi");
    expect(result.ok).toBe(false);
    expect(result.detected).toBe("latin");
    expect(result.warning).toMatch(/Devanagari/i);
  });

  it("accepts Devanagari output for Hindi requests", () => {
    expect(verifyLanguage(hindiListing, "hi").ok).toBe(true);
    expect(verifyLanguage(hindiListing, "bilingual").detected).toBe("mixed");
  });

  it("flags an English request answered in Devanagari only", () => {
    // Every rendered field is Devanagari, so nothing about this is English output.
    const devanagariOnly: ListingResult = {
      ...hindiListing,
      bulletPoints: ["साँस लेने योग्य कपास"],
      seoKeywords: ["सूती कंबल"],
      tags: ["कपास"],
      alternativeTitles: ["सूती कंबल"],
      metaDescription: "हस्तनिर्मित सूती कंबल, ठंडे पानी में धुलने योग्य।",
    };
    const result = verifyLanguage(devanagariOnly, "en");
    expect(result.detected).toBe("devanagari");
    expect(result.ok).toBe(false);
    expect(result.warning).toMatch(/English was requested/i);
  });

  it("accepts English output that contains one Hindi product term", () => {
    const withHindiWord: ListingResult = { ...englishListing, title: "Handwoven कंबल throw" };
    const result = verifyLanguage(withHindiWord, "en");
    expect(result.detected).toBe("mixed");
    expect(result.ok).toBe(true);
  });

  it("accepts plain English for English requests", () => {
    expect(verifyLanguage(englishListing, "en").ok).toBe(true);
  });

  it("adds the mismatch warning to the listing without losing existing warnings", () => {
    const withExisting = { ...englishListing, warnings: ["Needs confirmation: dimensions"] };
    const merged = withLanguageWarning(withExisting, verifyLanguage(englishListing, "hi"));
    expect(merged.warnings).toHaveLength(2);
    expect(merged.warnings[0]).toBe("Needs confirmation: dimensions");
    expect(merged.warnings[1]).toMatch(/Latin script/i);
  });

  it("leaves a verified listing untouched", () => {
    const merged = withLanguageWarning(hindiListing, verifyLanguage(hindiListing, "hi"));
    expect(merged).toBe(hindiListing);
  });

  it("produces an explicit retry instruction per language", () => {
    expect(strictLanguageRetryInstruction("hi")).toMatch(/Devanagari/);
    expect(strictLanguageRetryInstruction("bilingual")).toMatch(/English version followed by the Hindi/);
  });
});
