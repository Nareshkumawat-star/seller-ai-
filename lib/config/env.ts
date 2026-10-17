/**
 * Server-side configuration. Everything is read per-request so that a hosted
 * deployment can be reconfigured without a rebuild.
 *
 * These values are never returned to the browser verbatim — /api/health only
 * exposes whether an inference host is configured, not the URL itself.
 */

const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "qwen3:4b";
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_IMAGE_MB = 5;
const DEFAULT_RATE_LIMIT = 12;

function intFromEnv(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export type ServerConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel: string;
  timeoutMs: number;
  maxImageBytes: number;
  maxImageSizeMb: number;
  rateLimitPerMinute: number;
  deploymentMode: "local" | "remote";
};

export function getServerConfig(): ServerConfig {
  const baseUrl = (process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const maxImageSizeMb = intFromEnv(process.env.MAX_IMAGE_SIZE_MB, DEFAULT_MAX_IMAGE_MB, 1, 20);
  const isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(baseUrl);

  return {
    baseUrl,
    apiKey: process.env.OLLAMA_API_KEY?.trim() || "",
    model: process.env.OLLAMA_MODEL?.trim() || DEFAULT_MODEL,
    visionModel: process.env.OLLAMA_VISION_MODEL?.trim() || "",
    timeoutMs: intFromEnv(process.env.OLLAMA_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 5_000, 600_000),
    maxImageSizeMb,
    maxImageBytes: maxImageSizeMb * 1024 * 1024,
    rateLimitPerMinute: intFromEnv(process.env.RATE_LIMIT_PER_MINUTE, DEFAULT_RATE_LIMIT, 1, 240),
    deploymentMode: isLoopback ? "local" : "remote",
  };
}

/** Safe subset that may leave the server. */
export function publicConfigSummary() {
  const config = getServerConfig();
  return {
    model: config.model,
    visionModelConfigured: Boolean(config.visionModel),
    timeoutSeconds: Math.round(config.timeoutMs / 1000),
    maxImageSizeMb: config.maxImageSizeMb,
    deploymentMode: config.deploymentMode,
    rateLimitPerMinute: config.rateLimitPerMinute,
  };
}
