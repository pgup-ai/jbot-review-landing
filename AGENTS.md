# Repository guidance

## Scope and architecture

- This is a static, multi-page marketing site built from standalone HTML files. Read
  `README.md` for the repository layout and local preview command.
- Preserve the no-build, no-dependency architecture. Do not add a framework, package
  manager, shared runtime, or build step unless the task explicitly requires one.
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

## Keep discovery surfaces synchronized

- When a visible FAQ answer changes, update the matching `FAQPage` JSON-LD answer.
- For a guide title or summary change, check the guide metadata and structured data,
  its `/guides` card and `ItemList` entry, `llms.txt`, and `sitemap.xml`.
- Keep Open Graph and Twitter metadata aligned with the page, and use canonical clean
  URLs defined by `vercel.json`.
- Treat `llms.txt` as a concise fact sheet, not a second marketing page. Add only
  durable, source-backed claims.

## Visual assets

- Social cards are 1200×630 PNGs. Publish revised cards under a new dated or otherwise
  cache-busting filename, then update every metadata and thumbnail reference.
- Reuse the existing brand palette, typography, components, and responsive patterns.
  Preserve reduced-motion behavior and avoid duplicate or unused assets.

## Validation

- Run `node local/validate-breadcrumbs.mjs .` after changing page structure or JSON-LD.
- Parse every changed JSON-LD block, verify referenced local assets exist, and run
  `git diff --check`.
- For visual changes, serve the repository locally and inspect relevant desktop and
  mobile layouts. There is no build step or dependency installation to run.
- Preserve unrelated tracked and untracked worktree content.
