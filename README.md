# jbot-review-landing

Marketing landing page for **J-Bot Review**, an agentic PR reviewer built on
OpenCode that runs inside your own GitHub Actions, on your own keys. A
[PGUP AI](https://github.com/pgup-ai) project.

The public action users install lives at
[`pgup-ai/jbot-review-action`](https://github.com/pgup-ai/jbot-review-action).

## What's here

A static, multi-page site made from self-contained HTML files. No build step,
no dependencies.

```
index.html      # landing page (inline CSS + minimal vanilla JS)
guides/         # guide pages
compare/        # comparison pages
vercel.json     # static config and clean-URL rewrites
robots.txt      # crawl policy; points at the sitemap
sitemap.xml     # public clean URLs (submit in Google Search Console)
llms.txt        # fact sheet for AI assistants (llmstxt.org convention)
assets/
  logo.png      # J-Bot gradient mark
  favicon-16.png, favicon-32.png, apple-touch-icon.png, icon-512.png
  og*.png       # 1200x630 social share cards
```

## Develop

Plain HTML. Open it directly, or serve locally to exercise relative asset paths:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

The dogfooding numbers in the `#proof` stat band are static text. To refresh
them (needs `gh` authenticated with access to the source repos):

```bash
node scripts/refresh-proof-stats.mjs
```

Round the printed totals **down**, paste them into the band in `index.html`
(the review count also appears in the hero trust strip), update the "As of"
date there, the dogfooding line in `llms.txt`, and `<lastmod>` in
`sitemap.xml`. Per-PR API responses are cached in gitignored
`local/proof-stats-cache.json`, so re-runs only pay for new PRs.
`scripts/` is excluded from the deployed site via `.vercelignore`.

## Deploy

Live at **https://www.pgupai.com**, hosted on Vercel (project `pgup-ai-landing`).
Pushes to `main` auto-deploy; `vercel.json` marks it static with no build step.
Social-card tags use absolute `https://www.pgupai.com/...` URLs. When a social
card changes, publish it under a new dated filename and point its `og:image` and
`twitter:image` URLs at that file so social crawlers do not reuse a cached card.
If X/Twitter has already cached the root URL, use `/x` as a fresh share URL;
it carries the same metadata and redirects humans back to `/`.

Any static host works too (Netlify, Cloudflare Pages, GitHub Pages, S3): publish
the directory as-is. On a new domain, update the absolute URLs in `index.html`
(`og:image`, `twitter:image`, `og:url`, canonical).

## SEO / GEO

- `index.html` carries JSON-LD in `<head>` (Organization, WebSite,
  SoftwareApplication, FAQPage). The FAQPage answers duplicate the visible
  `#faq` section — when editing an answer, change both places.
- Bump `<lastmod>` in `sitemap.xml` when the page meaningfully changes.
- `llms.txt` is the canonical fact sheet AI assistants read; keep its claims
  in sync with the page (providers, pricing, capabilities).

## Design notes

- Dark mode, single locked accent (signal green `#3ECF8E`) on near-black.
- Large logo surfaces use the gradient J-Bot mark. Favicons and touch/PWA icons
  use the flat export for sharper small-size rendering.
- OG cards are separate composed 1200x630 images using the gradient mark.
- Respects `prefers-reduced-motion`; reveal animations degrade to static.
- Responsive down to ~360px; no horizontal overflow.
