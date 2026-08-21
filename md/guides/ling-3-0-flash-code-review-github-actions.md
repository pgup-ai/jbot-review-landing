# Ling 3.0 Flash code review in GitHub Actions

Published July 23, 2026 · applies to pgup-ai/jbot-review-action v0

**inclusionAI's Ling 3.0 Flash can review pull requests for free through OpenCode, Kilo, OpenRouter, or Command Code.** OpenCode is listed in the live model catalog; the other three routes were manually verified with J-Bot Review.

> **Four free routes · exact ids**
>
> OpenCode now lists Ling 3.0 Flash alongside the verified Kilo, OpenRouter, and Command Code routes. The identifiers differ slightly, so copy the one that matches your backend.

## OpenRouter setup in three steps

1. **Create an OpenRouter API key.** Save it as the repository secret `OPENROUTER_API_KEY` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`. The `:free` suffix pins the zero-cost Ling route instead of leaving model selection implicit.
3. **Open a pull request.** J-Bot reads the base…head diff and posts diff-anchored findings with a verdict. Blocking findings are checked by a second session before they post.

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
  issues: write
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
          provider: openrouter
          model: inclusionai/ling-3.0-flash:free
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Four free routes, four exact model ids

Pick the route where you already manage credentials. Free windows, quotas, and context limits still belong to each provider.

**OpenCode**Catalog verified

`provider: opencode`
`model: ling-3.0-flash-free`
`opencode-api-key`

**Kilo**Verified

`provider: kilo`
`model: kilo/inclusionai/ling-3.0-flash:free`
`kilo-auth`

**OpenRouter**Verified

`provider: openrouter`
`model: inclusionai/ling-3.0-flash:free`
`openrouter-api-key`

**Command Code**Verified

`provider: commandcode`
`model: inclusionai/ling-3.0-flash-free`
`commandcode-access-key`

## Why Ling 3.0 Flash fits review work

- **It spends compute selectively.** [Kilo's launch note](https://blog.kilo.ai/p/announcing-ling-30-flash-free-on) describes a 124B-parameter mixture-of-experts model that activates about 5.1B parameters per token, aiming for useful agentic work without frontier-model latency.
- **It has room for repository context.** The [hosted OpenRouter route](https://openrouter.ai/inclusionai/ling-3.0-flash%3Afree) exposes a 262,144-token context window, enough for the full diff plus surrounding files on many pull requests.
- **It supports agent workflows.** The launch description emphasizes coding, tool use, multi-turn execution, and token efficiency rather than chat-only benchmarks.
- **J-Bot adds $0.** The Action is MIT-licensed, with no reviewer service and no per-seat fee. During the free launch window, your remaining cost is normal GitHub Actions minutes.

## Where the diff goes

- **Your runner stays in control.** The review session runs headless on your GitHub Actions runner with read-only repository access.
- **The route determines the destination.** Each provider uses its corresponding account or authenticated CLI backend. J-Bot does not proxy the diff through a hosted reviewer service.
- **Fork PRs cannot read the key.** GitHub does not pass repository secrets to `pull_request` workflows from forks.
- **Blocking findings are verified.** A second model session challenges each blocking finding before J-Bot posts it; nits are demoted.

## FAQ

### Is Ling 3.0 Flash free for pull-request review?

Yes. As of 2026-07-23, Ling 3.0 Flash is free through OpenCode, Kilo, OpenRouter, and Command Code. The OpenCode route was checked against its live model catalog; the other three were manually verified with J-Bot Review. Free windows, quotas, and model availability remain provider-controlled, and J-Bot adds no charge of its own.

### What model id does Ling 3.0 Flash use on each provider?

OpenCode uses `ling-3.0-flash-free`. Kilo uses `kilo/inclusionai/ling-3.0-flash:free`. OpenRouter uses `inclusionai/ling-3.0-flash:free`. Command Code uses `inclusionai/ling-3.0-flash-free`. The OpenCode spelling was checked against its live model catalog; the Kilo, OpenRouter, and Command Code spellings were manually verified in J-Bot Review.

### Should I use OpenCode, Kilo, OpenRouter, or Command Code for Ling 3.0 Flash?

Use OpenCode if you already have an OpenCode key, Kilo if you already carry Kilo auth into CI, OpenRouter for a standard API-key setup, or Command Code if you already authenticate that CLI with a user access key. The model is currently free on all four, so the practical difference is where you already manage credentials.

### Have all four Ling 3.0 Flash routes been tested with J-Bot?

Kilo, OpenRouter, and Command Code were manually verified with J-Bot Review on 2026-07-23. OpenCode availability and its `ling-3.0-flash-free` model id were checked against the live OpenCode catalog; that route was not rerun end to end for this update.

## Related

- **Guide** — [Kilo code review in GitHub Actions](https://www.pgupai.com/guides/kilo-code-review-github-actions): Capture Kilo auth once, then pin Ling or another model available to your account.
- **Guide** — [Command Code review in GitHub Actions](https://www.pgupai.com/guides/command-code-review-github-actions): Reuse the access key from your Command Code account inside GitHub Actions.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/ling-3-0-flash-code-review-github-actions](https://www.pgupai.com/guides/ling-3-0-flash-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
