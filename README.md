# jbot-review-landing

Marketing landing page for **J-Bot Review**, an agentic PR reviewer built on
OpenCode that runs inside your own GitHub Actions, on your own keys. A
[PGUP AI](https://github.com/pgup-ai) project.

The public action users install lives at
[`pgup-ai/jbot-review-action`](https://github.com/pgup-ai/jbot-review-action).

## What's here

A static, multi-page site made from self-contained HTML files. No bundler, no
npm dependencies, and nothing for Vercel to build. The one generated artifact is
`md/**` (plus `lib/routes.mjs`), produced locally by `scripts/build-markdown.mjs`
and committed.

```
index.html      # landing page (inline CSS + minimal vanilla JS)
about.html      # about / contact / privacy: the pages that establish who
contact.html    #   runs this and what happens to your data
privacy.html
404.html        # served with a real 404 status for unmatched paths
guides/         # guide pages
compare/        # comparison pages
middleware.ts   # Accept-header content negotiation (see below)
lib/            # negotiate.mjs, markdown.mjs, routes.mjs (generated)
md/             # generated Markdown twin of every page (do not hand-edit)
test/           # node:test suites; run with `node --test`
vercel.json     # static config, clean URLs, middleware entrypoint, Vary headers
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

Run the test suite before pushing. It has no dependencies — the whole thing is
Node's built-in runner:

```bash
node --test
```

**After editing any page, regenerate its Markdown twin**, or the tests fail:

```bash
node scripts/build-markdown.mjs
```

That rewrites `md/**` and the generated `lib/routes.mjs`. Both are committed.

The dogfooding numbers in the `#proof` stat band are static text with two
sources. All three band totals — review runs, diff lines across runs, and
tokens — are read off the engines' run telemetry and pasted in by hand.
The narrower GitHub-derived baseline quoted in `llms.txt` and `about.html`
comes from the GitHub API. It needs `gh` authenticated with access to the
source repos, which are private, so list them in gitignored
`local/proof-stats-sources.json` as `[{"repo": "owner/name", "workflowId": 123}]`:

```bash
node scripts/refresh-proof-stats.mjs
```

Round every total **down**, paste the telemetry totals into the band in
`index.html` (the run count also appears in the hero trust strip), then
update the dogfooding line in `llms.txt`, the snapshot paragraph in
`about.html`, and `<lastmod>` in `sitemap.xml`. Leave the
band's "Since June 2026" alone — it is the date reviews started, not the
date they were counted; `llms.txt` carries the measurement date. Per-PR API responses are cached in gitignored
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

## Markdown content negotiation

Every page serves Markdown as well as HTML from **the same URL**, following the
[acceptmarkdown.com](https://acceptmarkdown.com) convention, so agents can read
the content without parsing the DOM:

```bash
curl -sI -H "Accept: text/markdown" https://www.pgupai.com/guides
```

How it fits together:

- `middleware.ts` is Vercel [Routing Middleware](https://vercel.com/docs/routing-middleware),
  found by root auto-detection — deliberately *not* via `proxy.entrypoint`, which would
  pin it to the non-bundling Node runtime. It runs *before* the
  filesystem, which is the only hook that can change the representation of a
  path that already exists — `vercel.json` rewrites run *after* the filesystem,
  so they can never intercept `/guides/foo`.
- `lib/negotiate.mjs` ranks the `Accept` header properly: q-values, specificity
  tie-breaks, and `q=0` meaning *never send me this*. Substring-matching
  `text/markdown` gets this wrong on real browser headers.
- Requests preferring HTML return `undefined` from the middleware, so the static
  file is served exactly as before. `Vary: Accept, Accept-Encoding` is attached
  to those responses by the `headers` rules in `vercel.json`, not by the
  middleware — a CDN without it can hand an agent the cached HTML variant.
- A client that accepts neither HTML nor Markdown gets `406` with a body listing
  what the resource can produce.
- The middleware is wrapped in `try/catch` and falls through to normal static
  serving on any error. A bug there must never take the site down.

`md/**` holds the generated twins; the middleware fetches them and serves them
under the canonical URL. They carry `X-Robots-Tag: noindex` so they do not
compete with the HTML pages in search.

## 404s

Unmatched paths return a real HTTP 404 — never a 200 with an app shell. Browsers
get `404.html`; a client negotiating Markdown gets a short Markdown body with
links back to `/guides`, `llms.txt`, and the sitemap so an agent can recover.

## Website analytics

PostHog US project **616784** collects page views, page exits, and selected CTA clicks with
cookieless analytics enabled by default. Enable **Cookieless server hash mode**
in PostHog project settings before deploying this configuration.
`assets/analytics.js` and `assets/analytics.css` provide the shared loader and
preferences UI. Only HTTPS production hosts (`pgupai.com` and
`www.pgupai.com`) send events; local and Vercel preview hosts never load the SDK.
The public `phc_` ingestion token is intentionally in the client script. Never
put personal API keys, MCP OAuth credentials, or account secrets there.

The footer's **Analytics preferences** control allows opting out or back in.
Existing declines remain respected. PostHog uses `cookieless_mode: always`; only the preference is stored locally,
not an analytics identifier. Daily hashes cannot measure cross-day retention.
Global Privacy Control and Do Not Track suppress collection. Replay, autocapture, surveys,
heatmaps, and person profiles are disabled. Only allowlisted campaign parameters
are retained in analytics URLs; page views are captured once per full page load,
not on hash navigation. The explicit `cta_clicked` event reports `cta_id` values
`setup`, `contact`, `github`, and `marketplace`. All events carry `site_id: pgup`.

Use [Web Analytics](https://us.posthog.com/project/616784/web) for traffic and
[Activity](https://us.posthog.com/project/616784/activity/explore) to inspect events.
Dashboard visitors are estimates based on daily hashes; they are not unique
people across multiple days. Opt-outs, privacy signals, and blocked requests
remain uncounted. Geographic enrichment may be unavailable for cookieless events.
Analytics are separate from the GitHub Action; no review telemetry is sent by this integration. Update `/privacy` alongside collection changes.

## SEO / GEO

- `index.html` carries JSON-LD in `<head>` (Organization, WebSite,
  SoftwareApplication, FAQPage). The FAQPage answers duplicate the visible
  `#faq` section — when editing an answer, change both places.
- Bump `<lastmod>` in `sitemap.xml` when the page meaningfully changes.
- `llms.txt` is the canonical fact sheet AI assistants read; keep its claims
  in sync with the page (providers, pricing, capabilities). Its
  **"When to use this"** section is the agent-instruction surface — it names the
  jobs the project fits, the ones it does not, and how an agent should act on a
  user's behalf. Keep it concrete; generic marketing copy does not read as
  guidance.
- `/about`, `/contact`, and `/privacy` are the trust-anchor pages AI agents check
  before recommending a project. Keep them factual — in particular `/contact`
  must only list channels that actually work, and `/privacy` must match what the
  site actually loads.

## Design notes

- Dark mode, single locked accent (signal green `#3ECF8E`) on near-black.
- Large logo surfaces use the gradient J-Bot mark. Favicons and touch/PWA icons
  use the flat export for sharper small-size rendering.
- OG cards are separate composed 1200x630 images using the gradient mark.
- Respects `prefers-reduced-motion`; reveal animations degrade to static.
- Responsive down to ~360px; no horizontal overflow.
