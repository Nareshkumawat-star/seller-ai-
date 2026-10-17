import { z } from "zod";

export const TONES = ["professional", "friendly", "luxury", "minimal", "persuasive"] as const;
export const LANGUAGES = ["en", "hi", "bilingual"] as const;
export const PLATFORMS = ["generic", "shopify", "etsy", "ebay"] as const;
export const LENGTHS = ["short", "standard", "detailed"] as const;

export type Tone = (typeof TONES)[number];
export type Language = (typeof LANGUAGES)[number];
export type Platform = (typeof PLATFORMS)[number];
export type DescriptionLength = (typeof LENGTHS)[number];

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

export const productInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters.")
    .max(120, "Product name must be 120 characters or fewer."),
  description: z
    .string()
    .trim()
    .min(10, "Add at least a sentence describing the product (10+ characters).")
    .max(2000, "Keep the description under 2000 characters."),
  category: optionalText(80),
  materials: optionalText(300),
  variants: optionalText(200),
  audience: optionalText(200),
  useCase: optionalText(300),
  benefits: optionalText(400),
  price: z
    .string()
    .trim()
    .max(24, "Price is too long.")
    .optional()
    .default("")
    .refine((value) => value === "" || /^\d{1,7}([.,]\d{1,2})?\s?[A-Za-z₹$€£]{0,4}$/.test(value), {
      message: "Use a number such as 1499 or 1499 INR.",
    }),
  currency: z.string().trim().max(8).optional().default("INR"),
  brand: optionalText(80),
  shipping: optionalText(400),
  tone: z.enum(TONES).default("professional"),
  language: z.enum(LANGUAGES).default("en"),
  platform: z.enum(PLATFORMS).default("generic"),
  length: z.enum(LENGTHS).default("standard"),
  keywords: optionalText(300),
  avoid: optionalText(300),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const emptyProductInput: ProductInput = {
  name: "",
  description: "",
  category: "",
  materials: "",
  variants: "",
  audience: "",
  useCase: "",
  benefits: "",
  price: "",
  currency: "INR",
  brand: "",
  shipping: "",
  tone: "professional",
  language: "en",
  platform: "generic",
  length: "standard",
  keywords: "",
  avoid: "",
};

export const exampleProductInput: ProductInput = {
  ...emptyProductInput,
  name: "Handwoven Cotton Throw Blanket",
  description:
    "A handwoven cotton throw blanket made on a traditional pit loom. Soft, breathable, and light enough for year-round use. Each piece has slight variations in weave and colour because it is made by hand.",
  category: "Home textiles / throws",
  materials: "100% cotton, natural indigo dye",
  variants: "130 x 170 cm, indigo and natural white",
  audience: "People furnishing a calm, natural home; gift buyers",
  useCase: "Sofa throw, reading chair, guest bed layer",
  benefits: "Breathable, machine washable on gentle, gets softer with use",
  price: "2499",
  currency: "INR",
  brand: "Aarohi Weaves",
  shipping: "Ships in 3–5 business days. Gentle machine wash cold, line dry.",
  tone: "friendly",
  language: "en",
  platform: "etsy",
  length: "standard",
  keywords: "handwoven throw, cotton blanket, indigo throw",
  avoid: "",
};

/** Fields the UI highlights inline. */
export function firstErrors(input: unknown): Record<string, string> {
  const result = productInputSchema.safeParse(input);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

export type GenerationSettings = {
  tone: Tone;
  language: Language;
  platform: Platform;
  length: DescriptionLength;
};

export function settingsFromInput(input: ProductInput): GenerationSettings {
  return {
    tone: input.tone,
    language: input.language,
    platform: input.platform,
    length: input.length,
  };
}
