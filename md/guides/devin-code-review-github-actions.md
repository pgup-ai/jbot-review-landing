# Devin code review in GitHub Actions

Updated July 4, 2026 · applies to pgup-ai/jbot-review-action v0

**A Devin seat can moonlight as your PR reviewer.** J-Bot Review, an MIT-licensed GitHub Action, drives the Devin CLI backend inside your own CI. The setup has exactly one trap — the secret is a key _value_ copied out of a file, not the file itself — and this guide walks straight through it. J-Bot adds **nothing to your Devin bill**.

> **One of seven seats**
>
> Devin is one of eight subscriptions this works with — **Codex (ChatGPT Plus/Pro), Cursor, Cline, Kilo, Command Code, Grok Build, and Qoder** follow the same one-secret pattern. Full table in the [CLI subscription guide](https://www.pgupai.com/guides/cli-subscription-code-review).

## Setup in three steps

1. **Copy the key value.** Run `devin auth login` locally, then open `~/.local/share/devin/credentials.toml` and copy the `windsurf_api_key` value (it looks like `devin-session-token$…`) into the repository secret `DEVIN_WINDSURF_API_KEY` (_Settings → Secrets and variables → Actions_). **The key value only — not the whole file**, unlike the Codex, Cline, Kilo, and Grok Build backends.
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`.
3. **Open a pull request.** Devin reviews the full base…head diff on your runner and posts review comments with a verdict; blocking findings are adversarially verified first, nits demoted.

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
          provider: devin
          devin-windsurf-api-key: ${{ secrets.DEVIN_WINDSURF_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## What Devin posts back

- Diff-anchored review comments over the whole base…head range, plus a verdict at the end.
- Every blocking finding has to survive a second-session check before it appears. The rest get demoted or dropped rather than dumped on the PR.
- Repo rules shape the review: `AGENTS.md`, `REVIEW.md`, `.coderabbit.yaml`, `greptile.json`, Cursor rules.
- External API or SDK changes get a Context7 pass against current docs.

## Cost & privacy

- Reviews draw on the Devin plan you already pay for, plus CI minutes. A nice pattern: run a cheaper default reviewer and use a one-off `/jbot --provider=devin` comment as the stronger sign-off pass.
- The diff reaches Devin's backend on your account and no one else's servers.
- The `windsurf_api_key` is a password-equivalent, so Actions secrets only. Fork PRs never receive it, and your plan's terms on CI use are worth a look.
- Doc-only PRs don't spend a model call.

## FAQ

### Can I use my Devin subscription for automated code review?

Yes. J-Bot Review drives the Devin CLI backend inside your own GitHub Actions, authenticated with the `windsurf_api_key` from your Devin account — so the seat you already pay for reviews every pull request. Models are managed by your Devin account, and J-Bot itself adds no charge.

### Where does the DEVIN_WINDSURF_API_KEY secret come from?

Run `devin auth login` on your machine, then open `~/.local/share/devin/credentials.toml` and copy the `windsurf_api_key` value — it looks like `devin-session-token$…` — into a repository secret named `DEVIN_WINDSURF_API_KEY`. Unlike the Codex, Cline, Kilo, and Grok Build backends, the secret is the key value, not the whole credentials file.

### What does Devin code review cost per PR?

Nothing beyond the Devin plan you already pay for, plus normal CI minutes. J-Bot Review is MIT-licensed and adds no per-seat or per-review charge. Reviews consume your plan's usage the same way your other Devin sessions do.

## Related

- **Guide** — [Review PRs with a CLI subscription](https://www.pgupai.com/guides/cli-subscription-code-review): Codex, Cursor, Cline, Kilo, Command Code, Grok Build, Qoder — the full per-CLI setup table.
- **Guide** — [Codex code review in GitHub Actions](https://www.pgupai.com/guides/codex-code-review-github-actions): Your ChatGPT Plus/Pro seat, step by step.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/devin-code-review-github-actions](https://www.pgupai.com/guides/devin-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
