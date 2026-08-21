# Poolside Laguna S 2.1 code review in GitHub Actions

Updated July 22, 2026 · applies to pgup-ai/jbot-review-action v0

**Laguna S 2.1 can review pull requests through Poolside's first-party API, free during its limited-time preview.** J-Bot Review now has a direct `poolside` backend—no CLI or generic compatibility adapter required. The same model also has free OpenCode and OpenRouter routes.

> **Verified end to end**
>
> The direct Poolside path completed a real code review on July 22: key authentication, Laguna S 2.1 inference, finding verification, and the final review all ran through the full Action workflow.

## Direct Poolside setup in three steps

1. **Create a Poolside API key.** Start from [Poolside's Laguna page](https://www.poolside.ai/models), then save the key as the repository secret `POOLSIDE_API_KEY` (_Settings → Secrets and variables → Actions_).
2. **Commit the workflow.** Add the file below as `.github/workflows/jbot-review.yml`. Laguna S 2.1 is already the backend default; the explicit model pin keeps the configuration readable.
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
          provider: poolside
          model: poolside/laguna-s-2.1
          poolside-api-key: ${{ secrets.POOLSIDE_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Three free routes, three model ids

Laguna S 2.1 is free through all three routes today. Pick based on where you already manage keys; free windows, quotas, and context limits remain provider-controlled.

**Poolside**Direct · verified

`provider: poolside`
`model: poolside/laguna-s-2.1`
`poolside-api-key`

**OpenCode**

`provider: opencode`
`model: laguna-s-2.1-free`
`opencode-api-key`

**OpenRouter**

`provider: openrouter`
`model: poolside/laguna-s-2.1:free`
`openrouter-api-key`

## Why Laguna S 2.1 fits review work

- **It is built for long-horizon coding.** Poolside describes S 2.1 as a 118B-parameter mixture-of-experts model with 8B active parameters and up to a 1M-token context window.
- **It emphasizes persistence and verification.** The [launch report](https://www.poolside.ai/blog/introducing-laguna-s-2-1) focuses on longer sessions, tool use, backtracking, and finishing work instead of declaring victory early—the same behaviors a useful reviewer needs.
- **The model is open-weight.** Poolside released the weights on launch day; the hosted routes above are the convenient CI path, while self-hosting remains possible outside this guide.
- **J-Bot adds $0.** The Action is MIT-licensed, with no reviewer service and no per-seat fee. During the free preview, your remaining cost is normal GitHub Actions minutes.

## Where the diff goes

- **Your runner stays in control.** The review session runs headless on your GitHub Actions runner with read-only repository access.
- **Direct means direct.** With `provider: poolside`, the diff goes to Poolside's API on your own key. There is no J-Bot server or generic OpenCode gateway in that path.
- **Fork PRs cannot read the key.** GitHub does not pass repository secrets to `pull_request` workflows from forks.
- **Blocking findings are verified.** A second model session challenges each blocking finding before J-Bot posts it; nits are demoted.

## FAQ

### Is direct Poolside Laguna S 2.1 free for PR review?

Yes. As of 2026-07-22, Poolside's direct Laguna S 2.1 API is free in preview for a limited time. OpenCode and OpenRouter also expose free Laguna S 2.1 routes. Free availability and provider quotas can change; J-Bot adds no charge of its own.

### What provider, model, and secret does direct Poolside use?

Set `provider: poolside`, `model: poolside/laguna-s-2.1`, and `poolside-api-key: ${{ secrets.POOLSIDE_API_KEY }}`. Laguna S 2.1 is the Poolside backend's default model, but pinning the model makes the workflow explicit.

### Should I use Poolside, OpenCode, or OpenRouter for the free model?

Use direct Poolside for the first-party route with `provider: poolside`. Use OpenCode with model `laguna-s-2.1-free` if you already have an OpenCode key, or OpenRouter with model `poolside/laguna-s-2.1:free` if you already route models there. All three are currently free, but quotas and availability belong to each provider.

### Has the direct Poolside route been tested end to end?

Yes. The direct Poolside path was run end to end on a real code review on 2026-07-22: the Action authenticated with a Poolside key, reviewed the diff with Laguna S 2.1, and completed the review workflow.

## Related

- **Guide** — [Any OpenAI-compatible API](https://www.pgupai.com/guides/openai-compatible-code-review-github-actions): Connect a gateway, self-hosted server, or provider without a first-class backend.
- **Guide** — [Kilo code review in GitHub Actions](https://www.pgupai.com/guides/kilo-code-review-github-actions): Another $0 route for trialing the full review pipeline.
- **Docs** — [Action reference](https://github.com/pgup-ai/jbot-review-action#readme): Every input, provider id, and tuning knob.

---

_Markdown representation of [https://www.pgupai.com/guides/poolside-code-review-github-actions](https://www.pgupai.com/guides/poolside-code-review-github-actions). Site map: [https://www.pgupai.com/sitemap.xml](https://www.pgupai.com/sitemap.xml) · Fact sheet for agents: [https://www.pgupai.com/llms.txt](https://www.pgupai.com/llms.txt)._
