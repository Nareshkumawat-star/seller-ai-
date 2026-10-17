# Contributing to Seller AI

Thanks for helping. This project favours a small, honest MVP over feature volume.

## Getting started

```bash
npm install --legacy-peer-deps
cp .env.example .env.local
ollama pull <an installed model tag>   # then set OLLAMA_MODEL in .env.local
npm run dev
```

Before opening a pull request, run:

```bash
npm run verify      # lint + typecheck + unit/API tests + build
npm run test:e2e    # if your change touches the UI flow
```

## Ground rules

1. **No fabricated output.** Never make the UI present sample, cached, or stub content as if a model
   produced it. If inference is unavailable, say so.
2. **No invented product claims.** Prompt changes must keep forbidding invented certifications,
   materials, dimensions, reviews, sales figures, and performance/medical/environmental claims.
3. **Validate everything.** New request shapes need Zod schemas; new model output needs schema
   validation and a recoverable error path. Do not weaken assertions or type checks to make a test pass.
4. **Keep privacy claims true.** If you add a service that receives user data, document it in
   `PRIVACY.md` and the Privacy page in the same pull request.
5. **Server secrets stay server-side.** Configuration is read in route handlers only; capability
   booleans may reach the client, URLs and keys may not.
6. **Accessibility is not optional.** New interactive elements need labels, keyboard support, visible
   focus states, and reduced-motion-safe transitions.

## Adding a marketplace template

Edit `lib/config/marketplaces.ts`: add an id, label, title length guidance, description structure,
keyword guidance, tag cap, and a note telling sellers to verify current policy. Add or update tests in
`tests/unit/prompt-and-markets.test.ts`. Never present limits as permanent or universal.

## Adding tests

- Unit: `tests/unit/*.test.ts` (add `.tsx` for component tests).
- API: `tests/api/*.test.ts` — mock HTTP, never require a downloaded model.
- End-to-end: `tests/e2e/*.spec.ts` — mock the backend with `page.route`.

## Commit style

Conventional, imperative subjects (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`). Explain the *why*
in the body. Keep unrelated changes out of the same commit.

## Reporting bugs

Include: what you did, what happened, the exact error code shown in the UI (`/api/health` output is
especially useful), your OS, Node version, `ollama --version`, and the model tag. Please do not paste
real customer data — use invented sample products.

## Code of conduct

Be kind, be specific, assume good faith. Harassment or gatekeeping gets a PR closed.
