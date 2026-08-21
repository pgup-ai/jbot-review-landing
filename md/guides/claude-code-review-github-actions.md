# Claude code review in GitHub Actions

Updated July 4, 2026 · applies to pgup-ai/jbot-review-action v0

To get **Claude reviewing your pull requests inside your own GitHub Actions**, add one workflow file and one repo secret (`ANTHROPIC_API_KEY`). J-Bot Review — an open-source (MIT) action — drives Claude on **your key and your runner**, and posts diff-anchored findings that a second session verifies before they land on the PR. No reviewer SaaS, **$0 per seat** added.

> **Using a Claude Pro/Max subscription?**
>
> A Claude _subscription seat_ is not a supported CI credential today — Claude runs on your Anthropic API key, per-token. If you want to reuse a subscription you already pay for, **Codex (ChatGPT Plus/Pro), Cursor, Devin, Cline, Kilo, Command Code, Grok Build, and Qoder** seats are supported: [CLI subscription code review →](https://www.pgupai.com/guides/cli-subscription-code-review)

## Setup in three steps

1. **Add the secret.** Create an API key in the [Anthropic Console](https://console.anthropic.com/) and save it as the repository secret `ANTHROPIC_API_KEY` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`.
3. **Open a pull request.** Claude reviews the full base…head diff on your runner and posts review comments with a verdict; blocking findings are adversarially verified first, nits demoted.

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
          provider: anthropic
          # model: <id from models.dev>   # optional — provider default when unset
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## What Claude reviews, exactly

- **The full diff** — base…head, not just the latest push — with read-only access to your checkout for context.
- **Your house rules:** the reviewer discovers `AGENTS.md`, `REVIEW.md`, `.coderabbit.yaml`, `greptile.json`, and Cursor rules, and reviews against them.
- **Current docs:** when a PR touches an external API or SDK, Context7 checks the change against live documentation.
- **Verified output:** every blocking finding is re-checked in a dedicated session before posting — refuted findings are dropped, uncertain ones demoted to advisory.

## Cost & privacy

- **You pay Anthropic only.** J-Bot adds no per-seat or per-review charge. Defaults keep spend low: one review pass, doc-only PRs skipped without a model call, prompt caching on.
- **Trim further** with `min-severity`, or route verification to a cheaper backend via `aux-provider` / `aux-model` — including free OpenCode Zen models.
- **Data path:** only the diff and the context the agent requests reach the Anthropic API, under your own account and its retention terms. No third-party reviewer sees your code.
- **Fork PRs:** on `pull_request` events GitHub strips secrets from fork PRs, so outside contributors can't spend your key.

## FAQ

### Can I use my Claude Pro or Max subscription instead of an API key?

Not today — a Claude Pro/Max subscription seat is not a supported CI credential in J-Bot Review, so Claude runs on your own Anthropic API key (pay-per-token) or through an OpenCode gateway. If you want to reuse a subscription you already pay for, [Codex (ChatGPT Plus/Pro), Cursor, Devin, Cline, Kilo, Command Code, Grok Build, and Qoder seats are supported](https://www.pgupai.com/guides/cli-subscription-code-review).

### Which Claude models can review my PRs?

Any Claude model your Anthropic account can call. Leave `model` unset for the provider default, or pin one with the `model` input using an id from the [models.dev](https://models.dev/) catalog. You can also route Claude through OpenCode gateways instead of the direct Anthropic provider.

### Does Anthropic see my whole repository?

No. The action reads your checkout read-only on your own runner. What reaches the API is the pull-request diff and the context the reviewing agent requests, sent under your own Anthropic account and its data-retention terms. No third-party reviewer service is involved.

### What does Claude code review cost per PR?

Whatever your Anthropic API usage costs — J-Bot Review itself adds no charge and no per-seat fee. Defaults keep spend low: one review pass, verification on, doc-only PRs skipped without a model call. You can trim further with `min-severity` or route verification to a cheaper aux model.

## Related

- **Guide** — [Review PRs with a CLI subscription](https://www.pgupai.com/guides/cli-subscription-code-review): Codex, Cursor, Devin, Cline, Kilo, Command Code, Grok Build, Qoder — reuse the seat you pay for.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.
- **Guide** — [Codex code review in GitHub Actions](https://www.pgupai.com/guides/codex-code-review-github-actions): Prefer the seat-reuse path? Your ChatGPT Plus/Pro subscription works today.

---

_Markdown representation of [https://www.pgupai.com/guides/claude-code-review-github-actions](https://www.pgupai.com/guides/claude-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
