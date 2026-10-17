export type MarketplaceId = "generic" | "shopify" | "etsy" | "ebay";

export type MarketplaceTemplate = {
  id: MarketplaceId;
  label: string;
  tagline: string;
  /** Soft guidance only — marketplace rules change and must be verified by the seller. */
  titleMaxChars: number;
  titleGuidance: string;
  descriptionStructure: string;
  keywordGuidance: string;
  maxTags: number;
  notes: string;
};

export const MARKETPLACES: Record<MarketplaceId, MarketplaceTemplate> = {
  generic: {
    id: "generic",
    label: "Generic online store",
    tagline: "Flexible listing for your own storefront or social commerce.",
    titleMaxChars: 70,
    titleGuidance: "Lead with the product and its most useful differentiator. Keep it under 70 characters.",
    descriptionStructure:
      "Opening paragraph, then a short bullet list of features, then care/shipping notes if provided.",
    keywordGuidance: "Use 5–10 natural search phrases. No repetition or unrelated terms.",
    maxTags: 12,
    notes: "No platform-specific character limits are enforced by Seller AI.",
  },
  shopify: {
    id: "shopify",
    label: "Shopify",
    tagline: "Clear product title, persuasive description, SEO metadata.",
    titleMaxChars: 60,
    titleGuidance:
      "Brand + product + key attribute (e.g. “Aarohi Handloom Cotton Throw, Indigo”). Aim for 60 characters or fewer.",
    descriptionStructure:
      "One-sentence value proposition, a benefits paragraph, 3–6 feature bullets, then materials and care.",
    keywordGuidance: "Write for the product page SEO title/meta description; avoid stuffing.",
    maxTags: 10,
    notes: "Verify current Shopify SEO field lengths in your admin before publishing.",
  },
  etsy: {
    id: "etsy",
    label: "Etsy",
    tagline: "Concise title, handmade details, searchable tags.",
    titleMaxChars: 140,
    titleGuidance:
      "Front-load the strongest search phrase. Mention material, style, or occasion. Etsy allows longer titles, but short ones read better.",
    descriptionStructure:
      "Story or use case, then details (materials, dimensions, variants), then shipping and care, then a short FAQ-style note.",
    keywordGuidance: "Write multi-word buyer phrases, not single generic words.",
    maxTags: 13,
    notes:
      "Etsy tag and title limits change. Confirm current limits and handmade/production policies in Etsy's seller help.",
  },
  ebay: {
    id: "ebay",
    label: "eBay",
    tagline: "Scannable details for buyers who compare quickly.",
    titleMaxChars: 80,
    titleGuidance: "Product type + brand + key specs. Avoid promotional words and ALL CAPS.",
    descriptionStructure:
      "Short summary, item specifics as a labelled list, what's included, condition, then shipping/returns notes.",
    keywordGuidance: "Use the terms buyers filter by: type, size, material, compatibility.",
    maxTags: 10,
    notes: "eBay item specifics and title limits vary by category. Verify in Seller Hub.",
  },
};

export const MARKETPLACE_OPTIONS = Object.values(MARKETPLACES);

export function getMarketplace(id: string | undefined): MarketplaceTemplate {
  if (id && id in MARKETPLACES) return MARKETPLACES[id as MarketplaceId];
  return MARKETPLACES.generic;
}
