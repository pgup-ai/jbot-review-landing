# Grok Build code review in GitHub Actions

Updated July 10, 2026 · applies to pgup-ai/jbot-review-action v0

**The Grok account you already sign into can review your pull requests.** J-Bot Review — an open-source (MIT) GitHub Action — drives Grok Build headlessly inside your own CI: `grok login --device-auth` once, one `GROK_AUTH_JSON` secret, one workflow file. Account auth is the preferred credential, an xAI API key the explicit fallback, and J-Bot adds **$0** on top.

> **The seventh seat**
>
> Grok Build joins **Codex (ChatGPT Plus/Pro), Cursor, Devin, Cline, Kilo, Command Code, and Qoder** in the same one-secret pattern — the [CLI subscription guide](https://www.pgupai.com/guides/cli-subscription-code-review) lines all eight up in one table.

## Setup in three steps

1. **Copy the credential.** Run `grok login --device-auth` locally, then save the whole contents of `~/.grok/auth.json` as the repository secret `GROK_AUTH_JSON` (_Settings → Secrets and variables → Actions_). The secret is the entire file — the same whole-file pattern as Codex, Cline, and Kilo.
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`.
3. **Open a pull request.** Grok Build reads the full base…head diff and posts diff-anchored review comments with a verdict; blocking findings are adversarially verified first, nits demoted.

`.github/workflows/jbot-review.yml`

```yaml
name: J-Bot Code Review
on:
  pull_request: { types: [opened, reopened, ready_for_review, synchronize] }

concurrency:
  group: jbot-review-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write
  issues: write        # PR reactions use the issues API
  checks: read

jobs:
  review:
    if: github.event.pull_request.draft == false
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with: { fetch-depth: 0 }
      - uses: pgup-ai/jbot-review-action@v0
        with:
          provider: grok               # account auth; xai-api-key is the fallback
          grok-auth: ${{ secrets.GROK_AUTH_JSON }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Account auth first, API key second

- `provider: grok` is deliberately separate from `provider: xai`. Existing `xai` configurations keep calling the xAI API directly with `XAI_API_KEY` — nothing about them changes.
- The `xai-api-key` input is used only when `grok-auth` is _absent_. An expired login therefore fails loudly; it cannot silently switch the run onto per-token API billing.
- Set both credentials only if you want the API key as a deliberate fallback. One is enough to review.

## Cost, privacy & what the session can't do

- **$0 added by J-Bot** — MIT-licensed action, no reviewer SaaS, no per-seat bill. Reviews run against your Grok account (or your xAI key), plus normal CI minutes.
- **No new data recipient:** the diff goes to xAI under your own account — the same vendor your Grok chats already reach. No reviewer service sits in between.
- **Headless and read-only:** edits, shell, MCP, web access, memory, and subagents are all disabled for the review session.
- **Hermetic workspace:** Grok Build receives the review prompt in an empty read-only temporary directory, so repository Grok config, plugins, and hooks never execute — a PR can't smuggle instructions to the reviewer through config files.
- **Full-diff coverage, no checkout access:** the diff is embedded into the prompt, up to 512 KiB per shard. If a diff can't be carried whole, the main review refuses rather than posting partial coverage (only auxiliary sessions fail open).
- GitHub strips secrets from fork PRs on `pull_request` events, so outside contributors can't exfiltrate your login.

## FAQ

### Can J-Bot Review use my Grok subscription to review pull requests?

Yes — through Grok Build account auth. Run `grok login --device-auth` locally and save the whole contents of `~/.grok/auth.json` as the repository secret `GROK_AUTH_JSON`; reviews then run on your Grok account. If you'd rather pay per token, an xAI API key (`xai-api-key`) works as the fallback credential.

### What is the difference between provider: grok and provider: xai?

`provider: grok` drives the Grok Build CLI on your account auth; `provider: xai` keeps calling the xAI API directly with `XAI_API_KEY`, unchanged. Under `provider: grok` the API key is used only when account auth is absent — so an expired login fails loudly instead of silently switching the run to per-token API billing.

### How locked down is the Grok Build review session?

It runs headless with edits, shell, MCP, web access, memory, and subagents disabled, in an empty read-only temporary workspace — repository Grok config, plugins, and hooks never execute. The diff is embedded in the review prompt (up to 512 KiB per shard); if a diff can't be carried whole, the main review refuses rather than posting partial coverage.

## Related

- **Guide** — [Review PRs with a CLI subscription](https://www.pgupai.com/guides/cli-subscription-code-review): All seven seats side by side — providers, secrets, and credential sources.
- **Guide** — [Codex code review in GitHub Actions](https://www.pgupai.com/guides/codex-code-review-github-actions): Your ChatGPT Plus/Pro seat, step by step.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/grok-code-review-github-actions](https://www.pgupai.com/guides/grok-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
