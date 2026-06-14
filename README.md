# jbot-review-landing

Marketing landing page for **J-Bot Review** — an agentic PR reviewer built on
OpenCode that runs inside your own GitHub Actions, on your own keys. A
[PGUP AI](https://github.com/pgup-ai) project.

The public action users install lives at
[`pgup-ai/jbot-review-action`](https://github.com/pgup-ai/jbot-review-action).

## What's here

A single, self-contained static page. No build step, no dependencies.

```
index.html        # the whole page (inline CSS + minimal vanilla JS)
assets/
  logo.png        # PGUP AI brand mark (source, 400x400)
  favicon-16.png  # generated from logo.png
  favicon-32.png
  apple-touch-icon.png
  icon-512.png
  og.png          # 1200x630 social share card
```

## Develop

It's plain HTML. Open it directly, or serve locally to exercise relative asset
paths:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

Any static host works (Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3).
Just publish the directory as-is.

Before going live, set the absolute deployed URL on the social-card tags in
`index.html` (`og:image` / `twitter:image` currently use the relative
`assets/og.png`, which some scrapers will not resolve), and add an
`og:url` / canonical link for the final domain.

## Design notes

- Dark mode, single locked accent (signal green `#3fe08a`) on cool charcoal.
- Brand mark and OG card use the PGUP AI olive-green logo.
- Respects `prefers-reduced-motion`; reveal animations degrade to static.
- Responsive down to ~360px; no horizontal overflow.
