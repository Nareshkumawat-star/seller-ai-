// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/generate/route";
import { GET as healthGet } from "@/app/api/health/route";
import { POST as analyzePost } from "@/app/api/analyze-image/route";
import { resetRateLimits } from "@/lib/rate-limit";
import { exampleProductInput } from "@/lib/validation/product-input";

const validListing = {
  title: "Handwoven Indigo Cotton Throw",
  shortDescription: "A breathable throw for calm interiors.",
  fullDescription: "Woven on a traditional pit loom with natural indigo cotton.",
  bulletPoints: ["Breathable cotton", "Machine washable"],
  seoKeywords: ["handwoven throw", "indigo blanket"],
  tags: ["cotton", "indigo"],
  alternativeTitles: ["Indigo Handloom Throw"],
  metaDescription: "Handwoven indigo cotton throw, breathable and machine washable in cold water.",
  language: "en",
  platform: "etsy",
  warnings: [],
};

let ipCounter = 0;
function uniqueIp() {
  ipCounter += 1;
  return `10.0.0.${ipCounter}`;
}

function request(body: unknown, ip = uniqueIp()): Request {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function chatResponse(content: unknown): Response {
  return Response.json({
    model: "qwen3:4b",
    message: { content: typeof content === "string" ? content : JSON.stringify(content) },
    total_duration: 1_500_000_000,
    eval_count: 120,
  });
}

beforeEach(() => {
  resetRateLimits();
  vi.stubEnv("OLLAMA_BASE_URL", "http://127.0.0.1:11434");
  vi.stubEnv("OLLAMA_MODEL", "qwen3:4b");
  vi.stubEnv("OLLAMA_VISION_MODEL", "");
  vi.stubEnv("OLLAMA_TIMEOUT_MS", "120000");
});

describe("POST /api/generate", () => {
  it("generates a validated listing from a mocked Ollama response", async () => {
    const fetchMock = vi.fn(async () => chatResponse(validListing));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ form: exampleProductInput }));
    const body = (await response.json()) as { listing: typeof validListing; meta: { model: string } };

    expect(response.status).toBe(200);
    expect(body.listing.title).toBe(validListing.title);
    expect(body.meta.model).toBe("qwen3:4b");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:11434/api/chat");
    expect(JSON.parse(String(init.body)).format).toBe("json");
  });

  it("returns 422 with field errors for an invalid body", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ form: { ...exampleProductInput, name: "" } }));
    const body = (await response.json()) as { error: { code: string; fields: Record<string, string> } };

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("invalid_input");
    expect(body.error.fields.name).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": uniqueIp() },
        body: "{oops",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("reports an unreachable runtime as 503 without leaking internals", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("connect ECONNREFUSED 127.0.0.1:11434"))));

    const response = await POST(request({ form: exampleProductInput }));
    const text = await response.text();

    expect(response.status).toBe(503);
    expect(text).toContain("offline");
    expect(text).not.toContain("ECONNREFUSED");
    expect(text).not.toContain("11434");
    expect(text).not.toContain("stack");
  });

  it("maps a 404 from Ollama to a model_missing error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("model not found", { status: 404 })));
    const response = await POST(request({ form: exampleProductInput }));
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("model_missing");
    expect(body.error.message).toMatch(/not installed/i);
  });

  it("returns a recoverable error for malformed model output", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => chatResponse("Sure! Here is a nice product title.")));
    const response = await POST(request({ form: exampleProductInput }));
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("malformed_json");
    expect(body.error.message).toMatch(/input is safe/i);
  });

  it("returns 504 when inference times out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("The operation was aborted.", "AbortError");
      }),
    );
    const response = await POST(request({ form: exampleProductInput }));
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(504);
    expect(body.error.code).toBe("timeout");
  });

  it("retries once when the model ignores a Hindi request, then reports verification", async () => {
    const hindiListing = {
      ...validListing,
      language: "hi",
      title: "हस्तनिर्मित सूती कंबल",
      shortDescription: "हस्तनिर्मित सूती कंबल, आरामदायक और साँस लेने योग्य।",
      fullDescription: "पारंपरिक करघे पर बुना गया सूती कंबल, प्राकृतिक नीले रंजक के साथ।",
      bulletPoints: ["साँस लेने योग्य कपास"],
      alternativeTitles: ["सूती कंबल"],
      metaDescription: "हस्तनिर्मित सूती कंबल, ठंडे पानी में धुलने योग्य।",
    };
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { messages: Array<{ role: string }> };
      const isRetry = body.messages.some((message) => message.role === "assistant");
      return isRetry ? chatResponse(hindiListing) : chatResponse({ ...validListing, language: "hi" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ form: { ...exampleProductInput, language: "hi" } }));
    const body = (await response.json()) as {
      listing: { title: string; warnings: string[] };
      meta: { languageVerified: boolean; detectedScript: string };
    };

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(body.listing.title).toBe("हस्तनिर्मित सूती कंबल");
    expect(body.meta.languageVerified).toBe(true);
    expect(body.meta.detectedScript).toBe("devanagari");
  });

  it("warns instead of claiming a language the model did not write", async () => {
    // The model echoes language: "hi" but writes English — the app must not label it Hindi.
    vi.stubGlobal("fetch", vi.fn(async () => chatResponse({ ...validListing, language: "hi" })));

    const response = await POST(request({ form: { ...exampleProductInput, language: "hi" } }));
    const body = (await response.json()) as {
      listing: { warnings: string[] };
      meta: { languageVerified: boolean; detectedScript: string };
    };

    expect(response.status).toBe(200);
    expect(body.meta.languageVerified).toBe(false);
    expect(body.meta.detectedScript).toBe("latin");
    expect(body.listing.warnings.join(" ")).toMatch(/Devanagari/i);
  });

  it("throttles repeated requests", async () => {
    vi.stubEnv("RATE_LIMIT_PER_MINUTE", "1");
    vi.stubGlobal("fetch", vi.fn(async () => chatResponse(validListing)));
    const ip = uniqueIp();

    const first = await POST(request({ form: exampleProductInput }, ip));
    const second = await POST(request({ form: exampleProductInput }, ip));

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("GET /api/health", () => {
  it("reports connected only when the configured model is installed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ models: [{ name: "qwen3:4b" }, { name: "llama3:8b" }] })),
    );
    const response = await healthGet();
    const body = (await response.json()) as { status: string; modelInstalled: boolean; vision: { configured: boolean } };

    expect(body.status).toBe("connected");
    expect(body.modelInstalled).toBe(true);
    expect(body.vision.configured).toBe(false);
  });

  it("reports model_missing when Ollama is up but the model is absent", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ models: [{ name: "llama3:8b" }] })));
    const response = await healthGet();
    const body = (await response.json()) as { status: string; hint: string };
    expect(body.status).toBe("model_missing");
    expect(body.hint).toContain("ollama pull qwen3:4b");
  });

  it("reports offline when the runtime is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    const response = await healthGet();
    const body = (await response.json()) as { status: string; connected: boolean };
    expect(body.status).toBe("offline");
    expect(body.connected).toBe(false);
  });
});

describe("POST /api/analyze-image", () => {
  function imageRequest(): Request {
    const form = new FormData();
    form.append("image", new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "photo.png", { type: "image/png" }));
    return new Request("http://localhost/api/analyze-image", {
      method: "POST",
      headers: { "x-forwarded-for": uniqueIp() },
      body: form,
    });
  }

  it("returns a capability error when no vision model is configured", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const response = await analyzePost(imageRequest());
    const body = (await response.json()) as { error: { code: string; hint: string } };

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("vision_unsupported");
    expect(body.error.hint).toMatch(/OLLAMA_VISION_MODEL/);
  });

  it("rejects unsupported image types before calling the model", async () => {
    const form = new FormData();
    form.append("image", new File(["hello"], "notes.txt", { type: "text/plain" }));
    const request = new Request("http://localhost/api/analyze-image", {
      method: "POST",
      headers: { "x-forwarded-for": uniqueIp() },
      body: form,
    });
    const response = await analyzePost(request);
    expect(response.status).toBe(415);
  });
});
