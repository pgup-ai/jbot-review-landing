# DeepSeek V4 Flash code review in GitHub Actions

Published July 31, 2026 · updated August 1, 2026 · applies to pgup-ai/jbot-review-action v0

**The official DeepSeek V4 Flash 0731 can review pull requests through multiple $0 provider routes—or directly through DeepSeek at roughly 11× lower uncached input and 27× lower output list prices than Gemini 3.6 Flash.** The exact free route matters: provider catalogs do not all identify the same snapshot, and their capacity and data terms differ.

Official replaces Preview · same API id

On July 31, DeepSeek replaced V4-Flash-Preview with **DeepSeek-V4-Flash-0731** behind the unchanged `deepseek-v4-flash` id. The API is in public beta. DeepSeek says the architecture and size are unchanged; the improvement comes from new post-training focused on agent work. The V4 Pro API and DeepSeek's app/web models were not part of this update.

## Free OpenCode setup in three steps

1. **Create an OpenCode API key.** Sign in to [OpenCode Zen](https://opencode.ai/zen), then save the key as the repository secret `OPENCODE_API_KEY` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`. OpenCode's `deepseek-v4-flash-free` alias is updated to the official model; the explicit pin makes that choice visible.
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
          provider: opencode
          model: deepseek-v4-flash-free
          opencode-api-key: ${{ secrets.OPENCODE_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Six advertised $0 routes

OpenCode · official 0731

### Native J-Bot route · $0

`provider: opencode`
`model: deepseek-v4-flash-free`

Cline · live free catalog

### CLI route · limited quota

`provider: cline`
`model: cline/deepseek/deepseek-v4-flash`

OpenRouter · free listing

### Native J-Bot route · intermittent

`provider: openrouter`
`model: deepseek/deepseek-v4-flash:free`

InferX · official 0731

### OpenAI-compatible · free through Aug 12

`provider: openai-compatible`
`model: openai-compatible/deepseek-v4-flash-0731`
`openai-compatible-base-url: https://model.inferx.net/endpoints/v1`

Kenari · free alias

### OpenAI-compatible · snapshot not labeled

`provider: openai-compatible`
`model: openai-compatible/deepseek-v4-flash:free`
`openai-compatible-base-url: https://kenari.id/v1`

UnoRouter · free alias

### OpenAI-compatible · snapshot not labeled

`provider: openai-compatible`
`model: openai-compatible/deepseek-v4-flash:free`
`openai-compatible-base-url: https://api.unorouter.com/v1`

DeepSeek · direct API

### Use the first-party endpoint

`provider: deepseek`
`model: deepseek-v4-flash`

OpenCode, OpenRouter, and DeepSeek are native J-Bot providers; Cline uses its CLI with `CLINE_AUTH_JSON`. For InferX, Kenari, or UnoRouter, save the provider key as the GitHub Actions secret `JBOT_OPENAI_COMPATIBLE_API_KEY`, set the base URL as the repository variable `JBOT_OPENAI_COMPATIBLE_BASE_URL`, and use the explicit model above. Sources checked August 1: [OpenCode Zen](https://opencode.ai/docs/zen), [Cline's live free-model feed](https://api.cline.bot/api/v1/ai/cline/recommended-models), [Cline free-model terms](https://docs.cline.bot/getting-started/free-models), [OpenRouter's free listing](https://openrouter.ai/deepseek/deepseek-v4-flash:free/pricing), [InferX's provider announcement](https://www.reddit.com/r/DeepSeek/comments/1vavyfj/hey_guys_deepseek_v4_flash_is_free_on_inferx/), [Kenari's live catalog](https://kenari.id/v1/models), and [UnoRouter's live ranking](https://unorouter.com/en/rankings).

**OpenRouter availability:** its public `deepseek-v4-flash:free` page says “Free,” but the live catalog omitted the slug and the [endpoint API](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-flash:free/endpoints) reported no serving backends when checked August 1. Treat the route as opportunistic, not reliable capacity.

## The official 0731 agent benchmarks

DeepSeek published nine agent and coding-agent results with the official release. These are DeepSeek's reported scores, not J-Bot evaluations:

82.7Terminal-Bench 2.1

54.2NL2Repo

76.7Cybergym

54.4DeepSWE

70.3Toolathlon verified

25.2Agent Last Exam

25.1Automation Bench (Public)

68.7DSBench-FullStack

59.6DSBench-Hard

DeepSeek identifies DSBench-FullStack and DSBench-Hard as internal test sets. For the public code-agent benchmarks, it used the not-yet-released DeepSeek Harness in minimal mode, max effort, `temperature=1.0`, and `top_p=0.95`. [Read the release notes →](https://api-docs.deepseek.com/updates/)

## Same agent-performance band, very different price

The overlapping vendor tables put official V4 Flash in Gemini 3.6 Flash's agentic coding range. DeepSeek's reported scores are slightly higher on the two named overlaps—but this is **directional, not a controlled head-to-head**.

Published measureDeepSeek V4 FlashGemini 3.6 Flash

Terminal-Bench 2.182.778.0

DeepSWE54.449.0 (v1.1)

Input / 1M tokens$0.14 (cache miss)$1.50 (no cache)

Output / 1M tokens$0.28$7.50

> **≈11× cheaper**uncached input list price
>
> **≈27× cheaper**output list price

Why the qualification matters: DeepSeek used its own forthcoming harness at max effort; Google's Terminal-Bench result uses the Terminus-2 harness, and Google labels its software-engineering result DeepSWE v1.1. Prices are directly comparable public API list rates checked July 31, 2026. DeepSeek says a future peak window will charge 2× its regular rates, with the effective date still to be announced. Sources: [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing/) and [Google's Gemini 3.6 Flash model card](https://deepmind.google/models/gemini/flash/).

## Normal reviews versus the published benchmark setup

J-Bot's native-provider default is medium reasoning effort. DeepSeek ran the released code-agent benchmarks at max effort. To ask J-Bot for the closest available effort setting, add this input:

```
model-options: '{"reasoningEffort":"max"}'
```

This still does not reproduce DeepSeek's benchmark: its harness has not been released, and J-Bot uses its own review prompts, read-only tools, finding schema, and verification pass. Use max when depth matters more than latency; keep the default medium for everyday PR throughput.

## Where the diff goes

- **Your runner stays in control.** The review runs inside GitHub Actions with read-only repository access; write permissions are used only to post review output.
- **The provider you select receives the diff.** That is DeepSeek, OpenCode and its upstream, Cline and its upstream, OpenRouter and its upstream, or the OpenAI-compatible base URL you configure.
- **Free routes may be feedback routes.** OpenCode and Cline state that data from their free models may be used to improve models. Do not send sensitive code unless the selected provider's terms fit your policy.
- **Custom-gateway terms differ.** Free pricing does not imply zero retention, stable capacity, or a permanent offer. Review each provider's current terms before sending private code.
- **Fork PRs cannot read the key.** GitHub does not pass repository secrets to `pull_request` workflows from forks.

## FAQ

### Is this the official DeepSeek V4 Flash or the Preview model?

It is the official DeepSeek-V4-Flash-0731 model, released as an API public beta on 2026-07-31. DeepSeek replaced V4-Flash-Preview behind the existing `deepseek-v4-flash` id, so the calling method did not change. DeepSeek says the architecture and size are unchanged; the model was re-post-trained for stronger agent capabilities.

### Which J-Bot route gets the official DeepSeek V4 Flash?

OpenCode's `deepseek-v4-flash-free` route and InferX's `deepseek-v4-flash-0731` endpoint explicitly identify the official release. DeepSeek's direct API serves it through the unchanged `deepseek-v4-flash` id. The Cline, OpenRouter, Kenari, and UnoRouter free listings do not identify the 0731 checkpoint, so verify those routes before depending on official-release behavior.

### Is DeepSeek V4 Flash on par with Gemini 3.6 Flash, and how much cheaper is it?

The vendors' published agent results place them in the same performance band: DeepSeek reports 82.7 on Terminal-Bench 2.1 and 54.4 on DeepSWE; Google reports 78.0 and 49.0 for Gemini 3.6 Flash. This is directional rather than a controlled head-to-head because the harnesses differ. At direct API list rates checked 2026-07-31, DeepSeek costs $0.14 per million uncached input tokens and $0.28 per million output tokens, versus Gemini's $1.50 and $7.50—about 11 times and 27 times cheaper respectively.

### Where is DeepSeek V4 Flash free for J-Bot Review?

As of 2026-08-01, OpenCode, Cline, InferX, Kenari, and UnoRouter publish zero-priced DeepSeek V4 Flash routes. OpenRouter also advertises `deepseek/deepseek-v4-flash:free`, but its live catalog currently omits the slug and reports no serving endpoints, so treat it as intermittent. Only OpenCode and InferX explicitly identify the official 0731 snapshot. J-Bot supports native `opencode`, `cline`, and `openrouter` providers; InferX, Kenari, and UnoRouter use `provider: openai-compatible`. Free windows, quotas, availability, and data terms remain provider-controlled.

## Related

- **Guide** — [Ling 3.0 Flash code review](https://www.pgupai.com/guides/ling-3-0-flash-code-review-github-actions): Four free provider routes, with exact ids and credential names.
- **Guide** — [Poolside Laguna S 2.1 code review](https://www.pgupai.com/guides/poolside-code-review-github-actions): A direct, verified API route plus the free gateway options.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/deepseek-v4-flash-code-review-github-actions](https://www.pgupai.com/guides/deepseek-v4-flash-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
