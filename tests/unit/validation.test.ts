import { describe, expect, it } from "vitest";
import {
  emptyProductInput,
  exampleProductInput,
  firstErrors,
  productInputSchema,
} from "@/lib/validation/product-input";

describe("productInputSchema", () => {
  it("accepts the example product", () => {
    const result = productInputSchema.safeParse(exampleProductInput);
    expect(result.success).toBe(true);
  });

  it("requires a product name and description", () => {
    const errors = firstErrors(emptyProductInput);
    expect(errors.name).toMatch(/at least 2 characters/i);
    expect(errors.description).toMatch(/at least a sentence/i);
  });

  it("rejects a description that is too short", () => {
    const result = productInputSchema.safeParse({ ...exampleProductInput, description: "too short" });
    expect(result.success).toBe(false);
  });

  it("rejects malformed prices but allows currency suffixes", () => {
    expect(productInputSchema.safeParse({ ...exampleProductInput, price: "about 20" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...exampleProductInput, price: "1499 INR" }).success).toBe(true);
    expect(productInputSchema.safeParse({ ...exampleProductInput, price: "" }).success).toBe(true);
  });

  it("enforces enum values for tone, language, and marketplace", () => {
    expect(productInputSchema.safeParse({ ...exampleProductInput, tone: "shouty" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...exampleProductInput, language: "fr" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...exampleProductInput, platform: "amazon" }).success).toBe(false);
  });

  it("trims and caps long optional text", () => {
    const result = productInputSchema.safeParse({ ...exampleProductInput, materials: "x".repeat(301) });
    expect(result.success).toBe(false);
  });

  it("applies defaults for missing generation settings", () => {
    const parsed = productInputSchema.parse({ name: "Lamp", description: "A small brass desk lamp." });
    expect(parsed.language).toBe("en");
    expect(parsed.tone).toBe("professional");
    expect(parsed.platform).toBe("generic");
  });

  it("returns the first error per field", () => {
    const errors = firstErrors({
      ...emptyProductInput,
      name: "A",
      description: "short",
      price: "abc",
    });
    expect(Object.keys(errors).sort()).toEqual(["description", "name", "price"]);
  });
});
