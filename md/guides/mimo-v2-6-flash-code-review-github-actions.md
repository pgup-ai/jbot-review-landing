# MiMo V2.6 Flash code review in GitHub Actions

Published September 26, 2026 · retested September 27, 2026 after Xiaomi’s repetition fix · routes and prices checked September 26, 2026 · applies to pgup-ai/jbot-review-action v0

**Xiaomi’s MiMo V2.6 Flash, released 2026-09-22, is free for code review on OpenCode Zen and in Cline’s free tier.** It’s an open-weight mixture-of-experts model with 309B total and 15B active parameters. In our first runs it kept repeating tool calls, and Xiaomi has since shipped a fix. We retested on September 27. The loops are gone, but it’s still the slowest free model we’ve run in J-Bot Review. Two reviews took 23 and 27 minutes. At high effort, Space Bunny’s main review of the same change took under 3 minutes. The time now goes into reasoning, and no setting turns that down. Use MiMo for small pull requests, or pick a faster model.

> **Free route · 200K context · 32K output**
>
> OpenCode’s free `mimo-v2.6-flash-free` caps the context at 200,000 tokens and output at 32,000. The metered routes below offer 1,048,576 and 131,072 for $0.14 per million input tokens and $0.28 per million output.

## OpenCode setup in three steps

1. **Create an OpenCode API key.** Save it as the repository secret `OPENCODE_API_KEY` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`. The workflow raises `time-budget-minutes` from its default of 30 to 45. With 30, the main review gets 24.5 minutes. MiMo ran out of that on 2 of our first 4 test pull requests, and one of the two retests needed 26.6.
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

**OpenCode Go** (Go plan · $0.14 / $0.28)

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

## Xiaomi’s repetition fix, retested

In our first runs, on September 23 and 25, MiMo kept calling the same tools. On one 12-file change its main review made 59 tool calls that touched only 13 files. 21 of them re-read a file it had already read, and 4 repeated an earlier call exactly. The review ran for 1,410 seconds and returned a partial result, so the run failed.

Xiaomi’s [postmortem](https://mimo.xiaomi.com/blog/mimo-v2-6-tool-call-repetition) explains the cause. Training only penalized a turn once it passed 32 tool calls, so smaller loops went unpunished and grew as training scaled. Xiaomi trained a small teacher model on about 7,000 repetition examples and merged it into MiMo. The new weights reached Xiaomi’s API on September 25 at 06:00 UTC+8 under the same model names. We can’t tell when OpenCode’s free route switched over, so our September 25 run may have used either version.

On September 27 we ran one review each on two changes from a production TypeScript backend, on the free OpenCode route:

- **4 files, split into 2 pages.** The two main-review sessions made 4 and 33 tool calls. 0 and 2 were exact repeats. The whole review took 1,599 seconds.
- **7 files.** The main review made 50 tool calls, and 6 were exact repeats. It took 1,369 seconds of the review’s 1,372.

That’s a normal rate. DeepSeek V4.1 Flash repeated 7 of 66 calls on the same 7-file change, and none of MiMo’s sessions looped. The fix works.

## Why it’s still slow

Almost all the time goes to reasoning. Across the 7-file review MiMo wrote about 60,000 reasoning tokens. Space Bunny wrote about 8,000 on the same change, and DeepSeek V4.1 Flash about 75,000. The free route is also slow to serve them, at 25 to 35 tokens a second once you count each turn’s prompt processing. DeepSeek wrote more tokens than MiMo and still finished its main review in about half the time.

Tool calls cost almost nothing now. Grep and read return right away, and the gaps between turns added up to 2 or 3 seconds per session.

Turning the effort down doesn’t help. Models.dev lists no effort levels for MiMo, and Xiaomi’s API documentation says every level other than none turns on the same thinking. We checked with a hard math question sent through OpenCode, twice per setting:

- **No effort set.** 2,357 and 2,582 reasoning tokens.
- **Low.** 2,470. The second run returned nothing.
- **High.** 2,690 and 3,859.

Low reasons as much as the default. On the free route, the levers are a longer `time-budget-minutes` and smaller pull requests.

## What it caught

The findings were worth reading. On the 4-file change, MiMo matched 3 of the 7 issues on our answer key. It also caught a fourth, a P1 where a record could supersede itself, which our matcher missed because MiMo worded it differently. On the 7-file change it found 1 of 6: a storage check that crashes startup under the repository’s own documented local setup. It also flagged new helper functions with no callers, which the repository’s standards discourage.

## When to use it

- **Small pull requests on a $0 budget.** Fewer changed files mean fewer turns, and at 30 to 40 seconds a turn that decides whether a review finishes. The free route’s 200K window points the same way.
- **A second opinion from a different lab.** A model pool can mix MiMo with a faster free model, and each rerun of the workflow moves to the next entry.
- **Open weights, when that matters to you.** The weights are public, so you can run the model on your own servers and point J-Bot at it through the [OpenAI-compatible provider](https://www.pgupai.com/guides/openai-compatible-code-review-github-actions).

For a free model that finishes in minutes, see [Space Bunny](https://www.pgupai.com/guides/space-bunny-code-review-github-actions).

## Where the diff goes

- **The free routes are the gateways’ services.** Open weights don’t make a hosted route private. OpenCode and Cline apply their own data policies, and Cline says free-model usage may be used to improve models.
- **Your runner stays in control.** On the OpenCode route the review session runs read-only on your GitHub Actions runner, and J-Bot sends the diff only to the provider you configure.
- **On Cline, every tool is approved.** Cline works in the checkout in plan mode with its shell and write tools auto-approved, and a checkout’s `.cline/hooks` and `.clinerules` load. Its tools include web search, so the model can send search queries of its own. J-Bot documents this as an accepted risk on CI runners, so use the Cline route on repositories where you trust the people opening pull requests.
- **Fork pull requests can’t read the key.** GitHub doesn’t pass repository secrets to `pull_request` workflows from forks.

## FAQ

### Is MiMo V2.6 Flash free for code review?

Yes, on two routes as of 2026-09-26. OpenCode Zen lists `mimo-v2.6-flash-free` at $0 with a 200,000-token context, and Cline offers `cline-free/mimo-v2.6-flash` in its free tier with a daily cap. OpenCode Go, OpenRouter and Kilo charge $0.14 per million input tokens and $0.28 per million output, with a 1,048,576-token context.

### Why is MiMo V2.6 Flash slow at code review?

It reasons a lot, and the free route serves those tokens slowly. Across a review of a 7-file change it wrote about 60,000 reasoning tokens, served at 25 to 35 tokens a second, and the main review alone took 1,369 seconds. Lowering the effort setting doesn’t help, because low reasons as much as the default.

### Did Xiaomi fix MiMo V2.6’s repeated tool calls?

Yes, in our retest. Xiaomi shipped updated weights on September 25, 2026, under the same model names. On September 27, exact repeats were 0 to 12% of each session’s tool calls, close to DeepSeek V4.1 Flash, and no session looped. Reviews still took 23 and 27 minutes.

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
