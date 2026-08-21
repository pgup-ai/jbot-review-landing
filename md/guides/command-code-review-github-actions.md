# Command Code review in GitHub Actions

Updated July 4, 2026 · applies to pgup-ai/jbot-review-action v0

**Command Code might be the fastest of the CLI seats to wire up:** the `user_…` access key you already have goes into one repo secret, one workflow file gets committed, and that's the install. From there, J-Bot Review — an MIT-licensed GitHub Action — has Command Code reviewing every PR on your runner, at **no cost beyond your existing plan**.

> **Six sibling setups**
>
> **Codex (ChatGPT Plus/Pro), Cursor, Devin, Cline, Kilo, Grok Build, and Qoder** plug in the same way: one provider value, one secret. The [CLI subscription guide](https://www.pgupai.com/guides/cli-subscription-code-review) compares all eight side by side.

## Setup in three steps

1. **Copy the access key.** Your key looks like `user_…` — after a local login it also lives as the `apiKey` value inside `~/.commandcode/auth.json`. Save the key value as the repository secret `COMMANDCODE_ACCESS_KEY` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`.
3. **Open a pull request.** Command Code reviews the full base…head diff on your runner and posts review comments with a verdict; blocking findings are adversarially verified first, nits demoted.

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
          provider: commandcode
          commandcode-access-key: ${{ secrets.COMMANDCODE_ACCESS_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## What shows up on the PR

- Verified, diff-anchored findings across the full base…head diff, closed out with a verdict.
- No wall of unvetted nits: blocking findings are re-checked in a second session before they post, and the marginal ones arrive as advisory.
- Your repo's rules files apply — `AGENTS.md`, `REVIEW.md`, `.coderabbit.yaml`, `greptile.json`, Cursor rules.
- Changes to external APIs and SDKs are verified against live docs via Context7.

## Cost & privacy

- Reviews run on the Command Code plan you already pay for, plus CI minutes. Nothing else.
- Your diff goes to Command Code's backend on your account; there's no reviewer service in between.
- The secret is the key value, not the whole `auth.json` — and it's a password-equivalent, so Actions secrets only. GitHub locks fork PRs out of secrets automatically.
- Doc-only PRs skip the model call.

## FAQ

### Can I use my Command Code subscription for automated code review?

Yes. J-Bot Review drives the Command Code CLI backend inside your own GitHub Actions, authenticated with your access key — so the seat you already pay for reviews every pull request. Models are managed by your Command Code account, and J-Bot itself adds no charge.

### Where does the COMMANDCODE_ACCESS_KEY secret come from?

Your Command Code access key looks like `user_…` — after a local login it also lives as the `apiKey` value inside `~/.commandcode/auth.json`. Copy the key value (not the whole file) into a repository secret named `COMMANDCODE_ACCESS_KEY`. Keep it in Actions secrets — repo variables aren't encrypted.

### What does Command Code review cost per PR?

Nothing beyond the Command Code plan you already pay for, plus normal CI minutes. J-Bot Review is MIT-licensed and adds no per-seat or per-review charge. Reviews consume your plan's usage the same way your local Command Code sessions do.

## Related

- **Guide** — [Review PRs with a CLI subscription](https://www.pgupai.com/guides/cli-subscription-code-review): Codex, Cursor, Devin, Cline, Kilo, Grok Build, Qoder — the full per-CLI setup table.
- **Guide** — [Codex code review in GitHub Actions](https://www.pgupai.com/guides/codex-code-review-github-actions): Your ChatGPT Plus/Pro seat, step by step.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/command-code-review-github-actions](https://www.pgupai.com/guides/command-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
