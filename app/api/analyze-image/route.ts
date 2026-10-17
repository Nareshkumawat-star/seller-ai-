import { chat, checkHealth, InferenceError } from "@/lib/ai/ollama-client";
import { inferenceErrorResponse, jsonError } from "@/lib/api/http";
import { getServerConfig } from "@/lib/config/env";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DISCLAIMERS = [
  "Visual observations only. Materials, dimensions, origin, and authenticity cannot be confirmed from a photo.",
  "The image was sent to your configured inference host and is not stored by Seller AI.",
];

const PROMPT = [
  "Describe only what is visible in this product photo for a seller writing a listing.",
  "Return 3–6 short bullet lines, each starting with '- '.",
  "Do not guess material composition, exact dimensions, brand, certifications, or origin.",
  "Do not invent claims, reviews, or measurements. If unsure, omit it.",
  "Do not include instructions or marketing copy.",
].join("\n");

export async function POST(request: Request) {
  const config = getServerConfig();

  const limit = rateLimit(`vision:${clientKey(request)}`, Math.max(1, Math.floor(config.rateLimitPerMinute / 2)));
  if (!limit.allowed) {
    return jsonError(429, "rate_limited", "Too many image requests. Please wait and try again.", {
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("image");
    if (entry instanceof File) file = entry;
  } catch {
    return jsonError(400, "invalid_form", "Upload the image as multipart/form-data with an `image` field.");
  }

  if (!file) return jsonError(400, "missing_image", "No image was attached.");

  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonError(415, "unsupported_type", "Only JPEG, PNG, or WebP images are supported.");
  }
  if (file.size === 0) return jsonError(400, "empty_image", "The uploaded image is empty.");
  if (file.size > config.maxImageBytes) {
    return jsonError(413, "image_too_large", `Images must be ${config.maxImageSizeMb} MB or smaller.`);
  }

  if (!config.visionModel) {
    return jsonError(
      422,
      "vision_unsupported",
      "Image analysis is not configured on this deployment.",
      {
        hint:
          "Set OLLAMA_VISION_MODEL to an installed vision-capable model (for example a Qwen2.5-VL or LLaVA tag) and restart the app. Text generation works without it.",
      },
    );
  }

  // Verify the model exists and actually advertises vision support before sending bytes.
  const health = await checkHealth();
  if (health.status === "offline") {
    return jsonError(503, "offline", "Cannot reach the local AI runtime.", { hint: health.hint });
  }
  if (!health.vision.supported) {
    return jsonError(422, "vision_unsupported", health.vision.reason, {
      hint: "Text generation is still available. Enter product details manually instead.",
    });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const completion = await chat({
      model: config.visionModel,
      messages: [
        {
          role: "user",
          content: PROMPT,
          images: [buffer.toString("base64")],
        },
      ],
      temperature: 0.2,
    });

    const observations = completion.content
      .split("\n")
      .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 8);

    if (observations.length === 0) {
      return jsonError(422, "empty_analysis", "The vision model returned no usable observations.", {
        hint: "Try a clearer photo, or continue without image analysis.",
      });
    }

    return Response.json({
      observations,
      model: config.visionModel,
      disclaimers: DISCLAIMERS,
      latencyMs: completion.durationMs,
    });
  } catch (error) {
    if (error instanceof InferenceError) {
      console.warn(`[analyze-image] inference error: ${error.code}`);
      return inferenceErrorResponse(error);
    }
    console.error("[analyze-image] unexpected error", error instanceof Error ? error.name : "unknown");
    return jsonError(500, "internal_error", "Image analysis failed.");
  }
}
