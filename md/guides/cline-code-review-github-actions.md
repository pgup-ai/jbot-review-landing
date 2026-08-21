# Cline code review in GitHub Actions

Updated July 4, 2026 · applies to pgup-ai/jbot-review-action v0

**Cline can review your pull requests on whichever billing mode you're already on.** Subscription? Use `cline-pass`. Pay-as-you-go credits? Plain `cline`. Either way, J-Bot Review (an MIT-licensed GitHub Action) runs the Cline CLI read-only inside your own CI: `cline auth` once, one secret, one workflow file, and J-Bot adds **nothing to the bill**.

> **Same trick, other seats**
>
> The pattern isn't Cline-specific. **Codex (ChatGPT Plus/Pro), Cursor, Devin, Kilo, Command Code, Grok Build, and Qoder** each take one secret and one provider value — the [CLI subscription guide](https://www.pgupai.com/guides/cli-subscription-code-review) has the whole table.

## Setup in three steps

1. **Copy the credential.** Run `cline auth` locally, then save the entire contents of `~/.cline/data/settings/providers.json` as the repository secret `CLINE_AUTH_JSON` (_Settings → Secrets and variables → Actions_). The secret is the whole file, not a key inside it.
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml` — pick `cline-pass` (subscription) or `cline` (pay-as-you-go).
3. **Open a pull request.** Cline reviews the full base…head diff read-only on your runner (`cline --plan`) and posts review comments with a verdict; blocking findings are adversarially verified first, nits demoted.

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

- Diff-anchored comments across the full base…head range, closed out with a verdict. Cline itself runs `--plan --auto-approve false`, so it can read the checkout but never write to it.
- Blocking findings go through a verification session first. The ones that don't survive get dropped; borderline ones post as advisory.
- House rules are read from the repo: `AGENTS.md`, `REVIEW.md`, `.coderabbit.yaml`, `greptile.json`, Cursor rules.
- Context7 pulls current docs whenever the PR touches an external API or SDK.

## Cost & privacy

- Billing stays inside your Cline plan (`cline-pass`) or credit balance (`cline`). CI minutes aside, J-Bot adds nothing.
- Model pinning follows Cline's id scheme: `cline-pass/glm-5.2`, `cline/deepseek/deepseek-v4-flash`, or leave `model` unset for each mode's default.
- The `providers.json` secret is only read for its auth token, but it's still a credential. Actions secrets only, and fork PRs never see it — GitHub strips secrets there. Check your plan's terms for CI use.
- PRs that only touch docs don't spend a model call.

## FAQ

### Can I use my Cline subscription for automated code review?

Yes. Set `provider: cline-pass` and J-Bot Review drives the Cline CLI inside your own GitHub Actions, billed through the Cline subscription you already pay for. Pay-as-you-go Cline credits work too — same secret, `provider: cline` instead. J-Bot itself adds no charge.

### Where does the CLINE_AUTH_JSON secret come from?

Run `cline auth` on your machine, then copy the entire contents of `~/.cline/data/settings/providers.json` into a repository secret named `CLINE_AUTH_JSON`. The secret is the whole file, not a key inside it, and both billing modes share it. Only the auth token is used, but it's a password-equivalent all the same — Actions secrets only.

### What is the difference between provider: cline and cline-pass?

Billing mode. `cline` is pay-as-you-go (Cline credits); `cline-pass` bills through your Cline subscription. They are separate providers sharing one credential. Pin models as `cline/<type>/<model>` (for example `cline/deepseek/deepseek-v4-flash`) or `cline-pass/<model>` (for example `cline-pass/glm-5.2`), or omit `model` to use each mode's default.

## Related

- **Guide** — [Review PRs with a CLI subscription](https://www.pgupai.com/guides/cli-subscription-code-review): Codex, Cursor, Devin, Kilo, Command Code, Grok Build, Qoder — the full per-CLI setup table.
- **Guide** — [Codex code review in GitHub Actions](https://www.pgupai.com/guides/codex-code-review-github-actions): Your ChatGPT Plus/Pro seat, step by step.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/cline-code-review-github-actions](https://www.pgupai.com/guides/cline-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
