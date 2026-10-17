import type { ProductInput } from "@/lib/validation/product-input";
import { emptyProductInput } from "@/lib/validation/product-input";

export type StarterTemplate = {
  id: string;
  title: string;
  description: string;
  patch: Partial<ProductInput>;
};

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "handmade",
    title: "Handmade goods",
    description: "For Etsy-style craft listings: materials, process, and care details.",
    patch: {
      name: "Handwoven Cotton Throw Blanket",
      description:
        "A handwoven cotton throw blanket made on a traditional pit loom. Soft, breathable, and light enough for year-round use. Slight variations in weave and colour are part of the handmade finish.",
      category: "Home textiles / throws",
      materials: "100% cotton, natural indigo dye",
      variants: "130 × 170 cm; indigo and natural white",
      audience: "Natural-home decorators, gift buyers",
      useCase: "Sofa throw, reading chair, guest bed layer",
      benefits: "Breathable; gets softer with use; machine washable on gentle",
      shipping: "Ships in 3–5 business days. Gentle machine wash cold, line dry.",
      tone: "friendly",
      platform: "etsy",
      length: "standard",
      keywords: "handwoven throw, cotton blanket, indigo throw",
    },
  },
  {
    id: "apparel",
    title: "Apparel & accessories",
    description: "Fit, fabric, and sizing first — the questions buyers ask before ordering.",
    patch: {
      name: "Relaxed Linen Shirt",
      description:
        "A relaxed-fit shirt in midweight linen with a camp collar and corozo buttons. Cut straight through the body for an easy layer in warm weather.",
      category: "Clothing / shirts",
      materials: "100% European linen, corozo buttons",
      variants: "Sizes S–XXL; sand, olive, off-white",
      audience: "Adults looking for breathable warm-weather clothing",
      useCase: "Everyday wear, travel, smart-casual",
      benefits: "Breathable linen, loose fit, garment-washed for softness",
      price: "3200",
      currency: "INR",
      shipping: "Ships in 2–4 days. Machine wash cold, line dry.",
      tone: "minimal",
      platform: "shopify",
      length: "standard",
      keywords: "linen shirt, relaxed fit, summer shirt",
    },
  },
  {
    id: "digital",
    title: "Digital product",
    description: "State format, contents, and licence clearly to avoid refunds.",
    patch: {
      name: "Notion Monthly Budget Template",
      description:
        "A Notion template for tracking a monthly household budget. Includes a dashboard, category rollups, and a subscription tracker. Delivered as a duplicated Notion page, not a physical item.",
      category: "Digital templates",
      materials: "Notion template (digital download)",
      variants: "Single workspace licence",
      audience: "People budgeting for the first time",
      useCase: "Monthly budgeting, subscription tracking",
      benefits: "Duplicate once, reusable every month; no spreadsheet formulas to maintain",
      price: "499",
      currency: "INR",
      shipping: "Instant access after purchase. Personal use only; no resale.",
      tone: "professional",
      platform: "generic",
      length: "short",
      keywords: "notion budget template, budget planner, digital download",
    },
  },
];

export function starterPatch(id: string | null | undefined): Partial<ProductInput> | null {
  const template = STARTER_TEMPLATES.find((item) => item.id === id);
  return template ? template.patch : null;
}

export const baseForm = emptyProductInput;
