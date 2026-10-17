"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BookmarkPlus,
  Check,
  Loader2,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { ProductForm } from "@/components/listing-form/product-form";
import { ImageUpload } from "@/components/listing-form/image-upload";
import { ListingEditor } from "@/components/listing-results/listing-editor";
import { useAiHealth } from "@/components/ai/use-ai-health";
import type { ListingResult } from "@/lib/ai/output-schema";
import { getMarketplace } from "@/lib/config/marketplaces";
import { starterPatch, STARTER_TEMPLATES } from "@/lib/config/templates";
import { readHistory, saveListing } from "@/lib/storage/history";
import {
  emptyProductInput,
  exampleProductInput,
  firstErrors,
  productInputSchema,
  type ProductInput,
} from "@/lib/validation/product-input";

type GenError = { message: string; hint?: string; code?: string; fields?: Record<string, string> };
type Meta = { model: string; latencyMs: number; generatedAt: string };

export function ListingStudio() {
  const params = useSearchParams();
  const health = useAiHealth();

  const [form, setForm] = React.useState<ProductInput>(emptyProductInput);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [listing, setListing] = React.useState<ListingResult | null>(null);
  const [original, setOriginal] = React.useState<ListingResult | null>(null);
  const [meta, setMeta] = React.useState<Meta | null>(null);
  const [genError, setGenError] = React.useState<GenError | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imageNotes, setImageNotes] = React.useState("");
  const [analyzing, setAnalyzing] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [savedId, setSavedId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const appliedTemplate = React.useRef(false);

  React.useEffect(() => {
    if (appliedTemplate.current) return;
    appliedTemplate.current = true;

    const savedIdParam = params.get("listing");
    if (savedIdParam) {
      const saved = readHistory().find((item) => item.id === savedIdParam);
      if (saved) {
        setForm(saved.input);
        setListing(saved.listing);
        setOriginal(saved.listing);
        setSavedId(saved.id);
        setNotice(`Reopened “${saved.name}”.`);
        return;
      }
    }

    const patch = starterPatch(params.get("template"));
    if (patch) setForm((current) => ({ ...current, ...patch }));

    const platformParam = params.get("platform");
    if (platformParam && ["generic", "shopify", "etsy", "ebay"].includes(platformParam)) {
      setForm((current) => ({ ...current, platform: platformParam as ProductInput["platform"] }));
    }
  }, [params]);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 3000);
  };

  const update = (patch: Partial<ProductInput>) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
  };

  const generate = async () => {
    setGenError(null);
    const parsed = productInputSchema.safeParse(form);
    if (!parsed.success) {
      const fields = firstErrors(form);
      setErrors(fields);
      setGenError({ message: "Please fix the highlighted fields before generating." });
      const first = Object.keys(fields)[0];
      if (first) document.getElementById(first)?.focus();
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: parsed.data, imageNotes: imageNotes || undefined }),
        signal: controller.signal,
      });

      const body = (await response.json().catch(() => null)) as
        | { listing: ListingResult; meta: Meta }
        | { error: { code: string; message: string; hint?: string; fields?: Record<string, string> } }
        | null;

      if (!response.ok || !body || !("listing" in body)) {
        const apiError = body && "error" in body ? body.error : null;
        setGenError({
          message: apiError?.message ?? `Generation failed (${response.status}).`,
          hint: apiError?.hint,
          code: apiError?.code,
          fields: apiError?.fields,
        });
        if (apiError?.fields) setErrors(apiError.fields);
        return;
      }

      setListing(body.listing);
      setOriginal(body.listing);
      setMeta(body.meta);
      setSavedId(null);
      flash("Listing generated. Edit anything before you copy it.");
      if (window.matchMedia("(max-width: 1023px)").matches) {
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      setGenError({
        message: "The request could not be completed.",
        hint: "Check that the app server is reachable, then retry. Your input has been kept.",
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setGenError({
      message: "Generation cancelled.",
      hint: "Nothing was saved. Adjust the details and generate again when ready.",
    });
  };

  const analyzeImage = async () => {
    if (!imageFile) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const body = new FormData();
      body.append("image", imageFile);
      const response = await fetch("/api/analyze-image", { method: "POST", body });
      const payload = (await response.json().catch(() => null)) as
        | { observations: string[]; disclaimers: string[] }
        | { error: { message: string; hint?: string } }
        | null;

      if (!response.ok || !payload || !("observations" in payload)) {
        const apiError = payload && "error" in payload ? payload.error : null;
        setAnalysisError(
          [apiError?.message ?? "Image analysis failed.", apiError?.hint].filter(Boolean).join(" "),
        );
        return;
      }
      setImageNotes(payload.observations.join("\n"));
    } catch {
      setAnalysisError("Could not reach the image analysis endpoint. Text generation still works.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!listing) return;
    const saved = saveListing({
      id: savedId ?? undefined,
      name: form.name,
      input: form,
      listing,
    });
    if (!saved) {
      setGenError({
        message: "Could not save to browser storage.",
        hint: "Storage may be full or blocked in private mode. Export the listing instead.",
      });
      return;
    }
    setSavedId(saved.id);
    flash("Saved in this browser (My Listings).");
  };

  const startOver = () => {
    if (listing && !window.confirm("Clear this listing and start a new one? Saved listings are not affected.")) {
      return;
    }
    setForm(emptyProductInput);
    setErrors({});
    setListing(null);
    setOriginal(null);
    setMeta(null);
    setGenError(null);
    setImageFile(null);
    setImageNotes("");
    setAnalysisError(null);
    setSavedId(null);
  };

  const hostedOffline = health.data?.status === "offline" && !health.loading;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Create a product listing</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Describe the product. Seller AI drafts a title, description, features, tags, and marketplace-ready copy
            with your local model.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={startOver}>
          Start over
        </Button>
      </div>

      {hostedOffline ? (
        <div className="flex gap-3 rounded-card border border-warning/30 bg-warning/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium">The AI runtime is unreachable from this server.</p>
            <p className="text-muted-foreground">
              {health.data?.deploymentMode === "remote"
                ? "This is a hosted deployment. Ollama running on your laptop is not accessible from the internet. Point OLLAMA_BASE_URL at a secured inference host, or run the app locally."
                : "Start Ollama and confirm the configured model is installed."}{" "}
              <Link href="/status" className="underline underline-offset-2 hover:text-foreground">
                See AI status
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card className="min-w-0 p-4 sm:p-5">
          <ProductForm
            value={form}
            errors={errors}
            onChange={update}
            onLoadExample={() => {
              setForm(exampleProductInput);
              setErrors({});
              flash("Example loaded — tweak it, then generate.");
            }}
            onReset={() => setForm(emptyProductInput)}
            disabled={loading}
          />

          <div className="mt-3">
            <ImageUpload
              file={imageFile}
              onFileChange={(file) => {
                setImageFile(file);
                setAnalysisError(null);
                if (!file) setImageNotes("");
              }}
              notes={imageNotes}
              onNotesChange={setImageNotes}
              onAnalyze={() => void analyzeImage()}
              analyzing={analyzing}
              analysisError={analysisError}
              visionConfigured={Boolean(health.data?.vision.configured)}
              visionSupported={health.data?.vision.supported}
              maxSizeMb={health.data?.limits.maxImageSizeMb ?? 5}
              disabled={loading}
            />
          </div>

          <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface/95 p-2 backdrop-blur">
            <Button size="lg" onClick={() => void generate()} disabled={loading} className="flex-1 sm:flex-none">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              {loading ? "Generating…" : listing ? "Generate again" : "Generate listing"}
            </Button>
            {loading ? (
              <Button variant="ghost" size="sm" onClick={cancel}>
                Cancel
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {health.data?.model ? `Model: ${health.data.model}` : "Local model"} · slow on small machines
            </p>
          </div>
        </Card>

        <div ref={resultsRef} className="min-w-0 space-y-3 scroll-mt-20">
          {genError ? (
            <div role="alert" className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
                <div className="space-y-1">
                  <p className="font-medium">{genError.message}</p>
                  {genError.hint ? <p className="text-muted-foreground">{genError.hint}</p> : null}
                  {genError.code === "offline" || genError.code === "model_missing" ? (
                    <Link href="/status" className="inline-block text-xs underline underline-offset-2">
                      Open setup instructions
                    </Link>
                  ) : null}
                </div>
              </div>
              {!loading ? (
                <div className="mt-2 pl-6">
                  <Button size="sm" variant="outline" onClick={() => void generate()}>
                    Try again
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {notice ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/5 px-3 py-2 text-xs text-success"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              {notice}
            </div>
          ) : null}

          {listing && original ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={handleSave}>
                  {savedId ? <Save className="h-3.5 w-3.5" aria-hidden /> : <BookmarkPlus className="h-3.5 w-3.5" aria-hidden />}
                  {savedId ? "Update saved listing" : "Save to My Listings"}
                </Button>
                {savedId ? <Badge tone="success">Saved locally</Badge> : null}
                {meta ? (
                  <span className="text-xs text-muted-foreground">
                    {getMarketplace(listing.platform).label} · {(meta.latencyMs / 1000).toFixed(1)}s
                  </span>
                ) : null}
                {health.data?.model ? (
                  <Badge tone="neutral" className="hidden sm:inline-flex">
                    {health.data.model}
                  </Badge>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => void navigator.clipboard?.writeText(JSON.stringify(listing, null, 2)).catch(() => undefined)}
                >
                  <Wand2 className="h-3.5 w-3.5" aria-hidden />
                  Copy JSON
                </Button>
              </div>
              <ListingEditor
                listing={listing}
                original={original}
                input={form}
                onChange={setListing}
                onResetAll={() => setListing(original)}
                onRegenerate={() => void generate()}
                regenerating={loading}
                model={meta?.model}
              />
            </>
          ) : loading ? (
            <LoadingPanel model={health.data?.model} />
          ) : (
            <Card className="p-4 sm:p-6">
              <EmptyState
                icon={<Sparkles className="h-8 w-8" aria-hidden />}
                title="Your generated listing will appear here"
                description="Fill in the product name and a short description, then generate. Everything stays editable — nothing is published automatically."
                action={
                  <Button variant="outline" size="sm" onClick={() => setForm(exampleProductInput)}>
                    Load example details
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                }
              />
              <div className="mt-5 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                {STARTER_TEMPLATES.map((template) => (
                  <Link
                    key={template.id}
                    href={`/create?template=${template.id}`}
                    className="rounded-lg border border-border px-3 py-2 transition-colors hover:bg-surface-muted"
                  >
                    <span className="block font-medium text-foreground">{template.title}</span>
                    {template.description}
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingPanel({ model }: { model?: string }) {
  return (
    <Card className="p-4 sm:p-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        Generating with {model ?? "the local model"}…
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Local inference can take 10–60 seconds depending on model size and hardware. You can cancel at any time.
      </p>
      <div className="mt-5 space-y-3">
        <div className="skeleton h-5 w-3/4 rounded" />
        <div className="skeleton h-16 w-full rounded" />
        <div className="skeleton h-32 w-full rounded" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-10 rounded" />
          <div className="skeleton h-10 rounded" />
        </div>
      </div>
    </Card>
  );
}
