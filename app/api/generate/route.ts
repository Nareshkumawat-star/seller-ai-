import { chat, InferenceError } from "@/lib/ai/ollama-client";
import { ListingParseError, parseListingOutput } from "@/lib/ai/output-schema";
import { buildListingPrompt } from "@/lib/ai/prompt-builder";
import { contentLengthExceeded, inferenceErrorResponse, jsonError } from "@/lib/api/http";
import { getServerConfig } from "@/lib/config/env";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { productInputSchema } from "@/lib/validation/product-input";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
  const config = getServerConfig();

  const limit = rateLimit(`generate:${clientKey(request)}`, config.rateLimitPerMinute);
  if (!limit.allowed) {
    return jsonError(429, "rate_limited", "Too many generation requests. Please wait and try again.", {
      hint: `Retry in about ${limit.retryAfterSeconds} seconds.`,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  if (contentLengthExceeded(request, MAX_BODY_BYTES)) {
    return jsonError(413, "payload_too_large", "The request is too large.");
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "The request body must be valid JSON.");
  }

  const formPart =
    rawBody && typeof rawBody === "object" && "form" in rawBody
      ? (rawBody as { form: unknown }).form
      : rawBody;

  const parsed = productInputSchema.safeParse(formPart);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "_form");
      if (!(key in fields)) fields[key] = issue.message;
    }
    return jsonError(422, "invalid_input", "Some product details need attention.", { fields });
  }

  const input = parsed.data;
  const imageNotesRaw =
    rawBody && typeof rawBody === "object" && "imageNotes" in rawBody
      ? (rawBody as { imageNotes: unknown }).imageNotes
      : undefined;
  const imageNotes =
    typeof imageNotesRaw === "string"
      ? imageNotesRaw.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 8)
      : [];

  const prompt = buildListingPrompt(input, imageNotes.length ? { observations: imageNotes } : undefined);

  try {
    const completion = await chat({
      model: config.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      json: true,
    });

    const listing = parseListingOutput(completion.content, {
      language: input.language,
      platform: input.platform,
    });

    return Response.json(
      {
        listing,
        meta: {
          model: completion.model,
          latencyMs: completion.durationMs,
          platform: input.platform,
          language: input.language,
          generatedAt: new Date().toISOString(),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ListingParseError) {
      // Log shape only — never the product text.
      console.warn(`[generate] unparseable model output (${error.code})`);
      return jsonError(
        422,
        error.code,
        error.code === "malformed_json"
          ? "The model did not return usable JSON. Your input is safe — try again or use a smaller model."
          : "The model returned incomplete listing data. Your input is safe — try again.",
        { hint: "Retry generation. If it keeps failing, try a more capable model via OLLAMA_MODEL." },
      );
    }
    if (error instanceof InferenceError) {
      console.warn(`[generate] inference error: ${error.code}`);
      return inferenceErrorResponse(error);
    }
    console.error("[generate] unexpected error", error instanceof Error ? error.name : "unknown");
    return jsonError(500, "internal_error", "Something went wrong while generating the listing.");
  }
}
