# Repository guidance

## Scope and architecture

- This is a static, multi-page marketing site built from standalone HTML files. Read
  `README.md` for the repository layout and local preview command.
- Preserve the no-build, no-dependency architecture. Do not add a framework, package
  manager, or bundler. There are no npm dependencies and nothing for Vercel to build.
- One deliberate exception exists: `middleware.ts` is Vercel Routing Middleware, picked up
  by Vercel's root auto-detection. Do not add a `proxy` entrypoint to `vercel.json`: that
  pins it to the Node runtime, which does not bundle its ESM imports and 500s on every
  request. It exists because Accept-header content
  negotiation is impossible in static config — `vercel.json` rewrites run *after* the
  filesystem, so nothing declarative can intercept a path that already resolves to a
  file. Keep it dependency-free, keep its `try/catch` fail-open behavior, and do not
  grow it into an application layer.
- Follow nearby page structure, design tokens, accessibility behavior, and copy style.
  Some shell and style duplication is intentional; inspect sibling pages before
  deciding whether a change is page-specific or site-wide.

## Product claims

- Treat the current `main` branch of `pgup-ai/jbot-review` as the runtime source of
  truth and `pgup-ai/jbot-review-action` as the public Action interface.
- Verify provider support, model availability, credential locations, commands,
  topology, privacy/security boundaries, pricing, and beta/readiness claims against
  those sources before publishing. Do not infer a J-Bot guarantee from protocol or
  library support alone.
- Keep qualifications visible. In particular, distinguish the standard Action path
  from optional services such as the ACP gateway, and distinguish local agents from
  local models or offline execution.

## Generated files

- `md/**` and `lib/routes.mjs` are generated. Never hand-edit them. After changing any
  page's `<main>`, run `node scripts/build-markdown.mjs`; `node --test` fails on a
  stale twin.
- `lib/markdown.mjs` throws on an element it does not handle rather than dropping it
  silently. If a page introduces a new construct, teach the converter about it and add
  a case to `test/markdown.test.mjs` — do not work around it by changing the page.

## Keep discovery surfaces synchronized

- When a visible FAQ answer changes, update the matching `FAQPage` JSON-LD answer.
- For a guide title or summary change, check the guide metadata and structured data,
  its `/guides` card and `ItemList` entry, `llms.txt`, and `sitemap.xml`.
- Keep Open Graph and Twitter metadata aligned with the page, and use canonical clean
  URLs defined by `vercel.json`.
- Treat `llms.txt` as a concise fact sheet, not a second marketing page. Add only
  durable, source-backed claims. Its "When to use this" section is the agent-instruction
  surface: keep the jobs concrete and keep the "when not to use it" list honest.
- `/about`, `/contact`, and `/privacy` are trust-anchor pages that AI agents read to
  verify the project. `/contact` must list only channels that actually work — issue
  tracking is disabled across the `pgup-ai` org, so do not link an issue tracker.
  `/privacy` must keep matching what the site actually loads; adding any analytics or
  storage means updating that page in the same change.

## Visual assets

- Social cards are 1200×630 PNGs. Publish revised cards under a new dated or otherwise
  cache-busting filename, then update every metadata and thumbnail reference.
- Reuse the existing brand palette, typography, components, and responsive patterns.
  Preserve reduced-motion behavior and avoid duplicate or unused assets.

## Validation

- Run `node --test` first. It covers Accept negotiation against the published
  acceptmarkdown.com vectors, the HTML-to-Markdown converter, middleware behavior,
  twin freshness, sitemap/route-table agreement, JSON-LD, and the deploy config.
- Run `node local/validate-breadcrumbs.mjs .` after changing page structure or JSON-LD.
- Parse every changed JSON-LD block, verify referenced local assets exist, and run
  `git diff --check`.
- For visual changes, serve the repository locally and inspect relevant desktop and
  mobile layouts. There is no build step or dependency installation to run.
- After deploying, re-check the public contract:
  `curl -sI -H "Accept: text/markdown" https://www.pgupai.com/` must return
  `text/markdown` with `Vary: Accept`, and
  `curl -s -o /dev/null -w "%{http_code}" https://www.pgupai.com/no-such-path`
  must print `404`.
- Preserve unrelated tracked and untracked worktree content.
