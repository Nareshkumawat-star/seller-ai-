import { afterEach, describe, expect, it, vi } from "vitest";
import { listModels } from "@/lib/ai/ollama-client";

function stubTags(models: Array<{ name?: string; model?: string }>) {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ models }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("listModels", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dedupes repeated tags so names stay unique", async () => {
    stubTags([{ name: "qwen2.5vl:3b" }, { name: "qwen2.5vl:3b" }, { name: "qwen2.5:3b" }]);

    await expect(listModels()).resolves.toEqual(["qwen2.5vl:3b", "qwen2.5:3b"]);
  });

  it("falls back to the model field and drops empty entries", async () => {
    stubTags([{ name: "", model: "gemma2:2b" }, { name: undefined }, { name: "qwen2.5:3b" }]);

    await expect(listModels()).resolves.toEqual(["gemma2:2b", "qwen2.5:3b"]);
  });

  it("throws a bad_response error when the payload has no model list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ nope: true }), { status: 200 })),
    );

    await expect(listModels()).rejects.toMatchObject({ code: "bad_response" });
  });
});
