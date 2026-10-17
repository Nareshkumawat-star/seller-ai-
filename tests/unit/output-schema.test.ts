import { describe, expect, it } from "vitest";
import { ListingParseError, parseListingOutput } from "@/lib/ai/output-schema";
import { csvEscape, exportFileName, toCsv, toJson, toText } from "@/lib/export/format";
import { exampleProductInput } from "@/lib/validation/product-input";

const valid = {
  title: "Handwoven Indigo Cotton Throw",
  shortDescription: "A breathable handwoven throw for calm interiors.",
  fullDescription: "Woven on a pit loom.\n\nNatural indigo, soft cotton.",
  bulletPoints: ["Breathable cotton", "Machine washable"],
  seoKeywords: ["handwoven throw", "indigo blanket"],
  tags: ["cotton", "indigo", "home"],
  alternativeTitles: ["Indigo Handloom Throw", "Cotton Throw Blanket"],
  metaDescription: "Handwoven indigo cotton throw, breathable and machine washable. Made on a traditional pit loom.",
  language: "en",
  platform: "etsy",
  warnings: ["Needs confirmation: exact dimensions"],
};

describe("parseListingOutput", () => {
  it("parses a plain JSON object", () => {
    const result = parseListingOutput(JSON.stringify(valid), { language: "en", platform: "etsy" });
    expect(result.title).toBe(valid.title);
    expect(result.bulletPoints).toHaveLength(2);
  });

  it("strips markdown fences and surrounding chatter", () => {
    const raw = `Here you go:\n\n\`\`\`json\n${JSON.stringify(valid)}\n\`\`\`\nThanks!`;
    expect(parseListingOutput(raw).title).toBe(valid.title);
  });

  it("rejects non-JSON output", () => {
    expect(() => parseListingOutput("The product is nice.")).toThrow(ListingParseError);
  });

  it("rejects JSON missing required fields", () => {
    try {
      parseListingOutput(JSON.stringify({ title: "Only a title" }));
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ListingParseError);
      expect((error as ListingParseError).code).toBe("schema_mismatch");
    }
  });

  it("accepts keywords and tags as comma strings", () => {
    const result = parseListingOutput(
      JSON.stringify({ ...valid, tags: "cotton, indigo, home", seoKeywords: "throw, blanket" }),
    );
    expect(result.tags).toEqual(["cotton", "indigo", "home"]);
    expect(result.seoKeywords).toEqual(["throw", "blanket"]);
  });

  it("aligns language and platform to the request with a warning", () => {
    const result = parseListingOutput(JSON.stringify({ ...valid, language: "hi", platform: "shopify" }), {
      language: "en",
      platform: "etsy",
    });
    expect(result.language).toBe("en");
    expect(result.platform).toBe("etsy");
    expect(result.warnings.join(" ")).toMatch(/aligned/i);
  });

  it("rejects an empty title", () => {
    expect(() => parseListingOutput(JSON.stringify({ ...valid, title: "   " }))).toThrow(ListingParseError);
  });
});

describe("export formatting", () => {
  it("escapes commas, quotes, and newlines in CSV", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape("has, comma")).toBe('"has, comma"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape("line\nbreak")).toBe('"line\nbreak"');
  });

  it("produces a valid CSV header and escapes multilingual content", () => {
    const listing = parseListingOutput(
      JSON.stringify({ ...valid, fullDescription: "हस्तनिर्मित, नीला\nकपास" }),
      { language: "en", platform: "etsy" },
    );
    const csv = toCsv(listing);
    expect(csv.startsWith("Field,Value\r\n")).toBe(true);
    expect(csv).toContain('"हस्तनिर्मित, नीला\nकपास"');
    expect(csv.split("\r\n").every((line) => line.length > 0)).toBe(true);
  });

  it("renders plain text with section labels", () => {
    const listing = parseListingOutput(JSON.stringify(valid));
    const text = toText(listing, { productName: "Throw" });
    expect(text).toContain("Product: Throw");
    expect(text).toContain("TITLE");
    expect(text).toContain(valid.title);
  });

  it("exports JSON that preserves product input and Hindi", () => {
    const listing = parseListingOutput(JSON.stringify(valid));
    const parsed = JSON.parse(toJson(listing, { ...exampleProductInput, language: "hi" })) as {
      listing: { language: string; title: string };
      product: { language: string };
    };
    expect(parsed.product.language).toBe("hi");
    expect(parsed.listing.title).toBe(valid.title);
  });

  it("sanitises export file names", () => {
    expect(exportFileName("Handwoven Throw / Indigo!", "txt")).toBe("handwoven-throw-indigo.txt");
    expect(exportFileName("", "csv")).toBe("seller-ai-listing.csv");
  });
});
