# DeepSeek V4.1 Flash code review in GitHub Actions

Published September 26, 2026 · routes and prices checked September 26, 2026 · applies to pgup-ai/jbot-review-action v0

**DeepSeek V4.1 Flash, released 2026-09-10, is free for code review through Cline’s free tier and costs $0.14 per million input tokens on OpenRouter.** It’s a thorough reviewer and a slow one. In our tests it made about 200 tool calls and took 17 to 20 minutes per review on OpenCode Go, and about six minutes per review through Command Code. The route you pick changes review time more than any setting does.

> **New model · new architecture · separate from V4 Flash**
>
> OpenRouter describes V4.1 Flash as a sparse mixture-of-experts model and the first built on DeepSeek’s Causal Encoder-Decoder architecture. Its model ids differ from V4 Flash’s. For the older model, see the [DeepSeek V4 Flash guide](https://www.pgupai.com/guides/deepseek-v4-flash-code-review-github-actions).

## Free Cline setup in three steps

1. **Save your Cline login.** Run `cline auth`, then save the whole `~/.cline/data/settings/providers.json` file as the repository secret `CLINE_AUTH_JSON`. The [Cline guide](https://www.pgupai.com/guides/cline-code-review-github-actions) covers the details.
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`. The `cline-free/` segment selects Cline’s free tier.
3. **Open a pull request.** J-Bot reads the base…head diff and posts diff-anchored findings with a verdict. A second session checks blocking findings before they post.

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
          model: cline/cline-free/deepseek-v4.1-flash
          cline-auth: ${{ secrets.CLINE_AUTH_JSON }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

Cline caps each free model per day and doesn’t publish the size. On another free model, we hit the cap after 363 requests. For steady daily use, a metered route is cheap:

`.github/workflows/jbot-review.yml · OpenCode Go route`

```yaml
      - uses: pgup-ai/jbot-review-action@v0
        with:
          model: opencode-go/deepseek-v4.1-flash
          opencode-api-key: ${{ secrets.OPENCODE_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Nine routes, nine exact model ids

The first segment of each id selects the provider. Prices are per million input and output tokens from each live catalog on 2026-09-26.

**Cline free** (Free tier · daily cap)

`model: cline/cline-free/deepseek-v4.1-flash`
`cline-auth`

**OpenRouter** (Catalog · $0.14 / $0.42)

`model: openrouter/deepseek/deepseek-v4.1-flash`
`openrouter-api-key`

**OpenCode Go** (Go plan · $0.15 / $0.60)

`model: opencode-go/deepseek-v4.1-flash`
`opencode-api-key`

**Fireworks** (Catalog · $0.22 / $0.66)

`model: fireworks-ai/accounts/fireworks/models/deepseek-v4p1-flash`
`fireworks-api-key`

**OpenCode Zen** (Catalog · $0.30 / $1.20)

`model: opencode/deepseek-v4.1-flash`
`opencode-api-key`

**Kilo** (Catalog · $0.30 / $1.20)

`model: kilo/deepseek/deepseek-v4.1-flash`
`kilo-auth`

**Command Code** (CLI seat · low, high, max)

`model: commandcode/deepseek/deepseek-v4.1-flash`
`commandcode-access-key`

**Cline credits** (Metered through Cline)

`model: cline/deepseek/deepseek-v4.1-flash`
`cline-auth`

**ClinePass** (Subscription)

`model: cline-pass/deepseek-v4.1-flash`
`cline-auth`

Command Code accepts `low`, `high` and `max` effort for this model, with no `medium`, and J-Bot maps its effort setting onto those tiers.

## How it performed

- **It explores everything.** On OpenCode Go, one review averaged about 200 tool calls, about 160 turns and about 16 million cached input tokens, and took 17 to 20 minutes. J-Bot’s context pack, which cut Space Bunny’s turns by 45%, cut DeepSeek’s by 8%.
- **The route sets the pace.** Through Command Code, the same model reviewed a change to J-Bot’s own repository in 339 to 380 seconds, with 12 to 22 tool calls per session.
- **On Cline’s free tier it ran out of time verifying.** With Cline reading the checkout, a 12-file review took 706 seconds. Most of its tool calls were shell commands, and verification hit its 300-second budget, so its three findings were held back.
- **Low effort still reasons a lot.** OpenCode passes the effort setting through and DeepSeek honors it, but at low effort it still produced about 44,000 reasoning tokens on a 25 KB diff.

If review time matters, use Command Code or cap the time budget. If you’re on the free Cline tier, expect a few tool-using reviews a day before the cap. For a free model that finishes in minutes, see [Space Bunny](https://www.pgupai.com/guides/space-bunny-code-review-github-actions).

## Where the diff goes

- **The free route runs under Cline’s terms.** Cline’s documentation says free-model usage may be used to improve model performance and quality. Keep private code on a metered route whose data policy you’ve read.
- **Open weights, hosted routes.** The weights are public, so you can serve the model yourself and connect J-Bot through the [OpenAI-compatible provider](https://www.pgupai.com/guides/openai-compatible-code-review-github-actions).
- **On Cline, every tool is approved.** Cline works in the checkout in plan mode with its shell and write tools auto-approved, and a checkout’s `.cline/hooks` and `.clinerules` load. Its tools include web search, so the model can send search queries of its own. J-Bot documents this as an accepted risk on CI runners, so use the Cline route on repositories where you trust the people opening pull requests.
- **The diff goes only where you point it.** The review runs on your GitHub Actions runner, and J-Bot sends the diff only to the provider you configure.
- **Fork pull requests can’t read the key.** GitHub doesn’t pass repository secrets to `pull_request` workflows from forks.

## FAQ

### Is DeepSeek V4.1 Flash free for code review?

Through Cline’s free tier, yes, as of 2026-09-26: `cline/cline-free/deepseek-v4.1-flash`, with a daily cap Cline doesn’t publish. Every other route is metered. OpenRouter charges $0.14 per million input tokens and $0.42 per million output, and OpenCode Go charges $0.15 and $0.60.

### How is DeepSeek V4.1 Flash different from V4 Flash?

It’s a new model, released 2026-09-10. OpenRouter describes it as the first DeepSeek model built on the Causal Encoder-Decoder architecture. The model ids differ too: V4.1 uses `deepseek-v4.1-flash`, while V4 Flash uses `deepseek-v4-flash`.

### Why is DeepSeek V4.1 Flash slow at code review?

It explores widely. On OpenCode Go a review averaged about 200 tool calls and 17 to 20 minutes, and even at low reasoning effort it produced about 44,000 reasoning tokens on a 25 KB diff. Through Command Code the same model took about six minutes per review.

### Which DeepSeek V4.1 Flash route is cheapest?

Cline’s free tier costs nothing within its daily cap. Among metered routes, OpenRouter lists $0.14 per million input tokens and $0.42 per million output, OpenCode Go $0.15 and $0.60, Fireworks $0.22 and $0.66, and OpenCode Zen and Kilo $0.30 and $1.20.

## Related

- **Guide** — [Which free model to use](https://www.pgupai.com/guides/free-ai-models-code-review): DeepSeek V4.1 Flash against the other free models, with quotas.
- **Guide** — [DeepSeek V4 Flash code review](https://www.pgupai.com/guides/deepseek-v4-flash-code-review-github-actions): Routes and benchmarks for the previous model.
- **Guide** — [Cline code review](https://www.pgupai.com/guides/cline-code-review-github-actions): Save a Cline login for CI and pick a billing mode.

---

_Markdown representation of [https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-github-actions](https://www.pgupai.com/guides/deepseek-v4-1-flash-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
