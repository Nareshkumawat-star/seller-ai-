# Privacy & data flow — Seller AI

Seller AI is designed around **local-first inference**. This document describes exactly where data
goes, what is stored, and what the design does *not* guarantee. It is written to match the code, not
to advertise.

## 1. What leaves your browser

| Data | Destination | Notes |
| --- | --- | --- |
| Product form fields | This app's own `/api/generate` route on the server | Over the network if the app is hosted |
| Optional `imageNotes` (editable visual notes) | Same route, as part of the prompt | Only what you can see and edit in the form |
| Attached product image | `/api/analyze-image` **only when you press "Analyze image"** | Multipart upload, validated for type and size |
| Theme preference and saved listings | `localStorage` in your browser | Never uploaded |

The browser never talks to Ollama directly. The inference URL and any `OLLAMA_API_KEY` exist only in
the server environment.

## 2. What the server does with it

1. Validates the request body with Zod (size- and shape-limited).
2. Builds a prompt server-side. User text is placed inside a `<product_data>` block and the system
   prompt instructs the model to treat it as data, not instructions.
3. Sends the prompt to the Ollama endpoint in `OLLAMA_BASE_URL` using `/api/chat` with `format: "json"`.
4. Parses and validates the response against a Zod schema, aligning language/platform to your
   selection and recording anything the model could not support in `warnings`.
5. Returns JSON to the browser.

Server-side logging is deliberately minimal: error *codes* and route names only. Full product
descriptions, image bytes, prompts, and responses are **not** logged.

## 3. What is stored

- **Browser localStorage** (`seller-ai:listings:v1`) — listings you explicitly save. Versioned;
  invalid or outdated records are ignored rather than crashing the UI.
- **No server database.** No accounts, no sessions, no cross-device history.
- **Uploaded images** are held in memory for preview and are never written to disk by this app.

## 4. What is *not* collected

No analytics, no telemetry, no tracking pixels, no third-party AI calls, no advertising identifiers.
The app sends no product data anywhere except the inference host you configure.

## 5. Limits of these claims — read this

- Local inference does not make everything private. Your browser, extensions, OS, and any reverse
  proxy in front of the app can still observe traffic.
- **A hosted deployment is not local.** If you deploy this app on Render/Vercel/etc., the server sends
  your input to *its* configured inference host. `localhost` there means the server, not your laptop.
- Hosting providers keep access logs. They will typically record IP addresses, timestamps, paths, and
  status codes — not request bodies from this app, but that depends on the host's configuration.
- Model providers are irrelevant here because no model provider API is called — but the machine
  running Ollama can see the prompts you send it.
- Inference needs no internet connection **after** the app, Ollama, and the model are installed.
  Initial setup, dependency updates, and hosting do need network access.
- Local inference still costs money: hardware, electricity, cooling, and your maintenance time.
- Browser storage is not a secure vault. Anyone using the same browser profile can read saved
  listings — avoid saving confidential supplier terms or unpublished pricing.

## 6. Images and vision

- Accepted types: JPEG, PNG, WebP. Size limit: `MAX_IMAGE_SIZE_MB` (default 5 MB), enforced on both
  client and server.
- Uploaded files are never executed and never persisted.
- Image analysis runs **only** if `OLLAMA_VISION_MODEL` is configured *and* the runtime reports vision
  support for that model via `/api/show`. Otherwise the API returns `vision_unsupported` and the UI
  says the image is attached for reference but not being analysed.
- Visual observations are treated as uncertain cues. The prompt forbids deriving materials,
  dimensions, origin, authenticity, or certifications from a photo, and the UI repeats that
  disclaimer next to the notes.
- When analysis is unavailable, enter the details manually — text generation is unaffected.

## 7. Generated content

Model output is untrusted text. It is rendered as plain text through React (never `innerHTML`), is
schema-validated before display, and is prompted to avoid invented certifications, safety claims,
reviews, sales figures, medical/environmental performance claims, and endorsements. It can still be
wrong, incomplete, or off-tone — **you are responsible for verifying every claim before publishing.**

## 8. Your controls

- Clear saved listings in **Settings → Local data** or **My Listings → Clear all**.
- Remove an attached image at any time (it is discarded immediately).
- Fill the "words or claims to avoid" field to steer output.
- Change or self-host the model; change the inference host at any time via environment variables.

## 9. Third parties

None are integrated. There is no cloud AI fallback, no CDN-hosted model, and no remote font or script
service: fonts use the system stack and all assets are served by this app.

## 10. Licensing

Application code: MIT. Model weights: covered by their own licences, which vary by model and version.
Review the model card of the tag you deploy, especially for commercial use.
