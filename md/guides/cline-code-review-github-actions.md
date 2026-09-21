# Cline code review in GitHub Actions

Updated July 4, 2026 · applies to pgup-ai/jbot-review-action v0

J-Bot Review runs Cline in your GitHub Actions runner to review pull requests. Use `cline-pass` for a Cline subscription or `cline` for pay-as-you-go credits. Setup takes a credential file and a workflow. J-Bot is MIT-licensed and adds no fee; your Cline usage and CI minutes are billed as usual.

> **Using another CLI?**
>
> For Codex, Cursor, Devin, Kilo, Command Code, Grok Build, or Qoder, see the [CLI subscription guide](https://www.pgupai.com/guides/cli-subscription-code-review).

## Setup in three steps

1. **Copy the credential.** Run `cline auth` locally, then save the entire contents of `~/.cline/data/settings/providers.json` as the repository secret `CLINE_AUTH_JSON` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml` — pick `cline-pass` (subscription) or `cline` (pay-as-you-go).
3. **Open a pull request.** Cline reviews the full diff on your runner without editing files. J-Bot checks the findings before posting review comments and a verdict.

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
          provider: cline-pass          # subscription; use `cline` for pay-as-you-go
          cline-auth: ${{ secrets.CLINE_AUTH_JSON }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## What lands on the PR

- The review covers the full diff between the merge base and PR head. Comments point to the relevant changed lines. Cline runs with `--plan --auto-approve false` to keep the review read-only.
- Verification is on by default. J-Bot checks each finding and drops those the verifier refutes. If the verifier is unsure, the finding stays in the run diagnostics and isn't posted as a PR comment.
- J-Bot reads review guidelines from your repo: `AGENTS.md`, `REVIEW.md`, `.coderabbit.yaml`, `greptile.json`, Cursor rules.
- Context7 pulls current docs whenever the PR touches an external API or SDK.

## Cost & privacy

- Cline charges your subscription (`cline-pass`) or credit balance (`cline`). GitHub Actions usage is billed separately.
- To choose a model, set `model` to `cline-pass/glm-5.2` or `cline/deepseek/deepseek-v4-flash`. Leave it unset to use the default for your billing mode.
- J-Bot reads the auth token from `providers.json`. Store the file in an Actions secret. GitHub doesn't pass that secret to fork PRs in this workflow. Check your plan's terms for CI use.
- J-Bot skips model calls for PRs that only change documentation.

## FAQ

### Can I use my Cline subscription for automated code review?

Yes. Set `provider: cline-pass` to bill reviews through your Cline subscription. For pay-as-you-go credits, use `provider: cline`. Both run in your GitHub Actions runner and use the same credential file.

### Where does the CLINE_AUTH_JSON secret come from?

Run `cline auth` on your machine, then copy the entire contents of `~/.cline/data/settings/providers.json` into an Actions repository secret named `CLINE_AUTH_JSON`. Treat this file like a password.

### What is the difference between provider: cline and cline-pass?

`cline` uses pay-as-you-go credits; `cline-pass` uses your subscription. Model names also differ: use `cline/<type>/<model>` (for example `cline/deepseek/deepseek-v4-flash`) or `cline-pass/<model>` (for example `cline-pass/glm-5.2`), or omit `model` to use each mode's default.

## Related

- **Guide** — [Review PRs with a CLI subscription](https://www.pgupai.com/guides/cli-subscription-code-review): Codex, Cursor, Devin, Kilo, Command Code, Grok Build, Qoder — the full per-CLI setup table.
- **Guide** — [Codex code review in GitHub Actions](https://www.pgupai.com/guides/codex-code-review-github-actions): Set up reviews with your ChatGPT Plus/Pro subscription.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Inputs, provider IDs, and configuration options.

---

_Markdown representation of [https://www.pgupai.com/guides/cline-code-review-github-actions](https://www.pgupai.com/guides/cline-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
