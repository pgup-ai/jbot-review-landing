# Kilo code review in GitHub Actions

Updated July 4, 2026 · applies to pgup-ai/jbot-review-action v0

**Kilo is the cheapest way to trial agentic PR review end to end.** J-Bot Review is an MIT-licensed GitHub Action, and its Kilo backend **defaults to a free gateway model** (`kilo/kilo-auto/free`). So after one `kilo auth login`, one repo secret, and one workflow file, the only cost left is CI minutes.

> **Trial cheap, upgrade in place**
>
> Start on the free default, and when you want a stronger reviewer, switch the backend with one repo variable — the same workflow file drives **Codex (ChatGPT Plus/Pro), Cursor, Devin, Cline, Command Code, Grok Build, and Qoder** seats: [CLI subscription code review →](https://www.pgupai.com/guides/cli-subscription-code-review)

## Setup in three steps

1. **Copy the credential.** Run `kilo auth login` locally, then save the whole contents of `~/.local/share/kilo/auth.json` as the repository secret `KILO_AUTH_CONTENT` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`.
3. **Open a pull request.** Kilo reviews the full base…head diff on your runner and posts review comments with a verdict; blocking findings are adversarially verified first, nits demoted.

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
          provider: kilo                # defaults to kilo/kilo-auto/free
          kilo-auth: ${{ secrets.KILO_AUTH_CONTENT }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## What you get for $0

- The same review the paid backends run: full base…head diff, read-only checkout access for context.
- The verification pass still happens — blocking findings get re-checked before posting, nits get demoted. Free model doesn't mean unfiltered output.
- Repo rules files are honored: `AGENTS.md`, `REVIEW.md`, `.coderabbit.yaml`, `greptile.json`, Cursor rules.
- Context7 doc checks fire when a PR touches an external API or SDK.

## Cost & privacy

- On the free default model, a review run costs nothing beyond CI minutes. Pin something stronger from your Kilo account whenever the free tier stops being enough.
- Diffs go to the Kilo gateway on your account, and that's it — no reviewer service sits in between.
- The `auth.json` secret is the whole credential file. Actions secrets only, and GitHub keeps secrets away from fork PRs.
- Doc-only PRs skip the model call.

## FAQ

### Can I run agentic PR review completely free with Kilo?

Close to it. J-Bot Review is an MIT-licensed action that adds no charge, and the Kilo backend defaults to the free `kilo/kilo-auto/free` gateway model — so the only cost is normal CI minutes (free on public repos, plan-included on private ones). That makes Kilo the cheapest way to trial the whole pipeline before pointing it at a stronger model or seat.

### Where does the KILO_AUTH_CONTENT secret come from?

Run `kilo auth login` on your machine, then copy the whole contents of `~/.local/share/kilo/auth.json` into a repository secret named `KILO_AUTH_CONTENT`. The secret is the entire file, not a key inside it, and it's a credential like any other: Actions secrets only, never variables.

### Which models does Kilo use for reviews?

By default the free `kilo/kilo-auto/free` gateway model. You can pin a different model your Kilo account can access with the `model` input, or switch the whole backend later with one repo variable — the workflow file stays the same.

## Related

- **Guide** — [Review PRs with a CLI subscription](https://www.pgupai.com/guides/cli-subscription-code-review): Codex, Cursor, Devin, Cline, Command Code, Grok Build, Qoder — the full per-CLI setup table.
- **Guide** — [Codex code review in GitHub Actions](https://www.pgupai.com/guides/codex-code-review-github-actions): Your ChatGPT Plus/Pro seat, step by step.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/kilo-code-review-github-actions](https://www.pgupai.com/guides/kilo-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
