# Codex code review in GitHub Actions

Updated July 4, 2026 · applies to pgup-ai/jbot-review-action v0

**The ChatGPT Plus or Pro seat you already pay for can review your pull requests.** J-Bot Review — an open-source (MIT) GitHub Action — drives the Codex CLI inside your own GitHub Actions: run `codex login` once locally, save the credential as one repo secret, commit one workflow file. Every PR gets diff-anchored, verified findings, with **no API key, no per-token bill, and $0 added** by J-Bot.

> **This is the seat-reuse path**
>
> Hosted AI reviewers charge ~$40 per seat per month and can't touch your ChatGPT subscription. This setup reuses it. Same idea for **Cursor, Devin, Cline, Kilo, Command Code, Grok Build, and Qoder** seats: [CLI subscription code review →](https://www.pgupai.com/guides/cli-subscription-code-review)

## Setup in three steps

1. **Copy the credential.** Run `codex login` locally (it signs into your ChatGPT Plus/Pro account), then save the contents of `~/.codex/auth.json` as the repository secret `CODEX_AUTH_JSON` (_Settings → Secrets and variables → Actions_). The secret is the whole file, not a key inside it.
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`.
3. **Open a pull request.** Codex reviews the full base…head diff read-only on your runner and posts review comments with a verdict; blocking findings are adversarially verified first, nits demoted.

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
          provider: codex
          codex-auth: ${{ secrets.CODEX_AUTH_JSON }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## What Codex reviews, exactly

- **The full diff** — base…head, not just the latest push — with read-only access to your checkout for context (`codex exec --sandbox read-only`).
- **Your house rules:** the reviewer discovers `AGENTS.md`, `REVIEW.md`, `.coderabbit.yaml`, `greptile.json`, and Cursor rules, and reviews against them.
- **Current docs:** when a PR touches an external API or SDK, Context7 checks the change against live documentation.
- **Verified output:** every blocking finding is re-checked in a dedicated session before posting — refuted findings are dropped, uncertain ones demoted to advisory.

## Cost & privacy

- **$0 beyond the seat.** Reviews consume your ChatGPT plan's Codex usage allowance — the same budget as your local Codex sessions — plus normal CI minutes. J-Bot adds no charge.
- **No new data recipient:** the diff goes to OpenAI under your own account — the vendor your editor sessions already talk to. No third-party reviewer service sees your code.
- **Credential hygiene:** `auth.json` is a password-equivalent. Keep it in GitHub Actions **secrets** (never variables), and check your plan's terms for CI/automation use. On `pull_request` events GitHub strips secrets from fork PRs.
- **Doc-only PRs** are skipped without a model call, and prompt caching is on by default.

## FAQ

### Can I use my ChatGPT Plus or Pro subscription for automated code review?

Yes. Codex authenticates with the credential your local `codex login` creates from a ChatGPT Plus/Pro account, and J-Bot Review drives that CLI inside your own GitHub Actions — so the seat you already pay for reviews every pull request. No API key and no per-token bill; J-Bot itself adds no charge.

### Where does the CODEX_AUTH_JSON secret come from?

Run `codex login` on your machine, then copy the entire contents of `~/.codex/auth.json` into a repository secret named `CODEX_AUTH_JSON`. The secret is the whole file, not a key inside it. Treat it like a password: store it only as a GitHub Actions secret, never as a variable.

### Can Codex modify my code from CI?

No. The backend runs read-only (`codex exec --sandbox read-only`), the workflow's only write scopes are PR comments and reactions (`contents` stays read-only), and on `pull_request` events GitHub strips secrets from fork PRs so outside contributors cannot use your seat.

### What does Codex code review cost per PR?

Nothing beyond the ChatGPT Plus/Pro subscription you already pay for, plus normal CI minutes. J-Bot Review is MIT-licensed and adds no per-seat or per-review charge. Reviews consume your plan's Codex usage allowance, so heavy PR volume shares the same budget as your local Codex sessions.

## Related

- **Guide** — [Review PRs with a CLI subscription](https://www.pgupai.com/guides/cli-subscription-code-review): Cursor, Devin, Cline, Kilo, Command Code, Grok Build, Qoder — the full per-CLI setup table.
- **Guide** — [Claude code review in GitHub Actions](https://www.pgupai.com/guides/claude-code-review-github-actions): Your Anthropic key, your runner — setup in three steps.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/codex-code-review-github-actions](https://www.pgupai.com/guides/codex-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
