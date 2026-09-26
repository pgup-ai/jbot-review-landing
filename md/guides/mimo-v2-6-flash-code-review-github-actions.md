# MiMo V2.6 Flash code review in GitHub Actions

Published September 26, 2026 · routes and prices checked September 26, 2026 · applies to pgup-ai/jbot-review-action v0

**Xiaomi’s MiMo V2.6 Flash, released 2026-09-22, is free for code review on OpenCode Zen and in Cline’s free tier.** It’s an open-weight mixture-of-experts model with 309B total and 15B active parameters. It’s also the slowest free model we’ve run in J-Bot Review. On the free OpenCode route, reviews took about 24 minutes where Space Bunny took under a minute, and 2 of 4 test reviews ran out of time. J-Bot’s telemetry shows why: it makes far more tool calls than the change needs, many of them repeats, and each turn takes about 40 seconds. Use it for small pull requests, or pick a metered route for large ones.

> **Free route · 200K context · 32K output**
>
> OpenCode’s free `mimo-v2.6-flash-free` caps the context at 200,000 tokens and output at 32,000. The metered routes below offer 1,048,576 and 131,072 for $0.14 per million input tokens and $0.28 per million output.

## OpenCode setup in three steps

1. **Create an OpenCode API key.** Save it as the repository secret `OPENCODE_API_KEY` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`. The workflow raises `time-budget-minutes` from its default of 30 to 45. With 30, the main review gets 24.5 minutes, and MiMo ran out of that on 2 of our 4 test pull requests.
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
          model: opencode/mimo-v2.6-flash-free
          time-budget-minutes: 45
          opencode-api-key: ${{ secrets.OPENCODE_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Seven routes, seven exact model ids

The first segment of each id selects the provider. Prices are per million input and output tokens from each live catalog on 2026-09-26.

**OpenCode Zen** (Catalog · $0 / $0 · 200K)

`model: opencode/mimo-v2.6-flash-free`
`opencode-api-key`

**Cline** (Free tier · daily cap)

`model: cline/cline-free/mimo-v2.6-flash`
`cline-auth`

**OpenCode Go** (Catalog · $0.14 / $0.28)

`model: opencode-go/mimo-v2.6-flash`
`opencode-api-key`

**OpenRouter** (Catalog · $0.14 / $0.28)

`model: openrouter/xiaomi/mimo-v2.6-flash`
`openrouter-api-key`

**Kilo** (Catalog · $0.14 / $0.28)

`model: kilo/xiaomi/mimo-v2.6-flash`
`kilo-auth`

**Command Code** (CLI seat)

`model: commandcode/xiaomi/mimo-v2.6-flash`
`commandcode-access-key`

**Xiaomi Token Plan** (Subscription · Singapore)

`model: xiaomi-token-plan-sgp/mimo-v2.6-flash`
`mimo-api-key`

Xiaomi Token Plan keys are tied to a region. J-Bot’s `xiaomi-token-plan-sgp` provider takes a Singapore key. On Command Code, MiMo V2.6 Flash has no adjustable reasoning effort, so J-Bot omits the effort flag.

## Why it was slow

On a 12-file change, the free OpenCode route’s main review ran for about 1,410 seconds and returned a partial result, so the run failed. J-Bot’s session telemetry shows where the time went:

- **Too many tool calls.** It made 59 calls, and they touched only 13 distinct files.
- **Duplicate calls.** 21 of the 59 re-read a file it had already read, and 4 repeated an earlier call exactly.
- **Slow turns.** The review took 34 turns, about 41 seconds each. Most of that is the model reasoning before its next call, so every extra call costs about 40 seconds.

The same pattern showed up on four smaller pull requests. The reviews took 163 turns between them, about 41 each, and two of the four hit J-Bot’s 24.5-minute limit for the main review and posted nothing. J-Bot’s context pack, which hands the model code before its first turn, cut the turns to 129 but not the time. Its first turn grew from 86 to 394 seconds as the reasoning moved to the start.

Lowering the reasoning effort won’t fix it. Xiaomi’s API documentation says every reasoning level other than none enables the same thinking, so `low` doesn’t select a smaller budget. On the free route, the levers are a longer `time-budget-minutes` and smaller pull requests.

## When to use it

- **Small pull requests on a $0 budget.** Fewer changed files mean fewer calls, and with 40-second turns that decides whether a review finishes. The free route’s 200K window points the same way.
- **A second opinion from a different lab.** A model pool can mix MiMo with a faster free model, and each rerun of the workflow moves to the next entry.
- **Open weights, when that matters to you.** The weights are public, so you can run the model on your own servers and point J-Bot at it through the [OpenAI-compatible provider](https://www.pgupai.com/guides/openai-compatible-code-review-github-actions).

For a free model that finishes in minutes, see [Space Bunny](https://www.pgupai.com/guides/space-bunny-code-review-github-actions).

## Where the diff goes

- **The free routes are the gateways’ services.** Open weights don’t make a hosted route private. OpenCode and Cline apply their own data policies, and Cline says free-model usage may be used to improve models.
- **Your runner stays in control.** On the OpenCode route the review session runs read-only on your GitHub Actions runner, and J-Bot sends the diff only to the provider you configure.
- **On Cline, every tool is approved.** Cline works in the checkout in plan mode with its shell and write tools auto-approved, and a checkout’s `.cline/hooks` and `.clinerules` load. J-Bot documents this as an accepted risk on CI runners, so use the Cline route on repositories where you trust the people opening pull requests.
- **Fork pull requests can’t read the key.** GitHub doesn’t pass repository secrets to `pull_request` workflows from forks.

## FAQ

### Is MiMo V2.6 Flash free for code review?

Yes, on two routes as of 2026-09-26. OpenCode Zen lists `mimo-v2.6-flash-free` at $0 with a 200,000-token context, and Cline offers `cline-free/mimo-v2.6-flash` in its free tier with a daily cap. OpenCode Go, OpenRouter and Kilo charge $0.14 per million input tokens and $0.28 per million output, with a 1,048,576-token context.

### Why is MiMo V2.6 Flash slow at code review?

It makes too many tool calls, repeats them, and takes a long time on each turn. On a 12-file change its main review made 59 tool calls on 13 distinct files, 21 of them re-reads of files it had already read, across 34 turns of about 41 seconds each. Lowering the effort setting doesn’t help, because Xiaomi says every reasoning level other than none enables the same thinking.

### Which MiMo V2.6 Flash route should I use for large pull requests?

A metered one. OpenCode Go, OpenRouter and Kilo list the full 1,048,576-token context and 131,072 output tokens for $0.14 and $0.28 per million. The free OpenCode route stops at 200,000 tokens of context and 32,000 of output.

### Is MiMo V2.6 Flash open source?

Its weights are open. OpenRouter describes it as an open-source mixture-of-experts model from Xiaomi with 309B total parameters and 15B active per token. You can serve it yourself and connect J-Bot through the OpenAI-compatible provider.

## Related

- **Guide** — [Which free model to use](https://www.pgupai.com/guides/free-ai-models-code-review): MiMo against the other free models, with quotas.
- **Guide** — [Space Bunny code review](https://www.pgupai.com/guides/space-bunny-code-review-github-actions): The fastest free model we’ve run.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/mimo-v2-6-flash-code-review-github-actions](https://www.pgupai.com/guides/mimo-v2-6-flash-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
