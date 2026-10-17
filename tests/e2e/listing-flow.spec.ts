import { expect, test, type Page } from "@playwright/test";

const listing = {
  title: "Handwoven Indigo Cotton Throw",
  shortDescription: "A breathable handwoven throw for calm interiors.",
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

const health = {
  runtime: "ollama",
  status: "connected",
  connected: true,
  model: "qwen3:4b",
  modelInstalled: true,
  latencyMs: 18,
  availableModels: ["qwen3:4b"],
  vision: { configured: false, supported: false, model: null, reason: "Not configured", source: "none" },
  limits: { maxImageSizeMb: 5, timeoutSeconds: 120, rateLimitPerMinute: 12 },
  deploymentMode: "local",
  hostedInference: false,
  message: "Connected.",
  checkedAt: new Date().toISOString(),
};

/** The backend is mocked so the flow does not depend on a downloaded model. */
async function mockBackend(page: Page) {
  await page.route("**/api/health", (route) => route.fulfill({ json: health }));
  await page.route("**/api/generate", (route) =>
    route.fulfill({
      json: { listing, meta: { model: "qwen3:4b", latencyMs: 900, generatedAt: new Date().toISOString() } },
    }),
  );
}

test("generate, edit, copy, export and save a listing", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/create");

  await expect(page.getByRole("button", { name: /generate listing/i })).toBeVisible();
  await page.getByRole("button", { name: /try an example/i }).click();
  await expect(page.getByLabel("Product name")).toHaveValue("Handwoven Cotton Throw Blanket");

  await page.getByRole("button", { name: /generate listing/i }).click();

  const titleInput = page.getByLabel("Product title");
  await expect(titleInput).toHaveValue(listing.title);

  // Edit the title.
  await titleInput.fill("Indigo Handloom Throw — Limited Edition");
  await expect(titleInput).toHaveValue("Indigo Handloom Throw — Limited Edition");

  // Edits survive switching sections.
  await page.getByRole("tab", { name: "Description" }).click();
  await expect(page.getByLabel("Full description")).toHaveValue(listing.fullDescription);
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByLabel("Product title")).toHaveValue("Indigo Handloom Throw — Limited Edition");

  // Export the listing as a file.
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /export txt/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.txt$/);

  // Save locally and confirm it appears in My Listings.
  await page.getByRole("button", { name: /save to my listings/i }).click();
  await expect(page.getByText(/saved in this browser/i)).toBeVisible();
  await page.goto("/listings");
  await expect(page.getByText("Handwoven Cotton Throw Blanket")).toBeVisible();

  // Reopen the saved listing and verify the edited title is preserved.
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByLabel("Product title")).toHaveValue("Indigo Handloom Throw — Limited Edition");
});

test("shows validation errors and keeps input on API failure", async ({ page }) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: health }));
  await page.route("**/api/generate", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: {
          code: "offline",
          message: "Cannot reach the local AI runtime.",
          hint: "Start Ollama (`ollama serve`).",
        },
      },
    }),
  );

  await page.goto("/create");
  await page.getByRole("button", { name: /generate listing/i }).click();
  await expect(page.getByText(/fix the highlighted fields/i)).toBeVisible();

  await page.getByRole("button", { name: /try an example/i }).click();
  await page.getByRole("button", { name: /generate listing/i }).click();
  await expect(page.getByText(/cannot reach the local ai runtime/i)).toBeVisible();
  await expect(page.getByLabel("Product name")).toHaveValue("Handwoven Cotton Throw Blanket");
});

test("mobile navigation opens the drawer", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await mockBackend(page);
  await page.goto("/");
  await page.getByRole("button", { name: /open navigation/i }).click();
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  await page.getByRole("link", { name: "Create Listing" }).click();
  // Dev-mode compilation of /create can take a few seconds on a cold server.
  await expect(page).toHaveURL(/\/create/, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: /generate listing/i })).toBeVisible();
});
