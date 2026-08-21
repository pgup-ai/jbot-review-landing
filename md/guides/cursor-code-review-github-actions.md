# Cursor code review in GitHub Actions

Updated July 4, 2026 · applies to pgup-ai/jbot-review-action v0

**Your Cursor subscription can double as a PR reviewer.** J-Bot Review is an MIT-licensed GitHub Action that runs the Cursor CLI inside your own CI. Setup is one API key from the Cursor dashboard and one workflow file; after that, every pull request gets verified, diff-anchored findings. Cursor stays in **read-only plan mode** the whole time, and J-Bot adds **nothing to the bill**.

> **Other seats work too**
>
> Cursor isn't special-cased here. **Codex (ChatGPT Plus/Pro), Devin, Cline, Kilo, Command Code, Grok Build, and Qoder** wire up the same way, and the [CLI subscription guide](https://www.pgupai.com/guides/cli-subscription-code-review) has the full table of providers, secrets, and where each credential lives.

## Setup in three steps

1. **Add the secret.** Create an API key in the Cursor dashboard under _Integrations_ (keys look like `crsr_…`) and save it as the repository secret `CURSOR_API_KEY` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`.
3. **Open a pull request.** The Cursor CLI reviews the full base…head diff on your runner and posts review comments with a verdict; blocking findings are adversarially verified first, nits demoted.

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
          provider: cursor
          cursor-api-key: ${{ secrets.CURSOR_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## What the review covers

- **Your Cursor rules come along.** The reviewer picks up the same rules files your editor already uses, plus `AGENTS.md`, `REVIEW.md`, `.coderabbit.yaml`, and `greptile.json`.
- **The whole diff,** base…head, with read-only checkout access for context (`cursor-agent --mode plan`).
- PRs that touch an external API or SDK get a Context7 check against current docs.
- Blocking findings are re-litigated in a second session before anything posts. What can't be defended gets dropped or demoted to advisory.

## Cost & privacy

- Reviews bill to the Cursor plan you already have. J-Bot charges nothing; CI minutes are the only extra.
- The diff goes to Cursor's backend and nowhere else — the same vendor your editor talks to all day. There's no reviewer service in the middle.
- `CURSOR_API_KEY` belongs in Actions secrets, not variables. GitHub strips secrets from fork PRs, so outside contributors can't spend your seat. Worth a skim of your plan's terms on CI use, too.
- Doc-only PRs skip the model call entirely.

## FAQ

### Can I use my Cursor subscription for automated code review?

Yes. J-Bot Review drives the Cursor CLI (`cursor-agent`) inside your own GitHub Actions, authenticated with an API key from your Cursor account — so the seat you already pay for reviews every pull request. Models are managed by your Cursor account, and J-Bot itself adds no charge.

### Where does the CURSOR_API_KEY secret come from?

Create an API key in the Cursor dashboard under _Integrations_ — keys look like `crsr_…` — and save it as a repository secret named `CURSOR_API_KEY` (_Settings → Secrets and variables → Actions_). Store it only as a secret, never as a variable.

### Can Cursor modify my code from CI?

No. The backend runs in read-only plan mode (`cursor-agent --mode plan`), the workflow's only write scopes are PR comments and reactions (`contents` stays read-only), and on `pull_request` events GitHub strips secrets from fork PRs so outside contributors cannot use your seat.

## Related

- **Guide** — [Review PRs with a CLI subscription](https://www.pgupai.com/guides/cli-subscription-code-review): Codex, Devin, Cline, Kilo, Command Code, Grok Build, Qoder — the full per-CLI setup table.
- **Guide** — [Codex code review in GitHub Actions](https://www.pgupai.com/guides/codex-code-review-github-actions): Your ChatGPT Plus/Pro seat, step by step.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/cursor-code-review-github-actions](https://www.pgupai.com/guides/cursor-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
