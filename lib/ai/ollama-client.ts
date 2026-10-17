import { getServerConfig } from "@/lib/config/env";
import {
  modelNameMatches,
  resolveVisionCapability,
  type VisionCapability,
} from "@/lib/ai/model-capabilities";

export type InferenceErrorCode =
  | "offline"
  | "model_missing"
  | "timeout"
  | "unauthorized"
  | "overloaded"
  | "bad_response"
  | "unsupported"
  | "unknown";

const HINTS: Record<InferenceErrorCode, string> = {
  offline:
    "Start Ollama (`ollama serve`) and confirm OLLAMA_BASE_URL points at a reachable inference host.",
  model_missing:
    "Download the configured model with `ollama pull <model>`, or change OLLAMA_MODEL to a model you already have.",
  timeout:
    "The local model took too long. Try a smaller model, a shorter description, or raise OLLAMA_TIMEOUT_MS.",
  unauthorized: "The inference host rejected the request. Check OLLAMA_API_KEY.",
  overloaded: "The inference host is busy or out of memory. Wait a moment and retry, or use a smaller model.",
  bad_response: "The model returned an unusable response. Retry, or try a different model.",
  unsupported: "This capability is not available with the configured model.",
  unknown: "The inference request failed. Check the server logs for details.",
};

export class InferenceError extends Error {
  code: InferenceErrorCode;
  httpStatus: number;
  hint: string;

  constructor(code: InferenceErrorCode, httpStatus: number, message?: string) {
    super(message ?? HINTS[code]);
    this.name = "InferenceError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.hint = HINTS[code];
  }
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
};

export type ChatResult = {
  content: string;
  model: string;
  durationMs: number;
  evalCount: number | null;
};

function authHeaders(): Record<string, string> {
  const { apiKey } = getServerConfig();
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    if (name === "AbortError" || name === "TimeoutError") {
      throw new InferenceError("timeout", 504);
    }
    throw new InferenceError("offline", 503);
  } finally {
    clearTimeout(timer);
  }
}

function mapHttpError(status: number, context: string): InferenceError {
  if (status === 404) return new InferenceError("model_missing", 503);
  if (status === 401 || status === 403) return new InferenceError("unauthorized", 502);
  if (status === 429) return new InferenceError("overloaded", 503);
  if (status >= 500) return new InferenceError("overloaded", 503);
  return new InferenceError("unknown", 502, `Inference host rejected the ${context} request (${status}).`);
}

function joinUrl(path: string): string {
  return `${getServerConfig().baseUrl}${path}`;
}

export async function listModels(timeoutMs = 5_000): Promise<string[]> {
  const response = await fetchWithTimeout(
    joinUrl("/api/tags"),
    { method: "GET", headers: { Accept: "application/json", ...authHeaders() } },
    timeoutMs,
  );
  if (!response.ok) throw mapHttpError(response.status, "list models");

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new InferenceError("bad_response", 502, "The inference host returned invalid JSON.");
  }

  const models = (body as { models?: Array<{ name?: string; model?: string }> })?.models;
  if (!Array.isArray(models)) {
    throw new InferenceError("bad_response", 502, "The inference host did not return a model list.");
  }
  // Ollama can return the same tag more than once (duplicate manifests). Dedupe so
  // counts and React keys derived from this list stay unique.
  const names = models
    .map((entry) => entry.name?.trim() || entry.model?.trim() || "")
    .filter((name): name is string => Boolean(name));
  return Array.from(new Set(names));
}

async function showModelCapabilities(
  model: string,
  timeoutMs: number,
): Promise<string[] | null> {
  try {
    const response = await fetchWithTimeout(
      joinUrl("/api/show"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ model }),
      },
      timeoutMs,
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { capabilities?: unknown };
    if (!Array.isArray(body.capabilities)) return null;
    return body.capabilities.filter((value): value is string => typeof value === "string");
  } catch {
    return null;
  }
}

export type HealthReport = {
  status: "connected" | "model_missing" | "offline";
  model: string;
  modelInstalled: boolean;
  latencyMs: number | null;
  vision: VisionCapability & { configured: boolean };
  availableModels: string[];
  message: string;
  hint?: string;
  checkedAt: string;
};

export async function checkHealth(): Promise<HealthReport> {
  const config = getServerConfig();
  const started = Date.now();
  const checkedAt = new Date().toISOString();

  const visionFallback = resolveVisionCapability({ configuredVisionModel: config.visionModel });

  let installed: string[];
  try {
    installed = await listModels(Math.min(config.timeoutMs, 8_000));
  } catch (error) {
    const code = error instanceof InferenceError ? error.code : "unknown";
    return {
      status: "offline",
      model: config.model,
      modelInstalled: false,
      latencyMs: null,
      vision: { ...visionFallback, supported: false, configured: Boolean(config.visionModel) },
      availableModels: [],
      message:
        code === "timeout"
          ? "The inference host did not answer in time."
          : "Cannot reach the local inference server.",
      hint:
        code === "timeout"
          ? HINTS.timeout
          : "Start Ollama, then check that OLLAMA_BASE_URL is reachable from the server (not just your browser).",
      checkedAt,
    };
  }

  const modelInstalled = installed.some((name) => modelNameMatches(name, config.model));
  const latencyMs = Date.now() - started;

  let vision: VisionCapability & { configured: boolean } = {
    ...visionFallback,
    configured: Boolean(config.visionModel),
  };
  if (config.visionModel && installed.some((name) => modelNameMatches(name, config.visionModel))) {
    const capabilities = await showModelCapabilities(config.visionModel, Math.min(config.timeoutMs, 8_000));
    vision = {
      ...resolveVisionCapability({
        configuredVisionModel: config.visionModel,
        showCapabilities: capabilities,
      }),
      configured: true,
    };
  } else if (config.visionModel) {
    vision = {
      supported: false,
      model: config.visionModel,
      source: "none",
      configured: true,
      reason: `The configured vision model is not installed. Run \`ollama pull ${config.visionModel}\`.`,
    };
  }

  return {
    status: modelInstalled ? "connected" : "model_missing",
    model: config.model,
    modelInstalled,
    latencyMs,
    vision,
    availableModels: installed.slice(0, 20),
    message: modelInstalled
      ? `Connected. ${config.model} is installed.`
      : `Ollama is running, but ${config.model} is not installed.`,
    hint: modelInstalled ? undefined : `Run \`ollama pull ${config.model}\` and check again.`,
    checkedAt,
  };
}

export type ChatOptions = {
  model: string;
  messages: ChatMessage[];
  json?: boolean;
  temperature?: number;
  timeoutMs?: number;
};

export async function chat(options: ChatOptions): Promise<ChatResult> {
  const config = getServerConfig();
  const timeoutMs = options.timeoutMs ?? config.timeoutMs;
  const started = Date.now();

  const response = await fetchWithTimeout(
    joinUrl("/api/chat"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        stream: false,
        ...(options.json ? { format: "json" } : {}),
        options: {
          temperature: options.temperature ?? 0.4,
          // Guard against runaway generations on small hosts.
          num_predict: 1600,
        },
      }),
    },
    timeoutMs,
  );

  if (!response.ok) throw mapHttpError(response.status, "chat");

  let body: {
    model?: string;
    message?: { content?: string };
    eval_count?: number;
    total_duration?: number;
  };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    throw new InferenceError("bad_response", 502, "The inference host returned invalid JSON.");
  }

  const content = body.message?.content?.trim();
  if (!content) throw new InferenceError("bad_response", 502, "The model returned an empty response.");

  return {
    content,
    model: body.model ?? options.model,
    durationMs: Math.round((body.total_duration ?? 0) / 1_000_000) || Date.now() - started,
    evalCount: typeof body.eval_count === "number" ? body.eval_count : null,
  };
}
