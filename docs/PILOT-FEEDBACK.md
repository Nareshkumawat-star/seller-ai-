# Real-user pilot — plan and feedback template

Goal: find out whether Seller AI actually saves a small seller time, and what it gets wrong.
Target: one or two sellers with a real product to list. No incentives, no obligation to be positive.

## Pilot script (about 20 minutes)

1. **Set up** — Run the app locally with the seller's own model tag, or hand them the hosted URL plus
   clear instructions about which inference host it uses. Be explicit that a hosted URL sends their
   product text to that server, not to their laptop.
2. **Their own product** — Ask them to pick a product they genuinely need to list. Do not use our
   example data. Ask them to enter details the way they would normally write them.
3. **Generate** — Ask them to generate a listing without help. Note where they hesitate.
4. **Review accuracy** — Go through the output line by line. Ask them to mark anything that is
   inaccurate, unsupported, or would get them in trouble with a marketplace.
5. **Edit** — Ask them to fix the problems using only the app's editing tools. Watch which fixes are
   easy and which are painful.
6. **Use it for real** — Have them copy the listing into their actual listing workflow (Etsy/Shopify/
   eBay draft). Observe, don't assist.
7. **Interview** — Use the questions below.

## Feedback capture (fill in with the seller's own words)

```yaml
participant:
  role:            # e.g. Etsy seller, 2 years, jewellery
  product_tested:
  model_used:      # exact tag, e.g. qwen2.5:3b
  hardware:        # CPU/GPU, rough RAM
date:
generation:
  time_to_first_listing_seconds:
  retried:         # yes/no, why
  had_to_fix_json_error: yes/no
quality:
  title_used_as_is: yes/no
  inaccurate_claims_found:   # quote them
  missing_details:           # what was missing
  tone_match:                # too salesy / fine / flat
time_saved_estimate:         # seller's own estimate, in minutes
what_they_liked:
what_blocked_them:
would_they_use_again:        # yes/no/maybe + why
quotes:                      # verbatim, with permission to publish
```

## Rules for reporting results

- Only record what actually happened in a real session. Never invent a quote, a statistic, a
  time-saving figure, or a participant.
- Report negative findings verbatim; they are the most useful output of a pilot.
- Ask permission before publishing any quote, and say where it will appear (DEV.to article).
- Do not claim marketplaces endorsed anything — sellers review and publish in their own accounts.

## Results log

| Date | Participant | Model | Outcome | Notes |
| --- | --- | --- | --- | --- |
| — | *no pilots run yet* | — | — | The template above is ready; results will be recorded here after a real session. |
