# Seller AI — open-source product listing generator

Turn a few product details into a professional listing — SEO title, short and long descriptions,
key features, keywords, tags, alternative titles, and a meta description — using an **open-weight
model you run yourself through Ollama**. No paid proprietary AI API, no accounts, no billing.

Built for the **Hacktoberfest Open-Source AI Challenge — Week 2: Side Hustle**.
Target user: Etsy/eBay sellers, Shopify owners, handmade creators, and local businesses who need
better listings without another subscription.

![Seller AI dashboard placeholder](docs/screenshots/dashboard.png)

> Screenshots are placeholders until real captures are added to `docs/screenshots/`.

---

## 1. Project overview

| | |
| --- | --- |
| Problem | Sellers lose time writing titles, descriptions, tags and metadata — and generic copy converts poorly. |
| Approach | Collect structured product facts, build a strict prompt server-side, generate with a local open-weight model, validate the JSON output with Zod, then let the seller edit, copy, and export. |
| Non-goals | Publishing to marketplaces, autonomous claims, image-only listings, cloud AI fallbacks. |
| Honesty rules | Never invent certifications, reviews, sales figures, materials, or dimensions. If truth is unknown, the field is omitted or flagged in `warnings`. |

## 2. Features

- **Listing workspace** — two-column editor (input left, results right), stacked on mobile.
- **Generation settings** — tone (professional, friendly, luxury, minimal, persuasive), language
  (English, Hindi Devanagari, bilingual), marketplace format, and description length.
- **Real local inference** — server-side calls to Ollama's `/api/chat` with JSON formatting.
- **Strict output validation** — Zod schema, code-fence/chatter tolerance, per-field repair, and
  recoverable errors instead of silent corruption.
- **Language verification** — the requested language is checked against the actual characters
  returned. If Hindi/bilingual was requested but the model wrote Latin script, the server retries
  once with a stricter instruction; if it still fails, the result is flagged in `warnings` and the
  UI shows a “Language mismatch” badge instead of labelling English text as Hindi.
- **Marketplace templates** — generic, Shopify, Etsy, eBay guidance with configurable title/tag limits.
- **Editable results** — every field editable, per-field reset, reset all, regenerate, copy one field,
  copy whole listing, export TXT / CSV / JSON (RFC 4180 escaping).
- **Local history** — save, rename, reopen, delete, export, clear all; versioned localStorage schema
  that ignores corrupted or outdated data.
- **Capability-aware image analysis** — optional upload (JPEG/PNG/WebP, size-limited on client *and*
  server). The app checks Ollama's `/api/show` capability list; if the configured model does not
  support vision it says so instead of pretending.
- **Health & errors** — `GET /api/health` distinguishes Connected / Model missing / Offline;
  the UI maps every failure (timeout, rate limit, malformed output, oversized upload, clipboard
  failure) to a human-readable message with a next step, and never discards user input.
- **Accessibility & UX** — keyboard-operable tabs, visible focus rings, skip link, `aria-live`
  feedback, reduced-motion support, light/dark theme, responsive drawer navigation.

## 3. Screenshots

| Screen | Placeholder |
| --- | --- |
| Dashboard | `docs/screenshots/dashboard.png` |
| Create listing | `docs/screenshots/create.png` |
| Results editor | `docs/screenshots/results.png` |
| AI status | `docs/screenshots/status.png` |

## 4. Architecture

```
Browser (React client components)
  │  POST /api/generate        { form, imageNotes? }
  │  POST /api/analyze-image   multipart/form-data
  │  GET  /api/health
  ▼
Next.js Route Handlers (Node runtime, server-only config)
  ├─ validation/product-input.ts   Zod validation of the request
  ├─ ai/prompt-builder.ts          system + user prompt, injection-resistant
  ├─ ai/ollama-client.ts           /api/tags, /api/show, /api/chat, timeouts, typed errors
  ├─ ai/model-capabilities.ts      vision capability resolution
  └─ ai/output-schema.ts           parse + validate model JSON
  ▼
Ollama (http://localhost:11434 by default) → open-weight model
```

Nothing from the browser talks to Ollama directly, and the inference URL/key never reaches the client.

## 5. Technology stack

Next.js 15 (App Router) · TypeScript (strict) · React 19 · Tailwind CSS v4 · Radix-inspired local UI
primitives · Lucide icons · Zod · Ollama · Vitest + React Testing Library · Playwright · npm.

## 6. Prerequisites

- Node.js 20.9+ (developed on 24.11)
- npm 10+
- [Ollama](https://ollama.com) installed and running (`ollama serve`)
- A model pulled (see below). CPU-only machines work but are slower.

## 7. Local installation

```bash
npm install --legacy-peer-deps   # RTL/Vitest peer ranges on npm 11
cp .env.example .env.local
npm run dev
```

Then open http://localhost:3000.

## 8. Ollama installation

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows: download the installer from ollama.com, then confirm:
ollama --version
```

Keep Ollama bound to loopback (`127.0.0.1:11434`). Never expose port 11434 publicly without TLS,
authentication, and a request-limiting proxy.

## 9. Model download and verification

The documented default is `qwen3:4b`; **verify the tag exists before pulling**, because tags change:

```bash
ollama pull qwen3:4b     # or any other installed Qwen-family instruction model
ollama list              # confirm the exact tag
```

Then set the tag in `.env.local`:

```bash
OLLAMA_MODEL=qwen3:4b
```

Optional vision model (only for image analysis):

```bash
ollama pull qwen2.5vl:3b
```

```bash
OLLAMA_VISION_MODEL=qwen2.5vl:3b
```

Latency depends on model size, quantization, context length, and hardware. A 3B model on a CPU
laptop typically takes 20–90 seconds per listing; larger models need a GPU. This project does not
claim any model runs smoothly on every machine.

## 10. Environment configuration

See [`.env.example`](./.env.example). All variables are server-side:

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Inference host reachable from the server process |
| `OLLAMA_MODEL` | `qwen3:4b` | Text generation model tag |
| `OLLAMA_VISION_MODEL` | *(empty)* | Enables `/api/analyze-image` when set |
| `OLLAMA_TIMEOUT_MS` | `120000` | Per-request timeout (5s–600s) |
| `MAX_IMAGE_SIZE_MB` | `5` | Upload limit (1–20) |
| `OLLAMA_API_KEY` | *(empty)* | Bearer token for an authenticated inference host |
| `RATE_LIMIT_PER_MINUTE` | `12` | Per-IP generation limit on this instance |

## 11. Development commands

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # run the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## 12. Test commands

```bash
npm run test               # Vitest unit + API + component tests (Ollama mocked)
npm run test:watch         # watch mode
npm run test:e2e:install   # one-time: download the Chromium build
npm run test:e2e           # Playwright flows (desktop + mobile viewports)
npm run verify             # lint + typecheck + unit tests + build
```

The normal suite never downloads a model and never calls a live Ollama instance — HTTP is mocked.

## 13. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Badge shows **AI offline** | Ollama not running, or the URL is wrong *for the server process* | `curl http://localhost:11434/api/tags` from the same machine that runs Next.js |
| Badge shows **Model missing** | Tag not installed | `ollama pull <exact tag>`; check `ollama list` |
| `504` / timeout | Slow CPU inference or a large model | Raise `OLLAMA_TIMEOUT_MS`, use a smaller quantized model, shorten the description |
| "The model did not return usable JSON" | Small models sometimes break JSON | Retry; switch to a stronger instruction model |
| Image analysis refused (`vision_unsupported`) | No/incompatible vision model | Set `OLLAMA_VISION_MODEL` to an installed vision tag, or continue with text only |
| `429` rate limited | Too many generations from one IP | Wait a minute or raise `RATE_LIMIT_PER_MINUTE` |
| Hosted app says offline | A hosted server cannot reach `localhost` on your laptop | Run locally, or configure a reachable secured Ollama host |

## 14. Privacy design

Local-first by default: product text goes to the inference host you configure, results are validated
server-side, and saved listings stay in your browser's localStorage. There are no analytics, no
telemetry, and no silent cloud fallback. See [`PRIVACY.md`](./PRIVACY.md) for the full data flow,
the limits of these claims, and what a hosted deployment changes.

## 15. Deployment options

**Mode A — local application (recommended for personal use).** Run Next.js and Ollama on the same
machine; inference never leaves it. Offline check: disconnect the network, generate a listing — it
still works because only the model needs to be on disk.

**Mode B — hosted frontend with a separate inference server.** Deploy this repo to a host such as
Render using the included [`render.yaml`](./render.yaml), then point `OLLAMA_BASE_URL` at a secured
Ollama host. Key constraints, stated plainly:

- Render's free web instances are CPU-only and cannot host multi-gigabyte models comfortably.
- A hosted Next.js app **cannot** reach `localhost:11434` on your laptop.
- Never expose port 11434 to the public internet without authentication, TLS, and rate limiting.
- Serverless platforms may time out long inference requests; this app sets `maxDuration = 120`.

### Deploying to Render

1. Push this repository to GitHub (default branch `main`, or edit `branch:` in `render.yaml`).
2. In Render: **New → Blueprint**, select the repo, apply `render.yaml`.
3. Set `OLLAMA_BASE_URL` to your inference host (and `OLLAMA_API_KEY` if it needs a token).
4. Deploy. Health check path is `/api/health`.
   Until a model host is reachable, the UI reports **AI offline** and refuses to invent output.

## 16. Model licensing notes

The application code is MIT (see [`LICENSE`](./LICENSE)). Model weights carry their **own** licences,
and those terms differ between models and versions — check the model card before commercial use.
Nothing here grants rights to model weights. Document the licence of whichever tag you deploy.

### Verified against a real model (not mocked)

On Ollama 0.40.0, CPU-only Windows, with `qwen2.5:3b` and `qwen2.5vl:3b` installed:

| Check | Result |
| --- | --- |
| `GET /api/health` (production build) | Connected, model installed, vision resolved from `/api/show` capabilities |
| `POST /api/generate` (English, Etsy, short) | Complete validated listing, ~69 s |
| `POST /api/generate` (Hindi, Shopify) | Devanagari output on the first attempt, `languageVerified: true`, ~101 s |
| `POST /api/generate` before the language fix | Model echoed `language: "hi"` while writing English — mismatch now detected, retried, and flagged |
| `POST /api/analyze-image` | Real observations from `qwen2.5vl:3b` |

Timings depend on the machine; they are recorded here because "works locally" should mean something
measurable.

## 17. Current limitations

- No marketplace publishing integration (by design — generate, review, copy).
- No accounts, cloud sync, or MongoDB persistence; history is per browser profile.
- Section-level regeneration is not implemented; you can regenerate the whole listing or reset
  individual fields to the generated version.
- Rate limiting is in-memory per instance; multi-instance deployments need a shared store.
- Vision analysis requires a separately configured vision model and is deliberately conservative.
- Structured output relies on Ollama's JSON formatting plus Zod validation, not on grammar-constrained
  decoding, so very small models can still produce unusable JSON (handled as a recoverable error).
- Language quality depends on the model. A 3B CPU model needed a stricter prompt to produce Devanagari
  and can still drift; the app detects that case and says so rather than mislabelling the output.
- The default documented tag `qwen3:4b` was not installed on the development machine — pull it, or set
  `OLLAMA_MODEL` to a tag you have (`qwen2.5:3b` is what the numbers above were produced with).
- Language verification checks script, not fluency or translation quality.

## 18. Future roadmap

- Section-level regeneration and diffable revisions.
- Optional server-side listing storage with authentication and access controls.
- Shared marketplace-rule presets (community-contributed).
- Optional response streaming with progress feedback.
- Bulk CSV import for sellers with large catalogues.

## 19. Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Contributions that fabricate product claims, hide
inference failures, or weaken validation will not be merged.

## 20. License

MIT — see [`LICENSE`](./LICENSE). Third-party model licences are separate.
