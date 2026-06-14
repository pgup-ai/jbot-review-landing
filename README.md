# jbot-review-landing

Marketing landing page for **J-Bot Review**, an agentic PR reviewer built on
OpenCode that runs inside your own GitHub Actions, on your own keys. A
[PGUP AI](https://github.com/pgup-ai) project.

The public action users install lives at
[`pgup-ai/jbot-review-action`](https://github.com/pgup-ai/jbot-review-action).

## What's here

A single, self-contained static page. No build step, no dependencies.

```
index.html      # the whole page (inline CSS + minimal vanilla JS)
vercel.json     # static config: no build step
assets/
  logo.png      # PGUP AI brand mark (source, 400x400)
  favicon-16.png, favicon-32.png, apple-touch-icon.png, icon-512.png
  og.png        # 1200x630 social share card
```

## Develop

Plain HTML. Open it directly, or serve locally to exercise relative asset paths:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy

Live at **https://www.pgupai.com**, hosted on Vercel (project `pgup-ai-landing`).
Pushes to `main` auto-deploy; `vercel.json` marks it static with no build step.
Social-card tags use absolute `https://www.pgupai.com/...` URLs.

Any static host works too (Netlify, Cloudflare Pages, GitHub Pages, S3): publish
the directory as-is. On a new domain, update the absolute URLs in `index.html`
(`og:image`, `twitter:image`, `og:url`, canonical).

## Design notes

- Dark mode, single locked accent (signal green `#3fe08a`) on cool charcoal.
- Brand mark and OG card use the PGUP AI logo.
- Respects `prefers-reduced-motion`; reveal animations degrade to static.
- Responsive down to ~360px; no horizontal overflow.
