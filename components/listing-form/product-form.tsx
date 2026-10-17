"use client";

import * as React from "react";
import { RotateCcw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { MARKETPLACE_OPTIONS } from "@/lib/config/marketplaces";
import {
  LENGTHS,
  LANGUAGES,
  TONES,
  type ProductInput,
} from "@/lib/validation/product-input";

const TONE_LABELS: Record<string, string> = {
  professional: "Professional",
  friendly: "Friendly",
  luxury: "Luxury",
  minimal: "Minimal",
  persuasive: "Persuasive",
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  hi: "Hindi (Devanagari)",
  bilingual: "English + Hindi",
};

const LENGTH_LABELS: Record<string, string> = {
  short: "Short",
  standard: "Standard",
  detailed: "Detailed",
};

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD"];

export type ProductFormProps = {
  value: ProductInput;
  errors: Record<string, string>;
  onChange: (patch: Partial<ProductInput>) => void;
  onLoadExample: () => void;
  onReset: () => void;
  disabled?: boolean;
  formId?: string;
};

function errProps(id: string, error?: string) {
  return {
    id,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}

export function ProductForm({
  value,
  errors,
  onChange,
  onLoadExample,
  onReset,
  disabled,
  formId = "listing-form",
}: ProductFormProps) {
  return (
    <form
      id={formId}
      className="space-y-7"
      onSubmit={(event) => event.preventDefault()}
      noValidate
      aria-label="Product details"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Fields marked <span className="font-medium text-foreground">required</span> are used for the core copy.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onLoadExample} disabled={disabled}>
            <Wand2 className="h-3.5 w-3.5" aria-hidden />
            Try an example
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset} disabled={disabled}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Clear
          </Button>
        </div>
      </div>

      <fieldset className="space-y-4" disabled={disabled}>
        <legend className="mb-1 text-sm font-semibold">Product basics</legend>

        <Field label="Product name" htmlFor="name" error={errors.name}>
          <Input
            {...errProps("name", errors.name)}
            value={value.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="Handwoven cotton throw blanket"
            autoComplete="off"
            required
          />
        </Field>

        <Field
          label="What is it?"
          htmlFor="description"
          error={errors.description}
          description="Plain facts work best: what it is, how it is made, what makes it useful."
        >
          <Textarea
            {...errProps("description", errors.description)}
            value={value.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="A soft handwoven cotton throw made on a traditional pit loom…"
            required
            rows={4}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="category" optional>
            <Input
              id="category"
              value={value.category}
              onChange={(event) => onChange({ category: event.target.value })}
              placeholder="Home textiles"
            />
          </Field>
          <Field label="Brand" htmlFor="brand" optional>
            <Input
              id="brand"
              value={value.brand}
              onChange={(event) => onChange({ brand: event.target.value })}
              placeholder="Aarohi Weaves"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4" disabled={disabled}>
        <legend className="mb-1 text-sm font-semibold">Details buyers ask about</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Materials / ingredients" htmlFor="materials" optional>
            <Input
              id="materials"
              value={value.materials}
              onChange={(event) => onChange({ materials: event.target.value })}
              placeholder="100% cotton, natural indigo dye"
            />
          </Field>
          <Field label="Colour, size, variants" htmlFor="variants" optional>
            <Input
              id="variants"
              value={value.variants}
              onChange={(event) => onChange({ variants: event.target.value })}
              placeholder="130 × 170 cm; indigo, natural"
            />
          </Field>
          <Field label="Target audience" htmlFor="audience" optional>
            <Input
              id="audience"
              value={value.audience}
              onChange={(event) => onChange({ audience: event.target.value })}
              placeholder="Gift buyers, natural-home decorators"
            />
          </Field>
          <Field label="Intended use" htmlFor="useCase" optional>
            <Input
              id="useCase"
              value={value.useCase}
              onChange={(event) => onChange({ useCase: event.target.value })}
              placeholder="Sofa throw, reading chair, guest bed"
            />
          </Field>
        </div>

        <Field label="Product benefits" htmlFor="benefits" optional>
          <Textarea
            id="benefits"
            value={value.benefits}
            onChange={(event) => onChange({ benefits: event.target.value })}
            placeholder="Breathable; gets softer with use; machine washable"
            rows={2}
          />
        </Field>

        <Field label="Shipping or care information" htmlFor="shipping" optional>
          <Textarea
            id="shipping"
            value={value.shipping}
            onChange={(event) => onChange({ shipping: event.target.value })}
            placeholder="Ships in 3–5 days. Gentle machine wash, line dry."
            rows={2}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <Field label="Price" htmlFor="price" error={errors.price} optional>
            <Input
              {...errProps("price", errors.price)}
              id="price"
              value={value.price}
              onChange={(event) => onChange({ price: event.target.value })}
              placeholder="2499"
              inputMode="decimal"
            />
          </Field>
          <Field label="Currency" htmlFor="currency">
            <Select
              id="currency"
              value={value.currency}
              onChange={(event) => onChange({ currency: event.target.value })}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4" disabled={disabled}>
        <legend className="mb-1 text-sm font-semibold">How it should sound</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tone" htmlFor="tone">
            <Select id="tone" value={value.tone} onChange={(event) => onChange({ tone: event.target.value as ProductInput["tone"] })}>
              {TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {TONE_LABELS[tone]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Language" htmlFor="language">
            <Select
              id="language"
              value={value.language}
              onChange={(event) => onChange({ language: event.target.value as ProductInput["language"] })}
            >
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {LANGUAGE_LABELS[language]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Marketplace format" htmlFor="platform">
            <Select
              id="platform"
              value={value.platform}
              onChange={(event) => onChange({ platform: event.target.value as ProductInput["platform"] })}
            >
              {MARKETPLACE_OPTIONS.map((market) => (
                <option key={market.id} value={market.id}>
                  {market.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description length" htmlFor="length">
            <Select
              id="length"
              value={value.length}
              onChange={(event) => onChange({ length: event.target.value as ProductInput["length"] })}
            >
              {LENGTHS.map((length) => (
                <option key={length} value={length}>
                  {LENGTH_LABELS[length]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Marketplace limits change. Seller AI follows the templates in{" "}
          <a href="/templates" className="underline underline-offset-2 hover:text-foreground">
            Templates
          </a>{" "}
          — always confirm current requirements before publishing.
        </p>
      </fieldset>

      <fieldset className="space-y-4" disabled={disabled}>
        <legend className="mb-1 text-sm font-semibold">Fine-tune (optional)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Keywords to include" htmlFor="keywords" optional>
            <Textarea
              id="keywords"
              value={value.keywords}
              onChange={(event) => onChange({ keywords: event.target.value })}
              placeholder="handwoven throw, cotton blanket"
              rows={2}
            />
          </Field>
          <Field label="Words or claims to avoid" htmlFor="avoid" optional>
            <Textarea
              id="avoid"
              value={value.avoid}
              onChange={(event) => onChange({ avoid: event.target.value })}
              placeholder="best ever, eco-friendly"
              rows={2}
            />
          </Field>
        </div>
      </fieldset>
    </form>
  );
}
