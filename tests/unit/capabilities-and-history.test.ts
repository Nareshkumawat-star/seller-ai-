import { describe, expect, it } from "vitest";
import { guessVisionSupport, modelNameMatches, resolveVisionCapability } from "@/lib/ai/model-capabilities";
import {
  clearHistory,
  deleteListing,
  HISTORY_KEY,
  readHistory,
  renameListing,
  saveListing,
  type SavedListing,
} from "@/lib/storage/history";
import { parseListingOutput } from "@/lib/ai/output-schema";
import { exampleProductInput } from "@/lib/validation/product-input";

const listing = parseListingOutput(
  JSON.stringify({
    title: "Test title",
    shortDescription: "Short.",
    fullDescription: "Long enough.",
    bulletPoints: ["One"],
    seoKeywords: ["one"],
    tags: ["one"],
    alternativeTitles: ["Alt"],
    metaDescription: "Meta description for the test listing.",
    language: "en",
    platform: "generic",
    warnings: [],
  }),
);

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

describe("model capabilities", () => {
  it("matches tags including implicit :latest", () => {
    expect(modelNameMatches("qwen3:4b", "qwen3:4b")).toBe(true);
    expect(modelNameMatches("qwen3:latest", "qwen3")).toBe(true);
    expect(modelNameMatches("qwen3:8b", "qwen3:4b")).toBe(false);
  });

  it("detects common vision model names", () => {
    expect(guessVisionSupport("llava:7b")).toBe(true);
    expect(guessVisionSupport("qwen2.5vl:7b")).toBe(true);
    expect(guessVisionSupport("qwen3:4b")).toBe(false);
  });

  it("reports unsupported when no vision model is configured", () => {
    const result = resolveVisionCapability({});
    expect(result.supported).toBe(false);
    expect(result.source).toBe("none");
  });

  it("trusts Ollama's capability list", () => {
    expect(resolveVisionCapability({ configuredVisionModel: "custom:1b", showCapabilities: ["vision"] }).supported).toBe(true);
    expect(resolveVisionCapability({ configuredVisionModel: "llava:7b", showCapabilities: ["completion"] }).supported).toBe(false);
  });

  it("falls back to the name heuristic when capabilities are absent", () => {
    const result = resolveVisionCapability({ configuredVisionModel: "llava:7b", showCapabilities: null });
    expect(result.source).toBe("name-heuristic");
    expect(result.supported).toBe(true);
  });
});

describe("local history", () => {
  it("saves, renames, deletes, and clears listings", () => {
    const storage = new MemoryStorage();
    const saved = saveListing({ name: "Throw", input: exampleProductInput, listing }, storage);
    expect(saved).not.toBeNull();
    expect(readHistory(storage)).toHaveLength(1);

    const renamed = renameListing(saved!.id, "New name", storage);
    expect(renamed[0].name).toBe("New name");

    const afterDelete = deleteListing(saved!.id, storage);
    expect(afterDelete).toHaveLength(0);

    saveListing({ name: "Keep", input: exampleProductInput, listing }, storage);
    clearHistory(storage);
    expect(storage.getItem(HISTORY_KEY)).toBeNull();
  });

  it("updates an existing entry instead of duplicating it", () => {
    const storage = new MemoryStorage();
    const first = saveListing({ name: "Draft", input: exampleProductInput, listing }, storage)!;
    const second = saveListing({ id: first.id, name: "Draft", input: exampleProductInput, listing }, storage)!;
    expect(second.id).toBe(first.id);
    expect(readHistory(storage)).toHaveLength(1);
  });

  it("ignores corrupted or outdated storage", () => {
    const storage = new MemoryStorage();
    storage.setItem(HISTORY_KEY, "{not json");
    expect(readHistory(storage)).toEqual([]);

    storage.setItem(HISTORY_KEY, JSON.stringify({ version: 99, items: [{}] }));
    expect(readHistory(storage)).toEqual([]);

    storage.setItem(HISTORY_KEY, JSON.stringify({ version: 1, items: [{ id: 1 }] }));
    expect(readHistory(storage)).toEqual([]);
  });

  it("caps saved listings at the history limit", () => {
    const storage = new MemoryStorage();
    for (let index = 0; index < 45; index += 1) {
      saveListing({ name: `Item ${index}`, input: exampleProductInput, listing }, storage);
    }
    const items = readHistory(storage) as SavedListing[];
    expect(items).toHaveLength(40);
    expect(items[0].name).toBe("Item 44");
  });
});
