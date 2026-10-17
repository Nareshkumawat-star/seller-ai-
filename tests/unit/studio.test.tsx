import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListingStudio } from "@/components/workspace/listing-studio";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/create",
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const listing = {
  title: "Handwoven Indigo Cotton Throw",
  shortDescription: "A breathable handwoven throw for calm interiors.",
  fullDescription: "Woven on a pit loom with natural indigo cotton. Soft and breathable.",
  bulletPoints: ["Breathable cotton", "Machine washable"],
  seoKeywords: ["handwoven throw", "indigo blanket"],
  tags: ["cotton", "indigo"],
  alternativeTitles: ["Indigo Handloom Throw"],
  metaDescription: "Handwoven indigo cotton throw, breathable and machine washable in cold water.",
  language: "en",
  platform: "etsy",
  warnings: ["Needs confirmation: exact dimensions"],
};

const health = {
  runtime: "ollama",
  status: "connected",
  connected: true,
  model: "qwen3:4b",
  modelInstalled: true,
  latencyMs: 23,
  availableModels: ["qwen3:4b"],
  vision: { configured: false, supported: false, model: null, reason: "Not configured", source: "none" },
  limits: { maxImageSizeMb: 5, timeoutSeconds: 120, rateLimitPerMinute: 12 },
  deploymentMode: "local",
  hostedInference: false,
  message: "Connected.",
  checkedAt: new Date().toISOString(),
};

let generateCalls = 0;

function mockApi(options: { generateError?: boolean } = {}) {
  generateCalls = 0;
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("/api/health")) return Response.json(health);
    if (url.includes("/api/generate")) {
      generateCalls += 1;
      if (options.generateError) {
        return Response.json(
          {
            error: {
              code: "offline",
              message: "Cannot reach the local AI runtime.",
              hint: "Start Ollama (`ollama serve`).",
            },
          },
          { status: 503 },
        );
      }
      return Response.json({ listing, meta: { model: "qwen3:4b", latencyMs: 1200, generatedAt: new Date().toISOString() } });
    }
    return Response.json({ error: { message: "unexpected" } }, { status: 500 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe("ListingStudio", () => {
  it("validates the form before calling the API", async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();
    render(<ListingStudio />);

    await user.click(screen.getByRole("button", { name: /generate listing/i }));

    expect(await screen.findByText(/fix the highlighted fields/i)).toBeInTheDocument();
    expect(screen.getByText(/product name must be at least 2 characters/i)).toBeInTheDocument();
    expect(generateCalls).toBe(0);
    expect(fetchMock).not.toHaveBeenCalledWith("/api/generate", expect.anything());
  });

  it("loads an example, generates, edits the title, and copies the listing", async () => {
    mockApi();
    const user = userEvent.setup();
    // user-event installs its own clipboard stub, so re-stub after setup.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<ListingStudio />);

    await user.click(screen.getByRole("button", { name: /try an example/i }));
    expect(screen.getByLabelText("Product name")).toHaveValue("Handwoven Cotton Throw Blanket");

    await user.click(screen.getByRole("button", { name: /generate listing/i }));
    const titleInput = await screen.findByLabelText("Product title");
    expect(titleInput).toHaveValue(listing.title);
    expect(screen.getByText(/review before publishing/i)).toBeInTheDocument();

    await user.clear(titleInput);
    await user.type(titleInput, "Indigo Handloom Throw — Limited");
    expect(titleInput).toHaveValue("Indigo Handloom Throw — Limited");

    await user.click(screen.getByRole("tab", { name: "Description" }));
    expect(screen.getByLabelText("Full description")).toHaveValue(listing.fullDescription);
    await user.click(screen.getByRole("tab", { name: "Overview" }));
    expect(screen.getByLabelText("Product title")).toHaveValue("Indigo Handloom Throw — Limited");

    await user.click(screen.getByRole("button", { name: /copy all/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain("Indigo Handloom Throw — Limited");
    expect(await screen.findByText(/full listing copied/i)).toBeInTheDocument();
  });

  it("keeps user input when generation fails", async () => {
    mockApi({ generateError: true });
    const user = userEvent.setup();
    render(<ListingStudio />);

    await user.click(screen.getByRole("button", { name: /try an example/i }));
    await user.click(screen.getByRole("button", { name: /generate listing/i }));

    expect(await screen.findByText(/cannot reach the local ai runtime/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Product name")).toHaveValue("Handwoven Cotton Throw Blanket");
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
